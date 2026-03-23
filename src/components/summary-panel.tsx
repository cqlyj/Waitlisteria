"use client";

import { useTranslations, useLocale } from "next-intl";
import type { SchoolResultState } from "@/lib/types";
import { CountUp } from "./count-up";
import { getDisplayName } from "@/lib/institution-utils";

function chanceColor(pct: number): string {
  if (pct >= 40) return "bg-teal";
  if (pct >= 20) return "bg-amber";
  return "bg-coral";
}

function chanceTextColor(pct: number): string {
  if (pct >= 40) return "text-teal";
  if (pct >= 20) return "text-amber";
  return "text-coral";
}

function ChanceBar({
  school,
  low,
  high,
  label,
  locale,
}: {
  school: string;
  low: number;
  high: number;
  label: string;
  locale: string;
}) {
  const displayName = getDisplayName(school, locale);
  const mid = (low + high) / 2;

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs text-text-secondary w-28 md:w-40 truncate flex-shrink-0" title={displayName}>
        {displayName}
      </span>
      <div className="flex-1 h-5 bg-bg-warm rounded-full overflow-hidden relative">
        {/* Low bound bar (lighter) */}
        <div
          className={`absolute inset-y-0 left-0 ${chanceColor(mid)} opacity-30 rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(high, 100)}%` }}
        />
        {/* Mid bar (solid) */}
        <div
          className={`absolute inset-y-0 left-0 ${chanceColor(mid)} rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(mid, 100)}%` }}
        />
      </div>
      <span
        className={`text-xs font-[family-name:var(--font-dm-mono)] tabular w-24 text-right flex-shrink-0 ${chanceTextColor(mid)}`}
      >
        {label}
      </span>
    </div>
  );
}

function OverallChance({
  results,
  locale,
}: {
  results: SchoolResultState[];
  locale: string;
}) {
  const t = useTranslations("summary");
  const completed = results.filter((r) => r.status === "done" && r.data);
  if (completed.length === 0) return null;

  // P(at least one admit) = 1 - product(1 - p_i)
  // Use midpoint of each school's range
  let probNone = 1;
  for (const r of completed) {
    const d = r.data!;
    const mid = (d.wl_chance_low + d.wl_chance_high) / 2 / 100;
    probNone *= 1 - mid;
  }
  const overallPct = Math.round((1 - probNone) * 100);

  const overallLabel =
    overallPct >= 60
      ? locale === "zh" ? "乐观" : "Likely"
      : overallPct >= 30
        ? locale === "zh" ? "有希望" : "Possible"
        : locale === "zh" ? "较难" : "Unlikely";

  return (
    <div className="flex items-center gap-4 p-4 bg-surface border border-border rounded-xl">
      <div
        className={`text-3xl font-[family-name:var(--font-dm-mono)] font-medium tabular ${chanceTextColor(overallPct)}`}
      >
        <CountUp end={overallPct} />%
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-text">
          {locale === "zh"
            ? "至少获得一个候补转正的概率"
            : "Chance of at least one WL admit"}
        </div>
        <div className={`text-xs ${chanceTextColor(overallPct)}`}>
          {overallLabel}
        </div>
      </div>
      {/* Mini donut */}
      <svg width="48" height="48" viewBox="0 0 48 48" className="flex-shrink-0">
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          className="text-bg-warm"
        />
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeDasharray={`${(overallPct / 100) * 125.6} 125.6`}
          strokeDashoffset="0"
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
          className={chanceTextColor(overallPct)}
          style={{ transition: "stroke-dasharray 1s ease-out" }}
        />
      </svg>
    </div>
  );
}

export function SummaryPanel({ results }: { results: SchoolResultState[] }) {
  const t = useTranslations("summary");
  const locale = useLocale();

  const completed = results.filter((r) => r.status === "done" && r.data);
  if (completed.length === 0) return null;

  const totalTracked = completed.length;
  const activeRounds = completed.filter(
    (r) => r.data!.offer_rounds > 0
  ).length;
  const wlMovement = completed.filter(
    (r) => r.data!.waitlisted_reports > 0
  ).length;

  const summaries = completed
    .map((r) => (locale === "zh" ? r.data!.summary_zh : r.data!.summary_en))
    .filter(Boolean);

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="font-[family-name:var(--font-dm-mono)] text-lg font-medium text-text">
        {t("title")} 📊
      </h2>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-surface border border-border rounded-xl shadow-card">
          <div className="text-2xl font-[family-name:var(--font-dm-mono)] text-text tabular">
            <CountUp end={totalTracked} />
          </div>
          <div className="text-xs text-text-secondary mt-1">
            {t("totalTracked")}
          </div>
        </div>
        <div className="text-center p-3 bg-surface border border-border rounded-xl shadow-card">
          <div className="text-2xl font-[family-name:var(--font-dm-mono)] text-teal tabular">
            <CountUp end={activeRounds} />
          </div>
          <div className="text-xs text-text-secondary mt-1">
            {t("activeRounds")}
          </div>
        </div>
        <div className="text-center p-3 bg-surface border border-border rounded-xl shadow-card">
          <div className="text-2xl font-[family-name:var(--font-dm-mono)] text-amber tabular">
            <CountUp end={wlMovement} />
          </div>
          <div className="text-xs text-text-secondary mt-1">
            {t("wlMovement")}
          </div>
        </div>
      </div>

      {/* Overall chance */}
      <OverallChance results={results} locale={locale} />

      {/* WL Chance bar chart */}
      {completed.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4 shadow-card">
          <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">
            {locale === "zh" ? "各校候补录取概率" : "WL Admission Chance by School"}
          </h3>
          <div className="space-y-0.5">
            {completed
              .sort(
                (a, b) =>
                  (b.data!.wl_chance_low + b.data!.wl_chance_high) / 2 -
                  (a.data!.wl_chance_low + a.data!.wl_chance_high) / 2
              )
              .map((r) => (
                <ChanceBar
                  key={r.schoolId}
                  school={r.data!.school}
                  low={r.data!.wl_chance_low}
                  high={r.data!.wl_chance_high}
                  label={`${r.data!.wl_chance_label} (${r.data!.wl_chance_low}–${r.data!.wl_chance_high}%)`}
                  locale={locale}
                />
              ))}
          </div>
        </div>
      )}

      {/* AI Summary */}
      {summaries.length > 0 && (
        <div className="p-4 bg-bg-warm rounded-xl">
          <p className="text-sm text-text leading-relaxed">
            {summaries[0]}
          </p>
        </div>
      )}
    </div>
  );
}
