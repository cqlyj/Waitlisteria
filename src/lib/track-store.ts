import type { SchoolEntry, SchoolResultState } from "./types";

const STORAGE_KEY = "waitlisteria_track";

interface TrackState {
  phase: "form" | "results";
  entries: SchoolEntry[];
  results: SchoolResultState[];
  isAnalyzing: boolean;
  sessionId: string | null;
  savedAt: number;
}

const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

export function saveTrackState(state: Omit<TrackState, "savedAt">) {
  try {
    const data: TrackState = { ...state, savedAt: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage might be unavailable
  }
}

export function loadTrackState(): Omit<TrackState, "savedAt"> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data: TrackState = JSON.parse(raw);
    if (Date.now() - data.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const { savedAt: _, ...rest } = data;
    return rest;
  } catch {
    return null;
  }
}

export function clearTrackState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
