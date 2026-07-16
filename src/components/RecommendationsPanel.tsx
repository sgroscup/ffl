import type { Recommendation } from "../lib/recommendations";

interface Props {
  recommendations: Recommendation[];
  isMyTurn: boolean;
  onDraft: (playerId: string) => void;
}

export default function RecommendationsPanel({ recommendations, isMyTurn, onDraft }: Props) {
  return (
    <div className={isMyTurn ? "recommendations on-turn" : "recommendations"}>
      <h2>{isMyTurn ? "Your pick — recommendations" : "Next-pick preview"}</h2>
      {recommendations.length === 0 ? (
        <p className="empty-row">No players left to recommend.</p>
      ) : (
        <ol className="rec-list">
          {recommendations.map(({ player, reasons }, i) => (
            <li key={player.id} className="rec-item">
              <div className="rec-main">
                <span className="rec-rank">#{player.rank}</span>
                <span className="rec-name">{player.name}</span>
                <span className={`pos-badge pos-${player.position}`}>{player.position}</span>
                <span className="rec-team">{player.team}</span>
              </div>
              <div className="rec-reasons">{reasons.join(" · ")}</div>
              {isMyTurn && (
                <button
                  type="button"
                  className={i === 0 ? "draft-button primary" : "draft-button"}
                  onClick={() => onDraft(player.id)}
                >
                  Draft {player.name}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
