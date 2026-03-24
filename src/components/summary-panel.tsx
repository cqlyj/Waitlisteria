"use client";

import { useTranslations, useLocale } from "next-intl";
import type { SchoolResultState } from "@/lib/types";
import { CountUp } from "./count-up";
import { getDisplayName } from "@/lib/institution-utils";
import { computeWlChance } from "./school-result-card";

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
  chance,
  locale,
}: {
  school: string;
  chance: number | null;
  locale: string;
}) {
  const displayName = getDisplayName(school, locale);

  if (chance == null) {
    return (
      <div className="flex items-center gap-3 py-1.5">
        <span className="text-xs text-text-secondary w-28 md:w-40 truncate flex-shrink-0" title={displayName}>
          {displayName}
        </span>
        <div className="flex-1 h-5 bg-bg-warm rounded-full overflow-hidden" />
        <span className="text-xs font-[family-name:var(--font-dm-mono)] tabular w-20 text-right flex-shrink-0 text-muted">
          N/A
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs text-text-secondary w-28 md:w-40 truncate flex-shrink-0" title={displayName}>
        {displayName}
      </span>
      <div className="flex-1 h-5 bg-bg-warm rounded-full overflow-hidden relative">
        <div
          className={`absolute inset-y-0 left-0 ${chanceColor(chance)} rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(chance, 100)}%` }}
        />
      </div>
      <span
        className={`text-xs font-[family-name:var(--font-dm-mono)] tabular w-20 text-right flex-shrink-0 ${chanceTextColor(chance)}`}
      >
        ~{chance}%
      </span>
    </div>
  );
}

function OverallChance({
  chances,
  locale,
}: {
  chances: number[];
  locale: string;
}) {
  const t = useTranslations("summary");
  if (chances.length === 0) return null;

  let probNone = 1;
  for (const pct of chances) {
    probNone *= 1 - pct / 100;
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
          {t("overallChance")}
        </div>
        <div className={`text-xs ${chanceTextColor(overallPct)}`}>
          {overallLabel}
        </div>
      </div>
      <svg width="48" height="48" viewBox="0 0 48 48" className="flex-shrink-0">
        <circle
          cx="24" cy="24" r="20"
          fill="none" stroke="currentColor" strokeWidth="5"
          className="text-bg-warm"
        />
        <circle
          cx="24" cy="24" r="20"
          fill="none" stroke="currentColor" strokeWidth="5"
          strokeDasharray={`${(overallPct / 100) * 125.6} 125.6`}
          strokeDashoffset="0" strokeLinecap="round"
          transform="rotate(-90 24 24)"
          className={chanceTextColor(overallPct)}
          style={{ transition: "stroke-dasharray 1s ease-out" }}
        />
      </svg>
    </div>
  );
}

function buildCrossSummary(
  results: SchoolResultState[],
  locale: string
): string {
  const completed = results.filter((r) => r.status === "done" && r.data);
  if (completed.length === 0) return "";

  const withRounds = completed.filter((r) => r.data!.current_offer_rounds > 0).length;
  const totalWlReports = completed.reduce((s, r) => s + r.data!.current_waitlisted_reports, 0);
  const totalWlAdmits = completed.reduce((s, r) => s + r.data!.current_wl_admits_so_far, 0);

  const validChances = completed
    .map((r) => ({ name: getDisplayName(r.data!.school, locale), chance: computeWlChance(r.data!) }))
    .filter((c) => c.chance != null) as { name: string; chance: number }[];

  const best = validChances.length > 0
    ? validChances.reduce((a, b) => (b.chance > a.chance ? b : a))
    : null;

  if (locale === "zh") {
    let s = `${completed.length} 所学校中，${withRounds} 所已有本季 offer 轮次。`;
    if (totalWlReports > 0) s += ` 共 ${totalWlReports} 条候补报告，${totalWlAdmits} 人已转正。`;
    if (best) s += ` ${best.name} 候补概率最高（~${best.chance}%）。`;
    return s;
  }

  let s = `${withRounds} of ${completed.length} schools have offer rounds this season.`;
  if (totalWlReports > 0) s += ` ${totalWlReports} WL reports total, ${totalWlAdmits} admitted so far.`;
  if (best) s += ` Best chance: ${best.name} (~${best.chance}%).`;
  return s;
}

export function SummaryPanel({ results }: { results: SchoolResultState[] }) {
  const t = useTranslations("summary");
  const locale = useLocale();

  const completed = results.filter((r) => r.status === "done" && r.data);
  if (completed.length === 0) return null;

  const totalTracked = completed.length;
  const activeRounds = completed.filter((r) => r.data!.current_offer_rounds > 0).length;
  const wlMovement = completed.filter((r) => r.data!.current_wl_admits_so_far > 0).length;

  const schoolChances = completed.map((r) => ({
    id: r.schoolId,
    school: r.data!.school,
    chance: computeWlChance(r.data!),
  }));

  const validChances = schoolChances
    .filter((s) => s.chance != null)
    .map((s) => s.chance as number);

  const crossSummary = buildCrossSummary(results, locale);

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
          <div className="text-xs text-text-secondary mt-1">{t("totalTracked")}</div>
        </div>
        <div className="text-center p-3 bg-surface border border-border rounded-xl shadow-card">
          <div className="text-2xl font-[family-name:var(--font-dm-mono)] text-teal tabular">
            <CountUp end={activeRounds} />
          </div>
          <div className="text-xs text-text-secondary mt-1">{t("activeRounds")}</div>
        </div>
        <div className="text-center p-3 bg-surface border border-border rounded-xl shadow-card">
          <div className="text-2xl font-[family-name:var(--font-dm-mono)] text-amber tabular">
            <CountUp end={wlMovement} />
          </div>
          <div className="text-xs text-text-secondary mt-1">{t("wlMovement")}</div>
        </div>
      </div>

      {/* Overall chance (only if at least one school has computable WL chance) */}
      {validChances.length > 0 && (
        <OverallChance chances={validChances} locale={locale} />
      )}

      {/* WL Chance bar chart */}
      {schoolChances.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4 shadow-card">
          <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">
            {t("bySchool")}
          </h3>
          <div className="space-y-0.5">
            {schoolChances
              .sort((a, b) => (b.chance ?? -1) - (a.chance ?? -1))
              .map((s) => (
                <ChanceBar
                  key={s.id}
                  school={s.school}
                  chance={s.chance}
                  locale={locale}
                />
              ))}
          </div>
        </div>
      )}

      {/* Cross-school synthesis summary */}
      {crossSummary && (
        <div className="p-4 bg-bg-warm rounded-xl">
          <p className="text-sm text-text leading-relaxed">{crossSummary}</p>
        </div>
      )}
    </div>
  );
}
