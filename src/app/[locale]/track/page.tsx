"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useCallback, useEffect, useRef } from "react";
import { SchoolForm } from "@/components/school-form";
import {
  SchoolResultCard,
  SchoolResultCardSkeleton,
} from "@/components/school-result-card";
import { SummaryPanel } from "@/components/summary-panel";
import type { SchoolEntry, SchoolResultState } from "@/lib/types";
import { generateMockResult } from "@/lib/mock-data";
import {
  saveTrackState,
  loadTrackState,
  clearTrackState,
} from "@/lib/track-store";

export default function TrackPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [phase, setPhase] = useState<"form" | "results">("form");
  const [entries, setEntries] = useState<SchoolEntry[]>([]);
  const [results, setResults] = useState<SchoolResultState[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const restoredRef = useRef(false);

  // Restore state from sessionStorage on mount (survives locale switch)
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = loadTrackState();
    if (saved && saved.phase === "results" && saved.results.length > 0) {
      setPhase(saved.phase);
      setEntries(saved.entries);
      setResults(saved.results);
      setIsAnalyzing(saved.isAnalyzing);
    }
  }, []);

  // Persist state whenever it changes (so locale switch preserves it)
  useEffect(() => {
    if (phase === "results" && results.length > 0) {
      saveTrackState({ phase, entries, results, isAnalyzing });
    }
  }, [phase, entries, results, isAnalyzing]);

  const completedCount = results.filter(
    (r) => r.status === "done" || r.status === "error"
  ).length;

  const handleConfirm = useCallback(
    async (schools: SchoolEntry[]) => {
      setEntries(schools);
      setIsAnalyzing(true);
      setPhase("results");

      const initial: SchoolResultState[] = schools.map((s) => ({
        schoolId: s.id,
        status: "loading" as const,
      }));
      setResults(initial);

      for (const school of schools) {
        const delay = 800 + Math.random() * 2000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        const mockData = generateMockResult(
          school.institution,
          school.program,
          t(`form.degrees.${school.degree}`),
          school.season
        );

        setResults((prev) =>
          prev.map((r) =>
            r.schoolId === school.id
              ? {
                  ...r,
                  status: "done" as const,
                  data: mockData,
                  fromCache: false,
                }
              : r
          )
        );
      }

      setIsAnalyzing(false);
    },
    [t]
  );

  function handleReset() {
    setPhase("form");
    setResults([]);
    setEntries([]);
    setIsAnalyzing(false);
    clearTrackState();
  }

  return (
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

          {!isAnalyzing && completedCount === entries.length && (
            <div className="mt-6">
              <SummaryPanel results={results} />
            </div>
          )}

          {!isAnalyzing && completedCount === entries.length && (
            <div className="mt-6 bg-surface border border-border rounded-xl p-5 shadow-card text-center animate-fade-in">
              <p className="text-sm text-text-secondary mb-3">
                🔔 {t("notify.cta")}
              </p>
              <p className="text-xs text-muted">{t("notify.note")}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
