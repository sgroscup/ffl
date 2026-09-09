export type Position = "QB" | "RB" | "WR" | "TE" | "DST" | "K";

export interface Player {
  id: string;
  name: string;
  position: Position;
  team: string;
  bye: number | null;
  rank: number;
}

export interface RosterSettings {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  FLEX: number;
  DST: number;
  K: number;
  BENCH: number;
}

export const DEFAULT_ROSTER: RosterSettings = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLEX: 1,
  DST: 1,
  K: 1,
  BENCH: 6,
};

export const FLEX_ELIGIBLE: Position[] = ["RB", "WR", "TE"];

export interface LeagueSettings {
  numTeams: number;
  myTeamIndex: number; // 0-indexed
  teamNames: string[];
  roster: RosterSettings;
}

export interface DraftedPick {
  overallPick: number;
  round: number;
  pickInRound: number;
  teamIndex: number;
  playerId: string;
}

export interface DraftState {
  league: LeagueSettings;
  players: Player[];
  picks: DraftedPick[];
  started: boolean;
}

export function totalRounds(roster: RosterSettings): number {
  return (
    roster.QB +
    roster.RB +
    roster.WR +
    roster.TE +
    roster.FLEX +
    roster.DST +
    roster.K +
    roster.BENCH
  );
}

// Weekly free-agent tracking (in-season, separate from the draft-day flow above)

export type PlayerStatus = "ACTIVE" | "Q" | "D" | "O" | "IR" | "SSPD" | "PUP" | "NFI" | "DNR";

export interface WeeklyPlayerStat {
  name: string;
  position: Position;
  nflTeam: string;
  status: PlayerStatus;
  proj: number | null;
  rostPct: number | null;
  trend: number | null; // week-over-week %ROST change
  posRank: number | null;
}

export interface RosterEntry extends WeeklyPlayerStat {
  slot: string; // e.g. "QB", "RB", "FLEX", "DST", "K", "BE", "IR"
}

export interface PickupRecommendation {
  position: Position;
  drop: RosterEntry;
  add: WeeklyPlayerStat;
  projGain: number;
  verdict: "recommended" | "marginal";
}

export interface WeekSnapshot {
  week: number;
  savedAt: string; // ISO timestamp
  roster: RosterEntry[];
  freeAgents: WeeklyPlayerStat[];
}
