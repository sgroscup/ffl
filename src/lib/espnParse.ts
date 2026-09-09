import type { PlayerStatus, Position, RosterEntry, WeeklyPlayerStat } from "../types";

// Parses the plain text you get when you select-all/copy an ESPN Fantasy
// Football "My Team" or "Free Agents" page and paste it in. ESPN's markup
// renders each player as a run of lines (name doubled, team, position,
// action label, opponent, game time, then exactly 10 trailing stat cells:
// proj/SCORE/OPRK/%ST/%ROST/+-/PRK/FPTS/avg/LAST). This walks that layout
// rather than trying to reconstruct the original table.

const TEAM_CODES = new Set([
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN", "DET",
  "GB", "HOU", "IND", "JAX", "KC", "LAC", "LAR", "LV", "MIA", "MIN", "NE",
  "NO", "NYG", "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS", "FA",
]);

const STATUS_TOKENS = new Set<PlayerStatus>([
  "Q", "D", "O", "IR", "SSPD", "PUP", "NFI", "DNR",
]);

const SLOT_TOKENS = new Set(["QB", "RB", "WR", "TE", "FLEX", "D/ST", "DST", "K", "Bench", "BE", "IR"]);

function normalizePosition(raw: string): Position | null {
  const first = raw.split(",")[0].trim().toUpperCase();
  if (first === "D/ST" || first === "DST" || first === "DEF") return "DST";
  if (first === "QB" || first === "RB" || first === "WR" || first === "TE" || first === "K") {
    return first;
  }
  return null;
}

function normalizeSlot(raw: string): string {
  if (raw === "Bench" || raw === "BE") return "BE";
  if (raw === "D/ST") return "DST";
  return raw;
}

function parseStat(token: string): number | null {
  if (token === "--" || token === "") return null;
  const n = Number(token);
  return Number.isNaN(n) ? null : n;
}

// Detects ESPN's "Name NameName Name" doubled-text anchor (the alt text and
// visible text land back to back with no separator when the page is copied
// as plain text).
function isDoubledName(line: string): string | null {
  if (line.length < 6 || line.length % 2 !== 0) return null;
  const half = line.length / 2;
  const first = line.slice(0, half);
  if (first !== line.slice(half)) return null;
  if (!/[a-zA-Z]/.test(first)) return null;
  return first;
}

interface ParsedBlock {
  name: string;
  status: PlayerStatus;
  team: string;
  position: Position;
  stats: (number | null)[]; // [proj, score, oprk, pst, rostPct, trend, posRank, fpts, avg, last]
  slotHint: string | null;
}

function parseBlocks(text: string): ParsedBlock[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  const anchors: { index: number; name: string }[] = [];
  // Roster pages interleave section-total rows ("TOTALS" + 5 numbers) and an
  // empty-IR-slot row ("Empty" + dashes) between player blocks. Neither is a
  // player, and both would otherwise get swept up as fake trailing stats for
  // whichever player sits right before them, so they're treated as hard
  // window boundaries alongside the next player anchor.
  const boundaries = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    const name = isDoubledName(lines[i]);
    if (name) {
      anchors.push({ index: i, name });
      boundaries.add(i);
    } else if (lines[i] === "TOTALS" || lines[i] === "Empty") {
      boundaries.add(i);
    }
  }
  const sortedBoundaries = [...boundaries].sort((x, y) => x - y);
  function nextBoundaryAfter(i: number): number {
    for (const b of sortedBoundaries) if (b > i) return b;
    return lines.length;
  }

  const blocks: ParsedBlock[] = [];

  for (let a = 0; a < anchors.length; a++) {
    const { index, name } = anchors[a];
    const nextIndex = nextBoundaryAfter(index);

    let slotHint: string | null = null;
    for (let b = index - 1; b >= 0; b--) {
      if (lines[b] === "") continue;
      if (SLOT_TOKENS.has(lines[b])) slotHint = lines[b];
      break;
    }

    let cursor = index + 1;
    if (lines[cursor] === name) cursor++;
    while (cursor < nextIndex && lines[cursor] === "") cursor++;

    let status: PlayerStatus = "ACTIVE";
    if (cursor < nextIndex && STATUS_TOKENS.has(lines[cursor] as PlayerStatus)) {
      status = lines[cursor] as PlayerStatus;
      cursor++;
      while (cursor < nextIndex && lines[cursor] === "") cursor++;
    }

    let team = "";
    if (cursor < nextIndex && TEAM_CODES.has(lines[cursor])) {
      team = lines[cursor];
      cursor++;
      while (cursor < nextIndex && lines[cursor] === "") cursor++;
    }

    if (cursor >= nextIndex) continue;
    const position = normalizePosition(lines[cursor]);
    cursor++;
    if (!position) continue;

    // Everything between here and the next boundary is action label /
    // opponent / game time (variable length, sometimes blank/dashed for
    // bye-week or teamless players) followed by exactly 10 stat cells.
    // Taking the last 10 non-blank tokens sidesteps that variability
    // entirely. On roster pages the *next* player's slot label (e.g. "RB")
    // can sit right up against this player's last stat with no boundary
    // between them, so slot tokens are stripped out too.
    const remaining = lines
      .slice(cursor, nextIndex)
      .filter((l) => l !== "" && !SLOT_TOKENS.has(l));
    const statTokens = remaining.slice(-10);
    while (statTokens.length < 10) statTokens.unshift("--");
    const stats = statTokens.map(parseStat);

    blocks.push({ name, status, team, position, stats, slotHint });
  }

  return blocks;
}

function blockToStat(b: ParsedBlock): WeeklyPlayerStat {
  const [proj, , , , rostPct, trend, posRank] = b.stats;
  return {
    name: b.name,
    position: b.position,
    nflTeam: b.team,
    status: b.status,
    proj,
    rostPct,
    trend,
    posRank: posRank === null ? null : Math.round(posRank),
  };
}

/** Parses a pasted ESPN Free Agents page (any position filter, one or more
 * pages concatenated) into a flat list of available players. */
export function parseFreeAgentsText(text: string): WeeklyPlayerStat[] {
  return parseBlocks(text).map(blockToStat);
}

/** Parses a pasted ESPN "My Team" roster page into starters/bench/IR
 * entries. Only rows that follow a recognizable slot label are kept. */
export function parseRosterText(text: string): RosterEntry[] {
  return parseBlocks(text)
    .filter((b): b is ParsedBlock & { slotHint: string } => b.slotHint !== null)
    .map((b) => ({ ...blockToStat(b), slot: normalizeSlot(b.slotHint) }));
}
