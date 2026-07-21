"""Scrape ADP (average draft position) data from fantasyfootballcalculator.com.

Fixes over the original notebook snippet this was based on:
  - Explicit HTML parser passed to BeautifulSoup (silences the ambiguous-
    parser warning and makes parsing deterministic across environments).
  - A real User-Agent header and raise_for_status(), since the site 403s
    default python-requests requests.
  - The data table is picked by "most rows" instead of `tables[0]`, since
    the page can render other small tables (e.g. ad/nav markup) before it.
  - Column names are read from the table's own header row instead of a
    hardcoded list, which is what caused the original script to blow up:
    the site's table has 11 columns (Overall, Team, Bye, Position, Name,
    Avg, Std Dev, High, Low, Times Drafted, Graph) but only 10 names were
    assigned, so `df.columns = [...]` raised a length-mismatch ValueError.
  - Cell text is pulled with `get_text(strip=True)` instead of `.string`,
    which returns None for any cell containing more than one child node
    (e.g. the player name cell, which wraps the name in an <a> tag).
  - Numeric columns are cleaned with a shared helper (strips "%" and
    whitespace, coerces non-numeric junk to NaN) and applied to every
    numeric column instead of just `adp`/`std_dev`, and using
    `pd.to_numeric(errors="coerce")` instead of `.astype()` so a stray
    "-" (common for bye weeks / unranked players) doesn't crash the run.

Usage:
    python scripts/scrape_adp.py --year 2020 --format ppr --teams 12
    python scripts/scrape_adp.py --year 2026 -o adp.csv
"""

from __future__ import annotations

import argparse
import re
import sys

import pandas as pd
import requests
from bs4 import BeautifulSoup

USER_AGENT = (
    "Mozilla/5.0 (compatible; ffl-adp-scraper/1.0; "
    "+https://github.com/sgroscup/ffl)"
)

TEXT_COLUMNS = {"name", "position", "pos", "team"}

# Maps our canonical output column -> candidate source column names, in
# priority order, since the site's exact header text has changed over time.
COLUMN_ALIASES = {
    "rank": ["overall", "rank", "ovr"],
    "name": ["name", "player"],
    "position": ["position", "pos"],
    "team": ["team"],
    "bye": ["bye"],
    "adp": ["adp", "avg"],
    "std_dev": ["std_dev", "stddev", "std"],
    "high": ["high"],
    "low": ["low"],
    "times_drafted": ["times_drafted", "drafted", "draft"],
}


def slugify_header(text: str, index: int) -> str:
    """Turn a raw <th> string into a stable column name, e.g. 'Std Dev' ->
    'std_dev'. Falls back to a positional name for blank headers (the
    site's sparkline "graph" column has no header text)."""
    slug = re.sub(r"[^a-z0-9]+", "_", text.strip().lower()).strip("_")
    return slug or f"col_{index}"


def clean_numeric(series: pd.Series) -> pd.Series:
    cleaned = series.astype(str).str.replace("%", "", regex=False).str.strip()
    return pd.to_numeric(cleaned, errors="coerce")


def fetch_adp_table(fmt: str, teams: int, year: int) -> pd.DataFrame:
    url = f"https://fantasyfootballcalculator.com/adp/{fmt}/{teams}-team/all/{year}"
    response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    tables = soup.find_all("table")
    if not tables:
        raise ValueError(f"No tables found on {url}")

    # The ADP data table is the largest one on the page; pick by row count
    # rather than assuming it's the first table.
    adp_table = max(tables, key=lambda t: len(t.find_all("tr")))

    rows = adp_table.find_all("tr")
    if len(rows) < 2:
        raise ValueError("ADP table has no data rows")

    header_cells = rows[0].find_all(["th", "td"])
    columns = [
        slugify_header(cell.get_text(strip=True), i)
        for i, cell in enumerate(header_cells)
    ]

    data = [
        [cell.get_text(strip=True) for cell in row.find_all("td")]
        for row in rows[1:]
    ]
    # Drop any rows that don't line up with the header (stray separator rows).
    data = [row for row in data if len(row) == len(columns)]

    df = pd.DataFrame(data, columns=columns)

    for col in df.columns:
        if col not in TEXT_COLUMNS:
            df[col] = clean_numeric(df[col])

    return df


def to_app_csv(df: pd.DataFrame) -> pd.DataFrame:
    """Reshape the raw scrape into the name,position,team,bye,rank format
    expected by src/lib/csv.ts's `parsePlayersCsv`."""

    def resolve(canonical: str) -> str | None:
        for candidate in COLUMN_ALIASES[canonical]:
            if candidate in df.columns:
                return candidate
        return None

    name_col = resolve("name")
    position_col = resolve("position")
    team_col = resolve("team")
    rank_col = resolve("rank") or resolve("adp")
    bye_col = resolve("bye")

    if not name_col or not position_col or not team_col or not rank_col:
        raise ValueError(
            f"Could not map scraped columns to name/position/team/rank; "
            f"got columns: {list(df.columns)}"
        )

    out = pd.DataFrame(
        {
            "name": df[name_col],
            "position": df[position_col],
            "team": df[team_col],
            "bye": df[bye_col] if bye_col else pd.NA,
            "rank": df[rank_col],
        }
    )
    out = out.dropna(subset=["name", "rank"])
    out["rank"] = out["rank"].rank(method="first").astype(int)
    return out.sort_values("rank").reset_index(drop=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--year", type=int, default=2026)
    parser.add_argument("--format", default="ppr", choices=["standard", "ppr", "half-ppr"])
    parser.add_argument("--teams", type=int, default=12)
    parser.add_argument("-o", "--output", default=None, help="CSV path to write")
    args = parser.parse_args()

    raw = fetch_adp_table(args.format, args.teams, args.year)
    players = to_app_csv(raw)

    if args.output:
        players.to_csv(args.output, index=False)
        print(f"Wrote {len(players)} players to {args.output}")
    else:
        print(players.to_csv(index=False))

    return 0


if __name__ == "__main__":
    sys.exit(main())
