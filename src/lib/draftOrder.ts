import type { DraftState } from "../types";

export interface PickSlot {
  overallPick: number;
  round: number;
  pickInRound: number;
  teamIndex: number;
}

export function teamIndexForPick(
  overallPick: number,
  numTeams: number,
): number {
  const round = Math.ceil(overallPick / numTeams);
  const pickInRound = overallPick - (round - 1) * numTeams;
  return round % 2 === 1 ? pickInRound - 1 : numTeams - pickInRound;
}

export function pickSlot(overallPick: number, numTeams: number): PickSlot {
  const round = Math.ceil(overallPick / numTeams);
  const pickInRound = overallPick - (round - 1) * numTeams;
  return {
    overallPick,
    round,
    pickInRound,
    teamIndex: teamIndexForPick(overallPick, numTeams),
  };
}

export function currentPick(state: DraftState): PickSlot {
  const overallPick = state.picks.length + 1;
  return pickSlot(overallPick, state.league.numTeams);
}

export function isMyTurn(state: DraftState): boolean {
  return currentPick(state).teamIndex === state.league.myTeamIndex;
}
