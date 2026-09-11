import type { DraftedPick, Player, Position } from "../types";

// ESPN uses a few team abbreviations that differ from the ones already in
// our player pool; normalize so recap picks match existing players instead
// of getting added as duplicates.
const TEAM_ALIASES: Record<string, string> = {
  WSH: "WAS",
  JAC: "JAX",
};

function normalizeTeam(team: string): string {
  const t = team.toUpperCase();
  return TEAM_ALIASES[t] ?? t;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.']/g, "")
    .replace(/\s+(jr|sr|ii|iii|iv|v)\.?$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(name: string, team: string): string {
  return `${name}-${team}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Matches lines like "Jahmyr Gibbs DET, RB" or "Texans D/ST HOU, D/ST".
const PLAYER_LINE = /^(.+?)\s+([A-Z]{2,3}),\s*(QB|RB|WR|TE|K|D\/ST)$/;
const HEADER_LINE = /^(NO\.?|Player|Team)$/i;
const ROUND_LINE = /^Round\s+(\d+)$/i;

export interface DraftRecapResult {
  teamNames: string[];
  numTeams: number;
  picks: DraftedPick[];
  players: Player[];
  newPlayerCount: number;
  errors: string[];
}

// Parses ESPN's "Draft Recap" -> "By Round" text view (copy/paste the whole
// page). Each round lists NO./Player/Team columns; player lines are
// "<name> <team>, <pos>" followed by the fantasy team that made the pick.
export function parseDraftRecap(
  text: string,
  existingPlayers: Player[],
): DraftRecapResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const byNormName = new Map<string, Player>();
  for (const p of existingPlayers) {
    byNormName.set(normalizeName(p.name), p);
  }

  interface RawPick {
    round: number;
    pickInRound: number;
    playerName: string;
    playerTeam: string;
    playerPos: string;
    fantasyTeam: string;
  }
  const raw: RawPick[] = [];
  const errors: string[] = [];

  let round = 0;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const roundMatch = ROUND_LINE.exec(line);
    if (roundMatch) {
      round = Number(roundMatch[1]);
      i++;
      while (i < lines.length && HEADER_LINE.test(lines[i])) i++;
      continue;
    }
    if (round > 0 && /^\d+$/.test(line)) {
      const pickInRound = Number(line);
      const playerLine = lines[i + 1];
      const teamLine = lines[i + 2];
      if (!playerLine || !teamLine) {
        errors.push(`Round ${round} pick ${pickInRound}: incomplete entry`);
        i++;
        continue;
      }
      const m = PLAYER_LINE.exec(playerLine);
      if (!m) {
        errors.push(`Could not parse player line: "${playerLine}"`);
        i += 3;
        continue;
      }
      raw.push({
        round,
        pickInRound,
        playerName: m[1].trim(),
        playerTeam: m[2],
        playerPos: m[3],
        fantasyTeam: teamLine,
      });
      i += 3;
      continue;
    }
    i++;
  }

  if (raw.length === 0) {
    return {
      teamNames: [],
      numTeams: 0,
      picks: [],
      players: existingPlayers,
      newPlayerCount: 0,
      errors: ["No picks found — check the pasted text."],
    };
  }

  // Draft slot order comes from round 1 (first team to pick = slot 0, etc).
  const round1 = raw
    .filter((r) => r.round === 1)
    .sort((a, b) => a.pickInRound - b.pickInRound);
  const orderedSource = round1.length > 0 ? round1 : raw;
  const teamOrder: string[] = [];
  const teamIndexByName = new Map<string, number>();
  for (const r of orderedSource) {
    if (!teamIndexByName.has(r.fantasyTeam)) {
      teamIndexByName.set(r.fantasyTeam, teamOrder.length);
      teamOrder.push(r.fantasyTeam);
    }
  }
  const numTeams = teamOrder.length;

  const players = [...existingPlayers];
  let newPlayerCount = 0;
  const picks: DraftedPick[] = [];

  for (const r of raw) {
    const teamIdx = teamIndexByName.get(r.fantasyTeam);
    if (teamIdx === undefined) {
      errors.push(`Unknown fantasy team "${r.fantasyTeam}" for ${r.playerName}`);
      continue;
    }
    const team = normalizeTeam(r.playerTeam);
    const position = (r.playerPos === "D/ST" ? "DST" : r.playerPos) as Position;
    const key = normalizeName(r.playerName);
    let player = byNormName.get(key);
    if (!player) {
      player = {
        id: slugify(r.playerName, team),
        name: r.playerName,
        position,
        team,
        bye: null,
        rank: 9000 + (r.round - 1) * numTeams + r.pickInRound,
      };
      players.push(player);
      byNormName.set(key, player);
      newPlayerCount++;
    }
    picks.push({
      overallPick: (r.round - 1) * numTeams + r.pickInRound,
      round: r.round,
      pickInRound: r.pickInRound,
      teamIndex: teamIdx,
      playerId: player.id,
    });
  }

  picks.sort((a, b) => a.overallPick - b.overallPick);

  return { teamNames: teamOrder, numTeams, picks, players, newPlayerCount, errors };
}
