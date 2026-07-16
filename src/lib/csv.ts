import type { Player, Position } from "../types";

const VALID_POSITIONS = new Set<Position>(["QB", "RB", "WR", "TE", "DST", "K"]);

function slugify(name: string, team: string): string {
  return `${name}-${team}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface ParseResult {
  players: Player[];
  errors: string[];
}

// Expects a header row containing name,position,team,bye,rank (any order,
// case-insensitive). bye is optional.
export function parsePlayersCsv(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { players: [], errors: ["No data found."] };
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const posIdx = header.indexOf("position");
  const teamIdx = header.indexOf("team");
  const byeIdx = header.indexOf("bye");
  const rankIdx = header.indexOf("rank");

  if (nameIdx === -1 || posIdx === -1 || teamIdx === -1 || rankIdx === -1) {
    return {
      players: [],
      errors: [
        "Header row must include name, position, team, and rank columns.",
      ],
    };
  }

  const players: Player[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const name = cols[nameIdx];
    const position = cols[posIdx]?.toUpperCase() as Position;
    const team = cols[teamIdx]?.toUpperCase();
    const rank = Number(cols[rankIdx]);
    const bye = byeIdx !== -1 && cols[byeIdx] ? Number(cols[byeIdx]) : null;

    if (!name || !team || !VALID_POSITIONS.has(position) || Number.isNaN(rank)) {
      errors.push(`Row ${i + 1}: could not parse "${lines[i]}"`);
      continue;
    }

    players.push({
      id: slugify(name, team),
      name,
      position,
      team,
      bye: bye && !Number.isNaN(bye) ? bye : null,
      rank,
    });
  }

  players.sort((a, b) => a.rank - b.rank);
  return { players, errors };
}
