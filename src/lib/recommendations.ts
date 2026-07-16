import {
  FLEX_ELIGIBLE,
  type Player,
  type Position,
  type RosterSettings,
} from "../types";

const BASE_POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "DST", "K"];

export type NeedTier = "starter" | "flex" | "bench";

export interface PositionNeed {
  position: Position;
  filled: number;
  starterSlots: number;
  starterNeed: number;
}

export interface RosterNeeds {
  byPosition: Record<Position, PositionNeed>;
  flexSlots: number;
  flexFilled: number;
  flexNeed: number;
}

export function computeRosterNeeds(
  myRoster: Player[],
  roster: RosterSettings,
): RosterNeeds {
  const filled: Record<Position, number> = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    DST: 0,
    K: 0,
  };
  for (const p of myRoster) filled[p.position]++;

  const byPosition = {} as Record<Position, PositionNeed>;
  for (const pos of BASE_POSITIONS) {
    const starterSlots = roster[pos];
    byPosition[pos] = {
      position: pos,
      filled: filled[pos],
      starterSlots,
      starterNeed: Math.max(0, starterSlots - filled[pos]),
    };
  }

  const flexFilled = FLEX_ELIGIBLE.reduce(
    (sum, pos) => sum + Math.max(0, filled[pos] - roster[pos]),
    0,
  );
  const flexSlots = roster.FLEX;
  const flexNeed = Math.max(0, flexSlots - flexFilled);

  return { byPosition, flexSlots, flexFilled, flexNeed };
}

function needTier(position: Position, needs: RosterNeeds): NeedTier {
  if (needs.byPosition[position].starterNeed > 0) return "starter";
  if (FLEX_ELIGIBLE.includes(position) && needs.flexNeed > 0) return "flex";
  return "bench";
}

const TIER_BONUS: Record<NeedTier, number> = {
  starter: 18,
  flex: 8,
  bench: 0,
};

const TIER_LABEL: Record<NeedTier, string> = {
  starter: "Fills a starter need",
  flex: "Fills your FLEX slot",
  bench: "Best available depth",
};

export interface Recommendation {
  player: Player;
  score: number;
  reasons: string[];
}

const SCARCITY_GAP_THRESHOLD = 10;
const SCARCITY_BONUS = 6;

export function getRecommendations(
  available: Player[],
  myRoster: Player[],
  roster: RosterSettings,
  limit = 6,
): Recommendation[] {
  const needs = computeRosterNeeds(myRoster, roster);

  const byPosition: Record<Position, Player[]> = {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    DST: [],
    K: [],
  };
  for (const p of available) byPosition[p.position].push(p);
  for (const pos of Object.keys(byPosition) as Position[]) {
    byPosition[pos].sort((a, b) => a.rank - b.rank);
  }

  const cliffPlayerIds = new Set<string>();
  for (const pos of Object.keys(byPosition) as Position[]) {
    const tier = needTier(pos, needs);
    if (tier === "bench") continue;
    const [first, second] = byPosition[pos];
    if (first && second && second.rank - first.rank >= SCARCITY_GAP_THRESHOLD) {
      cliffPlayerIds.add(first.id);
    }
  }

  const scored: Recommendation[] = available.map((player) => {
    const tier = needTier(player.position, needs);
    const reasons: string[] = [TIER_LABEL[tier]];
    let score = -player.rank + TIER_BONUS[tier];

    if (cliffPlayerIds.has(player.id)) {
      score += SCARCITY_BONUS;
      reasons.push("Value cliff — next best at position drops off sharply");
    }

    return { player, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
