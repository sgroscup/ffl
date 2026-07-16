import { FLEX_ELIGIBLE, type Player, type RosterSettings } from "../types";
import { computeRosterNeeds } from "../lib/recommendations";

interface Props {
  myRoster: Player[];
  roster: RosterSettings;
  teamName: string;
}

export default function MyRoster({ myRoster, roster, teamName }: Props) {
  const needs = computeRosterNeeds(myRoster, roster);
  const sorted = [...myRoster].sort((a, b) => a.rank - b.rank);

  return (
    <div className="my-roster">
      <h2>{teamName}</h2>
      <div className="need-summary">
        {(["QB", "RB", "WR", "TE", "DST", "K"] as const).map((pos) => {
          const n = needs.byPosition[pos];
          return (
            <span
              key={pos}
              className={n.starterNeed > 0 ? "need-chip need" : "need-chip"}
            >
              {pos} {n.filled}/{n.starterSlots}
            </span>
          );
        })}
        <span className={needs.flexNeed > 0 ? "need-chip need" : "need-chip"}>
          FLEX {needs.flexFilled}/{needs.flexSlots}
        </span>
      </div>

      {sorted.length === 0 ? (
        <p className="empty-row">No players drafted yet.</p>
      ) : (
        <ul className="roster-list">
          {sorted.map((p) => (
            <li key={p.id}>
              <span className={`pos-badge pos-${p.position}`}>{p.position}</span>
              <span className="roster-name">{p.name}</span>
              <span className="roster-team">{p.team}</span>
              {FLEX_ELIGIBLE.includes(p.position) && (
                <span className="roster-rank">#{p.rank}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
