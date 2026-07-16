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
