import { useState } from "react";
import {
  DEFAULT_ROSTER,
  type DraftedPick,
  type LeagueSettings,
  type Player,
  type RosterSettings,
} from "../types";
import { DEFAULT_PLAYERS } from "../data/players";
import { parsePlayersCsv } from "../lib/csv";
import { parseDraftRecap } from "../lib/draftRecap";

interface Props {
  onStart: (league: LeagueSettings, players: Player[], picks?: DraftedPick[]) => void;
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

  const [recapOpen, setRecapOpen] = useState(false);
  const [recapText, setRecapText] = useState("");
  const [recapErrors, setRecapErrors] = useState<string[]>([]);
  const [recapPicks, setRecapPicks] = useState<DraftedPick[] | null>(null);
  const [recapSummary, setRecapSummary] = useState<string | null>(null);

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

  function handleParseRecap() {
    const result = parseDraftRecap(recapText, players);
    setRecapErrors(result.errors);
    if (result.picks.length === 0) {
      setRecapPicks(null);
      setRecapSummary(null);
      return;
    }
    setPlayers(result.players);
    resizeTeams(result.numTeams);
    setTeamNames(result.teamNames);
    setRecapPicks(result.picks);
    setRecapSummary(
      `Parsed ${result.picks.length} picks across ${result.numTeams} teams` +
        (result.newPlayerCount > 0
          ? ` (${result.newPlayerCount} players not in the rankings pool were added).`
          : "."),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const league: LeagueSettings = {
      numTeams,
      myTeamIndex,
      teamNames,
      roster,
    };
    onStart(league, players, recapPicks ?? undefined);
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
          <h2>
            Already drafted?{" "}
            <button
              type="button"
              className="link-button"
              onClick={() => setRecapOpen((o) => !o)}
            >
              {recapOpen ? "hide" : "import completed draft results"}
            </button>
          </h2>
          {recapOpen && (
            <div className="import-panel">
              <p>
                Paste an ESPN "Draft Recap" page (By Round view). This fills in
                team names, draft order, and every pick below — review and hit
                Start Draft to see the finished board and your roster.
              </p>
              <textarea
                rows={6}
                placeholder={"Round 1\nNO.\nPlayer\nTeam\n1\nJahmyr Gibbs DET, RB\nTaylea's Top Team\n..."}
                value={recapText}
                onChange={(e) => setRecapText(e.target.value)}
              />
              <div className="import-actions">
                <button type="button" onClick={handleParseRecap}>
                  Parse draft results
                </button>
                {recapSummary && <span className="import-success">{recapSummary}</span>}
              </div>
              {recapErrors.length > 0 && (
                <ul className="import-errors">
                  {recapErrors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

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
              {teamNames.map((name, i) => (
                <option key={i} value={i}>
                  Pick {i + 1} — {name}
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
