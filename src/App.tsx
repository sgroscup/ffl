import { useEffect, useMemo, useState } from "react";
import type { DraftedPick, DraftState, LeagueSettings, Player } from "./types";
import { totalRounds } from "./types";
import SetupScreen from "./components/SetupScreen";
import DraftBoard from "./components/DraftBoard";
import PlayerPool from "./components/PlayerPool";
import RecommendationsPanel from "./components/RecommendationsPanel";
import MyRoster from "./components/MyRoster";
import { currentPick } from "./lib/draftOrder";
import { getRecommendations } from "./lib/recommendations";
import { clearDraftState, loadDraftState, saveDraftState } from "./lib/storage";
import "./App.css";

export default function App() {
  const [state, setState] = useState<DraftState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadDraftState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (state) saveDraftState(state);
    else clearDraftState();
  }, [state, hydrated]);

  const draftedIds = useMemo(
    () => new Set(state?.picks.map((p) => p.playerId) ?? []),
    [state?.picks],
  );

  const available = useMemo(
    () => (state ? state.players.filter((p) => !draftedIds.has(p.id)) : []),
    [state, draftedIds],
  );

  const myRoster = useMemo(() => {
    if (!state) return [];
    const myPicks = state.picks.filter((p) => p.teamIndex === state.league.myTeamIndex);
    const byId = new Map(state.players.map((p) => [p.id, p]));
    return myPicks.map((p) => byId.get(p.playerId)!).filter(Boolean);
  }, [state]);

  if (!hydrated) return null;

  if (!state) {
    return (
      <SetupScreen
        onStart={(league: LeagueSettings, players: Player[]) =>
          setState({ league, players, picks: [], started: true })
        }
      />
    );
  }

  const rounds = totalRounds(state.league.roster);
  const draftComplete = state.picks.length >= rounds * state.league.numTeams;
  const cur = draftComplete ? null : currentPick(state);
  const isMyTurn = cur !== null && cur.teamIndex === state.league.myTeamIndex;

  function handleDraft(playerId: string) {
    if (!state || draftComplete || !cur) return;
    const pick: DraftedPick = {
      overallPick: cur.overallPick,
      round: cur.round,
      pickInRound: cur.pickInRound,
      teamIndex: cur.teamIndex,
      playerId,
    };
    setState({ ...state, picks: [...state.picks, pick] });
  }

  function handleUndo() {
    if (!state || state.picks.length === 0) return;
    setState({ ...state, picks: state.picks.slice(0, -1) });
  }

  function handleReset() {
    if (!confirm("Reset this draft? All picks will be lost.")) return;
    setState(null);
  }

  const recommendations = getRecommendations(available, myRoster, state.league.roster, 6);
  const onTheClockLabel = cur ? state.league.teamNames[cur.teamIndex] : "";

  return (
    <div className="app">
      <header className="app-header">
        <h1>FFL Draft Assistant</h1>
        <div className="header-actions">
          <button type="button" onClick={handleUndo} disabled={state.picks.length === 0}>
            Undo last pick
          </button>
          <button type="button" className="danger-button" onClick={handleReset}>
            Reset draft
          </button>
        </div>
      </header>

      <DraftBoard state={state} />

      <div className="main-columns">
        <PlayerPool
          players={available}
          onDraft={handleDraft}
          draftDisabled={draftComplete}
          onTheClockLabel={onTheClockLabel}
        />
        <div className="side-column">
          <RecommendationsPanel
            recommendations={recommendations}
            isMyTurn={isMyTurn}
            onDraft={handleDraft}
          />
          <MyRoster
            myRoster={myRoster}
            roster={state.league.roster}
            teamName={state.league.teamNames[state.league.myTeamIndex]}
          />
        </div>
      </div>
    </div>
  );
}
