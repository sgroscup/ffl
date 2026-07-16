import { useState } from "react";
import { DEFAULT_ROSTER, type LeagueSettings, type Player, type RosterSettings } from "../types";
import { DEFAULT_PLAYERS } from "../data/players";
import { parsePlayersCsv } from "../lib/csv";

interface Props {
  onStart: (league: LeagueSettings, players: Player[]) => void;
}

const ROSTER_FIELDS: { key: keyof RosterSettings; label: string }[] = [
  { key: "QB", label: "QB" },
  { key: "RB", label: "RB" },
  { key: "WR", label: "WR" },
  { key: "TE", label: "TE" },
  { key: "FLEX", label: "FLEX" },
  { key: "DST", label: "D/ST" },
  { key: "K", label: "K" },
  { key: "BENCH", label: "Bench" },
];

export default function SetupScreen({ onStart }: Props) {
  const [numTeams, setNumTeams] = useState(10);
  const [myTeamIndex, setMyTeamIndex] = useState(0);
  const [teamNames, setTeamNames] = useState<string[]>(
    Array.from({ length: 10 }, (_, i) => (i === 0 ? "My Team" : `Team ${i + 1}`)),
  );
  const [roster, setRoster] = useState<RosterSettings>(DEFAULT_ROSTER);
  const [players, setPlayers] = useState<Player[]>(DEFAULT_PLAYERS);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  function resizeTeams(n: number) {
    setNumTeams(n);
    setTeamNames((prev) => {
      const next = Array.from({ length: n }, (_, i) => prev[i] ?? `Team ${i + 1}`);
      return next;
    });
    if (myTeamIndex >= n) setMyTeamIndex(0);
  }

  function updateTeamName(i: number, name: string) {
    setTeamNames((prev) => prev.map((t, idx) => (idx === i ? name : t)));
  }

  function updateRoster(key: keyof RosterSettings, value: number) {
    setRoster((prev) => ({ ...prev, [key]: Math.max(0, value) }));
  }

  function handleImport() {
    const result = parsePlayersCsv(importText);
    setImportErrors(result.errors);
    if (result.players.length > 0) {
      setPlayers(result.players);
      setImportedCount(result.players.length);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const league: LeagueSettings = {
      numTeams,
      myTeamIndex,
      teamNames,
      roster,
    };
    onStart(league, players);
  }

  return (
    <div className="setup-screen">
      <h1>FFL Draft Assistant</h1>
      <p className="subtitle">
        Track a live snake draft pick-by-pick and get recommendations for your
        next pick.
      </p>

      <form onSubmit={handleSubmit}>
        <section className="setup-section">
          <h2>League</h2>
          <label className="field">
            Number of teams
            <input
              type="number"
              min={2}
              max={20}
              value={numTeams}
              onChange={(e) => resizeTeams(Number(e.target.value))}
            />
          </label>
          <label className="field">
            My draft slot
            <select
              value={myTeamIndex}
              onChange={(e) => setMyTeamIndex(Number(e.target.value))}
            >
              {teamNames.map((_, i) => (
                <option key={i} value={i}>
                  Pick {i + 1}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="setup-section">
          <h2>Team names</h2>
          <div className="team-name-grid">
            {teamNames.map((name, i) => (
              <input
                key={i}
                className={i === myTeamIndex ? "team-name-me" : ""}
                value={name}
                onChange={(e) => updateTeamName(i, e.target.value)}
              />
            ))}
          </div>
        </section>

        <section className="setup-section">
          <h2>Roster</h2>
          <div className="roster-grid">
            {ROSTER_FIELDS.map(({ key, label }) => (
              <label className="field field-narrow" key={key}>
                {label}
                <input
                  type="number"
                  min={0}
                  max={15}
                  value={roster[key]}
                  onChange={(e) => updateRoster(key, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="setup-section">
          <h2>
            Player rankings{" "}
            <button
              type="button"
              className="link-button"
              onClick={() => setImportOpen((o) => !o)}
            >
              {importOpen ? "hide" : `import custom (${players.length} loaded)`}
            </button>
          </h2>
          {importOpen && (
            <div className="import-panel">
              <p>
                Paste a CSV with a header row: <code>name,position,team,bye,rank</code>.
                This replaces the built-in rankings below.
              </p>
              <textarea
                rows={6}
                placeholder={"name,position,team,bye,rank\nJa'Marr Chase,WR,CIN,6,4"}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <div className="import-actions">
                <button type="button" onClick={handleImport}>
                  Parse & use this list
                </button>
                {importedCount !== null && (
                  <span className="import-success">Loaded {importedCount} players</span>
                )}
              </div>
              {importErrors.length > 0 && (
                <ul className="import-errors">
                  {importErrors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <button type="submit" className="primary-button">
          Start Draft
        </button>
      </form>
    </div>
  );
}
