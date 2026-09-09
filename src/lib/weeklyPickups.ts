import type { PickupRecommendation, Position, RosterEntry, WeeklyPlayerStat } from "../types";

const POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "DST", "K"];

// Minimum single-week projection gain before flagging an add/drop. Below
// this it's noise (kicker/DST-tier swings); above it, a real upgrade.
const RECOMMENDED_THRESHOLD = 1.0;

/**
 * For each position, compares your weakest rostered player against the best
 * available free agent at that position, and flags it when the free agent
 * projects meaningfully higher. Mirrors a straightforward manual read: find
 * the roster's weak link at each position, check if waivers beat it.
 */
export function computeWeeklyPickups(
  roster: RosterEntry[],
  freeAgents: WeeklyPlayerStat[],
): PickupRecommendation[] {
  const active = roster.filter((r) => r.slot !== "IR");
  const recs: PickupRecommendation[] = [];

  for (const position of POSITIONS) {
    const rosteredAtPos = active.filter((r) => r.position === position);
    if (rosteredAtPos.length === 0) continue;

    const weakest = [...rosteredAtPos].sort(
      (a, b) => (a.proj ?? -Infinity) - (b.proj ?? -Infinity),
    )[0];

    const bestFreeAgent = freeAgents
      .filter((f) => f.position === position && f.nflTeam !== "FA" && f.proj !== null)
      .sort((a, b) => (b.proj ?? -Infinity) - (a.proj ?? -Infinity))[0];

    if (!bestFreeAgent || bestFreeAgent.proj === null) continue;

    const projGain = bestFreeAgent.proj - (weakest.proj ?? 0);
    if (projGain <= 0) continue;

    recs.push({
      position,
      drop: weakest,
      add: bestFreeAgent,
      projGain,
      verdict: projGain >= RECOMMENDED_THRESHOLD ? "recommended" : "marginal",
    });
  }

  return recs.sort((a, b) => b.projGain - a.projGain);
}
