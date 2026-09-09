import { useEffect, useState } from "react";
import type { WeekSnapshot } from "../types";
import { parseFreeAgentsText, parseRosterText } from "../lib/espnParse";
import { computeWeeklyPickups } from "../lib/weeklyPickups";
import { deleteWeekSnapshot, loadWeekSnapshots, saveWeekSnapshot } from "../lib/storage";

export default function WeeklyTracker() {
  const [snapshots, setSnapshots] = useState<WeekSnapshot[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [viewingWeek, setViewingWeek] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formWeek, setFormWeek] = useState(1);
  const [rosterText, setRosterText] = useState("");
  const [faText, setFaText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadWeekSnapshots();
    setSnapshots(loaded);
    if (loaded.length > 0) {
      setViewingWeek(loaded[loaded.length - 1].week);
    } else {
      setFormWeek(1);
      setFormOpen(true);
    }
    setHydrated(true);
  }, []);

  function openForm(week: number) {
    setFormWeek(week);
    setRosterText("");
    setFaText("");
    setParseError(null);
    setFormOpen(true);
  }

  function openNewWeekForm() {
    const nextWeek = snapshots.length > 0 ? Math.max(...snapshots.map((s) => s.week)) + 1 : 1;
    openForm(nextWeek);
  }

  function handleAnalyze() {
    const roster = parseRosterText(rosterText);
    const freeAgents = parseFreeAgentsText(faText);
    if (roster.length === 0) {
      setParseError(
        "Couldn't find any roster players in that paste — make sure you copied the full My Team page.",
      );
      return;
    }
    if (freeAgents.length === 0) {
      setParseError(
        "Couldn't find any free agents in that paste — make sure you copied a Free Agents page.",
      );
      return;
    }
    const snapshot: WeekSnapshot = {
      week: formWeek,
      savedAt: new Date().toISOString(),
      roster,
      freeAgents,
    };
    setSnapshots(saveWeekSnapshot(snapshot));
    setViewingWeek(formWeek);
    setFormOpen(false);
    setParseError(null);
  }

  function handleDelete(week: number) {
    if (!confirm(`Delete Week ${week}'s saved analysis?`)) return;
    const next = deleteWeekSnapshot(week);
    setSnapshots(next);
    if (viewingWeek === week) {
      setViewingWeek(next.length > 0 ? next[next.length - 1].week : null);
    }
  }

  if (!hydrated) return null;

  const activeSnapshot =
    viewingWeek !== null ? (snapshots.find((s) => s.week === viewingWeek) ?? null) : null;
  const recommendations = activeSnapshot
    ? computeWeeklyPickups(activeSnapshot.roster, activeSnapshot.freeAgents)
    : [];

  return (
    <div className="weekly-tracker">
      <div className="weekly-header">
        <h2>Weekly Free Agents</h2>
        <button type="button" className="primary-button" onClick={openNewWeekForm}>
          + Analyze a week
        </button>
      </div>

      {snapshots.length > 0 && (
        <div className="week-chips">
          {snapshots.map((s) => (
            <span key={s.week} className={s.week === viewingWeek ? "week-chip active" : "week-chip"}>
              <button
                type="button"
                onClick={() => {
                  setViewingWeek(s.week);
                  setFormOpen(false);
                }}
              >
                Week {s.week}
              </button>
              <button
                type="button"
                className="week-chip-delete"
                aria-label={`Delete Week ${s.week}`}
                onClick={() => handleDelete(s.week)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="weekly-form setup-section">
          <label className="field field-narrow">
            Week
            <input
              type="number"
              min={1}
              max={18}
              value={formWeek}
              onChange={(e) => setFormWeek(Number(e.target.value))}
            />
          </label>

          <div className="paste-grid">
            <label className="field">
              Your roster
              <textarea
                rows={8}
                placeholder="Open your ESPN My Team page, select all, copy, and paste it here."
                value={rosterText}
                onChange={(e) => setRosterText(e.target.value)}
              />
            </label>
            <label className="field">
              Free agents
              <textarea
                rows={8}
                placeholder="Open Free Agents, filter by position, select all, copy, paste here. Paste more position pages right after one another — they'll all be picked up together."
                value={faText}
                onChange={(e) => setFaText(e.target.value)}
              />
            </label>
          </div>

          {parseError && <p className="import-errors">{parseError}</p>}

          <div className="import-actions">
            <button type="button" className="primary-button" onClick={handleAnalyze}>
              Analyze Week {formWeek}
            </button>
            <button type="button" className="link-button" onClick={() => setFormOpen(false)}>
              cancel
            </button>
          </div>
        </div>
      )}

      {activeSnapshot && !formOpen && (
        <div className="weekly-results">
          <div className="weekly-meta">
            <h3>Week {activeSnapshot.week}</h3>
            <span className="roster-team">
              {activeSnapshot.roster.length} rostered · {activeSnapshot.freeAgents.length} free
              agents considered
            </span>
            <button type="button" className="link-button" onClick={() => openForm(activeSnapshot.week)}>
              re-paste this week
            </button>
          </div>

          {recommendations.length === 0 ? (
            <p className="empty-row">Nothing beats your roster this week — hold at every position.</p>
          ) : (
            <ul className="rec-list">
              {recommendations.map((r) => (
                <li key={r.position} className="rec-item">
                  <div className="rec-main">
                    <span className={`pos-badge pos-${r.position}`}>{r.position}</span>
                    <span className="rec-name">
                      Drop {r.drop.name} ({r.drop.proj ?? "--"} proj)
                    </span>
                  </div>
                  <div className="rec-main">
                    <span className="rec-team">&rarr;</span>
                    <span className="rec-name">
                      Add {r.add.name} ({r.add.nflTeam}) — {r.add.proj ?? "--"} proj
                    </span>
                    <span
                      className={
                        r.verdict === "recommended"
                          ? "verdict-chip recommended"
                          : "verdict-chip marginal"
                      }
                    >
                      +{r.projGain.toFixed(1)} pts{r.verdict === "marginal" ? " (marginal)" : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!activeSnapshot && !formOpen && (
        <p className="empty-row">No weeks analyzed yet. Click "Analyze a week" to get started.</p>
      )}
    </div>
  );
}
