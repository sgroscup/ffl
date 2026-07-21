# FFL Draft Assistant

A browser-based tool for following a live snake draft pick-by-pick and
getting recommendations for your next pick. Runs entirely client-side —
no backend, no accounts. Draft state persists to `localStorage`.

## Features

- Snake draft order and pick tracking for any number of teams
- Searchable/filterable player pool with a bundled 300-player PPR
  ranking set (2026 ESPN cheat sheet); import your own CSV
  (`name,position,team,bye,rank`) to override it before a draft
- Pick recommendations based on best-player-available, your roster's
  starter/FLEX needs, and positional value cliffs
- Full draft board grid, your roster panel, undo last pick, reset draft

## Development

```bash
npm install
npm run dev      # start dev server
npm run build    # typecheck + production build
npm run lint      # oxlint
```

## ADP scraper

`scripts/scrape_adp.py` pulls average-draft-position data from
[fantasyfootballcalculator.com](https://fantasyfootballcalculator.com) and
writes it out in the `name,position,team,bye,rank` CSV format the app's
"import your own rankings" feature expects.

```bash
pip install -r scripts/requirements.txt
python scripts/scrape_adp.py --year 2026 --format ppr --teams 12 -o adp.csv
```
