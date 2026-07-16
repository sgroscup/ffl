import { useMemo } from "react";
import type { DraftState } from "../types";
import { currentPick } from "../lib/draftOrder";
import { totalRounds } from "../types";

interface Props {
  state: DraftState;
}

export default function DraftBoard({ state }: Props) {
  const { league, picks } = state;
  const rounds = totalRounds(league.roster);
  const cur = currentPick(state);
  const draftComplete = picks.length >= rounds * league.numTeams;

  const playersById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of state.players) map.set(p.id, `${p.name} (${p.position})`);
    return map;
  }, [state.players]);

  const grid = useMemo(() => {
    const g: (string | null)[][] = Array.from({ length: rounds }, () =>
      Array.from({ length: league.numTeams }, () => null),
    );
    for (const pick of picks) {
      g[pick.round - 1][pick.teamIndex] = playersById.get(pick.playerId) ?? pick.playerId;
    }
    return g;
  }, [picks, rounds, league.numTeams, playersById]);

  return (
    <div className="draft-board">
      <div className="on-the-clock">
        {draftComplete ? (
          <strong>Draft complete</strong>
        ) : (
          <>
            <strong>
              Round {cur.round}, Pick {cur.pickInRound} (#{cur.overallPick} overall)
            </strong>
            <span
              className={cur.teamIndex === league.myTeamIndex ? "on-clock-me" : ""}
            >
              {" "}
              — on the clock: {league.teamNames[cur.teamIndex]}
              {cur.teamIndex === league.myTeamIndex ? " (you)" : ""}
            </span>
          </>
        )}
      </div>

      <div className="board-scroll">
        <table className="board-table">
          <thead>
            <tr>
              <th>Rd</th>
              {league.teamNames.map((name, i) => (
                <th key={i} className={i === league.myTeamIndex ? "col-me" : ""}>
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, rIdx) => (
              <tr key={rIdx}>
                <td className="round-label">{rIdx + 1}</td>
                {row.map((cell, tIdx) => {
                  const isCurrent =
                    !draftComplete &&
                    cur.round === rIdx + 1 &&
                    cur.teamIndex === tIdx;
                  return (
                    <td
                      key={tIdx}
                      className={[
                        tIdx === league.myTeamIndex ? "col-me" : "",
                        isCurrent ? "cell-current" : "",
                        cell ? "cell-filled" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {cell ?? (isCurrent ? "•" : "")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
