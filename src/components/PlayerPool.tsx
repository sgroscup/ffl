import { useMemo, useState } from "react";
import type { Player, Position } from "../types";

interface Props {
  players: Player[];
  onDraft: (playerId: string) => void;
  draftDisabled: boolean;
  onTheClockLabel: string;
}

const POSITIONS: (Position | "ALL")[] = ["ALL", "QB", "RB", "WR", "TE", "DST", "K"];

export default function PlayerPool({ players, onDraft, draftDisabled, onTheClockLabel }: Props) {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<Position | "ALL">("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players
      .filter((p) => position === "ALL" || p.position === position)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q))
      .sort((a, b) => a.rank - b.rank);
  }, [players, search, position]);

  return (
    <div className="player-pool">
      <div className="pool-controls">
        <input
          className="search-input"
          placeholder="Search player or team…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="position-filter">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              type="button"
              className={pos === position ? "pos-tab active" : "pos-tab"}
              onClick={() => setPosition(pos)}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      <div className="pool-scroll">
        <table className="pool-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Pos</th>
              <th>Team</th>
              <th>Bye</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>{p.rank}</td>
                <td>{p.name}</td>
                <td>
                  <span className={`pos-badge pos-${p.position}`}>{p.position}</span>
                </td>
                <td>{p.team}</td>
                <td>{p.bye ?? "-"}</td>
                <td>
                  <button
                    type="button"
                    className="draft-button"
                    disabled={draftDisabled}
                    title={draftDisabled ? undefined : `Draft to ${onTheClockLabel}`}
                    onClick={() => onDraft(p.id)}
                  >
                    Draft
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-row">
                  No players match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
