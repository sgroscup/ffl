import type { DraftState, WeekSnapshot } from "../types";

const STORAGE_KEY = "ffl-draft-state";
const WEEKLY_KEY = "ffl-weekly-snapshots";

export function loadDraftState(): DraftState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DraftState;
  } catch {
    return null;
  }
}

export function saveDraftState(state: DraftState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearDraftState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function loadWeekSnapshots(): WeekSnapshot[] {
  try {
    const raw = localStorage.getItem(WEEKLY_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as WeekSnapshot[]).sort((a, b) => a.week - b.week);
  } catch {
    return [];
  }
}

export function saveWeekSnapshot(snapshot: WeekSnapshot): WeekSnapshot[] {
  const next = [
    ...loadWeekSnapshots().filter((s) => s.week !== snapshot.week),
    snapshot,
  ].sort((a, b) => a.week - b.week);
  localStorage.setItem(WEEKLY_KEY, JSON.stringify(next));
  return next;
}

export function deleteWeekSnapshot(week: number): WeekSnapshot[] {
  const next = loadWeekSnapshots().filter((s) => s.week !== week);
  localStorage.setItem(WEEKLY_KEY, JSON.stringify(next));
  return next;
}
