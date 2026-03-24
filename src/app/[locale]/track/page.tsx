"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useCallback, useEffect, useRef } from "react";
import { SchoolForm } from "@/components/school-form";
import {
  SchoolResultCard,
  SchoolResultCardSkeleton,
} from "@/components/school-result-card";
import { SummaryPanel } from "@/components/summary-panel";
import { Sidebar } from "@/components/sidebar";
import { WatchPanel } from "@/components/watch-panel";
import { useAuth } from "@/components/auth-provider";
import type { SchoolEntry, SchoolResultState } from "@/lib/types";
import {
  saveTrackState,
  loadTrackState,
  clearTrackState,
} from "@/lib/track-store";

function generateSessionTitle(entries: SchoolEntry[]): string {
  if (entries.length === 0) return "Untitled";
  const names = entries.map((e) => {
    const short = e.institution.replace(/ University| Institute| College/gi, "").trim();
    return e.program ? `${short} ${e.program}` : short;
  });
  if (names.length <= 2) return names.join(", ");
  return `${names[0]}, ${names[1]} +${names.length - 2}`;
}

export default function TrackPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { user } = useAuth();

  const [phase, setPhase] = useState<"form" | "results">("form");
  const [entries, setEntries] = useState<SchoolEntry[]>([]);
  const [results, setResults] = useState<SchoolResultState[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [watchedCount, setWatchedCount] = useState(0);
  const [showWatchPanel, setShowWatchPanel] = useState(false);
  const restoredRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = loadTrackState();
    if (saved && saved.phase === "results" && saved.results.length > 0) {
      setPhase(saved.phase);
      setEntries(saved.entries);
      setResults(saved.results);
      setIsAnalyzing(saved.isAnalyzing);
      if (saved.sessionId) {
        setActiveSessionId(saved.sessionId);
      }
    }
  }, []);

  useEffect(() => {
    if (phase === "results" && results.length > 0) {
      saveTrackState({ phase, entries, results, isAnalyzing, sessionId: activeSessionId });
    }
  }, [phase, entries, results, isAnalyzing, activeSessionId]);

  const completedCount = results.filter(
    (r) => r.status === "done" || r.status === "error"
  ).length;

  const allDone = !isAnalyzing && completedCount === entries.length && entries.length > 0;

  // Auto-save session when analysis completes
  const hasSavedRef = useRef(false);
  useEffect(() => {
    if (!allDone || !user) return;
    // Already has a session ID (restored or previously saved) — just PATCH
    if (activeSessionId && activeSessionId !== "saving") {
      if (hasSavedRef.current) return;
      hasSavedRef.current = true;
      const title = generateSessionTitle(entries);
      fetch(`/api/sessions/${activeSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results, title }),
      }).then(() => setSidebarRefresh((n) => n + 1)).catch(() => {});
      return;
    }
    // No session ID — create a new one (only for fresh analyses)
    if (activeSessionId === "saving") return;
    hasSavedRef.current = true;
    setActiveSessionId("saving");
    const title = generateSessionTitle(entries);
    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, schools: entries, results, lang: locale }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.session?.id) setActiveSessionId(data.session.id);
        setSidebarRefresh((n) => n + 1);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone, user]);

  const handleConfirm = useCallback(
    async (schools: SchoolEntry[]) => {
      setEntries(schools);
      setIsAnalyzing(true);
      setPhase("results");
      setGlobalError(null);
      setActiveSessionId(null);
      hasSavedRef.current = false;

      const initial: SchoolResultState[] = schools.map((s) => ({
        schoolId: s.id,
        status: "loading" as const,
      }));
      setResults(initial);

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schools, locale }),
          signal: abort.signal,
        });

        if (response.status === 429) {
          setGlobalError(t("errors.tooManyRequests"));
          setIsAnalyzing(false);
          return;
        }

        if (!response.ok || !response.body) {
          setGlobalError(t("errors.agentFailed"));
          setIsAnalyzing(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              if (event.type === "result") {
                setResults((prev) =>
                  prev.map((r) =>
                    r.schoolId === event.schoolId
                      ? {
                          ...r,
                          status: "done" as const,
                          data: event.data,
                          fromCache: event.fromCache,
                        }
                      : r
                  )
                );
              } else if (event.type === "error") {
                setResults((prev) =>
                  prev.map((r) =>
                    r.schoolId === event.schoolId
                      ? {
                          ...r,
                          status: "error" as const,
                          error: event.message,
                        }
                      : r
                  )
                );
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setGlobalError(t("errors.agentFailed"));
        }
      } finally {
        setIsAnalyzing(false);
        abortRef.current = null;
      }
    },
    [locale, t]
  );

  async function handleSelectSession(sessionId: string) {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      const session = data.session;

      setActiveSessionId(session.id);
      setEntries(session.schools || []);
      setResults(session.results || []);
      setPhase("results");
      setIsAnalyzing(false);
      setGlobalError(null);
      hasSavedRef.current = true;
      clearTrackState();
    } catch {
      // Ignore
    }
  }

  function handleNewAnalysis() {
    if (abortRef.current) abortRef.current.abort();
    setPhase("form");
    setResults([]);
    setEntries([]);
    setIsAnalyzing(false);
    setGlobalError(null);
    setActiveSessionId(null);
    hasSavedRef.current = false;
    clearTrackState();
  }

  function handleReset() {
    handleNewAnalysis();
  }

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar for logged-in users */}
      {user && (
        <Sidebar
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewAnalysis={handleNewAnalysis}
          refreshTrigger={sidebarRefresh}
          watchedCount={watchedCount}
        />
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10">
          {phase === "form" ? (
            <>
              <div className="mb-6">
                <h1 className="font-[family-name:var(--font-dm-mono)] text-xl md:text-2xl font-medium text-text">
                  {t("nav.track")} 📋
                </h1>
                <p className="text-sm text-text-secondary mt-1">
                  {t("hero.subheadline")}
                </p>
              </div>
              <SchoolForm onConfirm={handleConfirm} isAnalyzing={isAnalyzing} />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="font-[family-name:var(--font-dm-mono)] text-xl font-medium text-text">
                  {t("nav.track")} 📋
                </h1>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-text-secondary font-[family-name:var(--font-dm-mono)] tabular">
                    {completedCount}/{entries.length}
                  </span>
                  <button
                    onClick={handleReset}
                    className="text-sm text-amber hover:text-amber-hover transition-colors"
                  >
                    ← {locale === "zh" ? "重新追踪" : "Start over"}
                  </button>
                </div>
              </div>

              <div className="mb-6 h-1.5 bg-bg-warm rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${
                      entries.length > 0
                        ? (completedCount / entries.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>

              {globalError && (
                <div className="mb-4 p-4 bg-coral/10 border border-coral/20 rounded-xl text-sm text-coral animate-fade-in">
                  {globalError}
                </div>
              )}

              <div className="space-y-4">
                {results.map((result, i) => {
                  const entry = entries[i];
                  if (result.status === "loading") {
                    return (
                      <SchoolResultCardSkeleton
                        key={result.schoolId}
                        school={entry.institution}
                        program={entry.program}
                        degree={t(`form.degrees.${entry.degree}`)}
                      />
                    );
                  }
                  return (
                    <SchoolResultCard key={result.schoolId} result={result} />
                  );
                })}
              </div>

              {allDone && (
                <div className="mt-6">
                  <SummaryPanel results={results} />
                </div>
              )}

              {allDone && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowWatchPanel(true)}
                    className="w-full bg-surface border border-amber/20 rounded-xl p-5 shadow-card text-center animate-fade-in hover:border-amber/40 hover:shadow-card-hover transition-all group"
                  >
                    <p className="text-sm text-text font-medium mb-1 group-hover:text-amber transition-colors">
                      🔔 {t("watch.cta")}
                    </p>
                    <p className="text-xs text-muted">{t("notify.note")}</p>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showWatchPanel && (
        <WatchPanel
          entries={entries}
          results={results}
          onClose={() => setShowWatchPanel(false)}
          onWatchCountChange={setWatchedCount}
        />
      )}
    </div>
  );
}
