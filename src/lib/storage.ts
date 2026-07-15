import type { DraftState } from "../types";

const STORAGE_KEY = "ffl-draft-state";

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
