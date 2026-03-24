"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { AgentResult, DegreeType, SchoolResultState } from "@/lib/types";
import { CountUp } from "./count-up";
import { getDisplayName } from "@/lib/institution-utils";

const DEGREE_KEYS: DegreeType[] = ["bachelors", "masters", "phd", "mba", "jd", "md", "other"];

function translateDegree(raw: string, t: (key: string) => string): string {
  const key = raw.toLowerCase().trim();
  if (DEGREE_KEYS.includes(key as DegreeType)) {
    return t(`form.degrees.${key}`);
  }
  return raw;
}

function useRelativeTime(isoDate: string, locale: string): string {
  const [text, setText] = useState("");

  useEffect(() => {
    function compute() {
      const diffMs = Date.now() - new Date(isoDate).getTime();
      const diffMin = Math.floor(diffMs / 60_000);
      if (diffMin < 1) return locale === "zh" ? "不到 1 分钟" : "moments";
      if (diffMin < 60) return locale === "zh" ? `${diffMin} 分钟` : `${diffMin} min`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return locale === "zh" ? `${diffHr} 小时` : `${diffHr}h`;
      const diffDay = Math.floor(diffHr / 24);
      return locale === "zh" ? `${diffDay} 天` : `${diffDay}d`;
    }
    setText(compute());
  }, [isoDate, locale]);

  return text;
}

function useIsLive(isoDate: string): boolean {
  const [live, setLive] = useState(false);
  useEffect(() => {
    setLive(Date.now() - new Date(isoDate).getTime() < 3_600_000);
  }, [isoDate]);
  return live;
}

export function computeWlChance(data: AgentResult): number | null {
  const { historical_wl_admits_avg, current_wl_admits_so_far, est_total_wl_pool } = data;
  if (est_total_wl_pool <= 0 || historical_wl_admits_avg <= 0) return null;
  const remaining = historical_wl_admits_avg - current_wl_admits_so_far;
  if (remaining <= 0) return null;
  const chance = (remaining / est_total_wl_pool) * 100;
  return Math.min(100, Math.max(0, Math.round(chance)));
}

function SourceTags({ counts, locale }: { counts: AgentResult["source_counts"]; locale: string }) {
  const ordered =
    locale === "zh"
      ? [
          { key: "rednote", label: "小红书" },
          { key: "gradcafe", label: "Gradcafe" },
          { key: "reddit", label: "Reddit" },
          { key: "other", label: "Other" },
        ]
      : [
          { key: "reddit", label: "Reddit" },
          { key: "gradcafe", label: "Gradcafe" },
          { key: "rednote", label: "Rednote" },
          { key: "other", label: "Other" },
        ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {ordered.map(({ key, label }) => {
        const count = counts[key as keyof typeof counts];
        if (count === 0 && key === "other") return null;
        return (
          <span
            key={key}
            className="text-xs px-2 py-0.5 rounded-full bg-bg-warm text-text-secondary font-[family-name:var(--font-dm-mono)]"
          >
            {label} {count}
          </span>
        );
      })}
    </div>
  );
}

function StatRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between py-1.5">
      <span className="text-sm text-text-secondary">{label}</span>
      <span
        className={`text-sm font-[family-name:var(--font-dm-mono)] tabular ${
          muted ? "text-muted" : "text-text"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h4 className="text-xs font-medium text-amber uppercase tracking-wider mb-1 mt-3">
      {title}
    </h4>
  );
}

const SEARCH_PHASES_EN = [
  { icon: "🔍", text: "Searching Reddit..." },
  { icon: "📊", text: "Searching Gradcafe..." },
  { icon: "🌐", text: "Searching the web..." },
  { icon: "📱", text: "Checking 小红书..." },
  { icon: "🧹", text: "Filtering troll posts..." },
  { icon: "🧮", text: "Crunching numbers..." },
  { icon: "✨", text: "Almost done..." },
];

const SEARCH_PHASES_ZH = [
  { icon: "🔍", text: "搜索 Reddit..." },
  { icon: "📊", text: "搜索 Gradcafe..." },
  { icon: "🌐", text: "搜索全网数据..." },
  { icon: "📱", text: "搜索小红书..." },
  { icon: "🧹", text: "过滤钓鱼帖..." },
  { icon: "🧮", text: "分析数据中..." },
  { icon: "✨", text: "快好了..." },
];

export function SchoolResultCardSkeleton({
  school,
  program,
  degree,
}: {
  school: string;
  program: string;
  degree: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const displayName = getDisplayName(school, locale);

  const phases = locale === "zh" ? SEARCH_PHASES_ZH : SEARCH_PHASES_EN;
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIdx((prev) => (prev < phases.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, [phases.length]);

  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-card animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-[family-name:var(--font-dm-mono)] font-medium text-text">
            {displayName}
          </h3>
          {locale === "zh" && displayName !== school && (
            <p className="text-xs text-muted">{school}</p>
          )}
          <p className="text-sm text-text-secondary">
            {program} · {degree}
          </p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-soft text-amber font-medium animate-pulse">
          {t("card.live")}
        </span>
      </div>

      {/* Progress phases */}
      <div className="space-y-1.5 mb-4">
        {phases.map((phase, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-xs transition-all duration-300 ${
              i < phaseIdx
                ? "text-teal"
                : i === phaseIdx
                  ? "text-amber font-medium"
                  : "text-muted/40"
            }`}
          >
            <span className="w-4 text-center">
              {i < phaseIdx ? "✓" : i === phaseIdx ? phase.icon : "○"}
            </span>
            <span className={i === phaseIdx ? "animate-pulse" : ""}>
              {phase.text}
            </span>
          </div>
        ))}
      </div>

      {/* Skeleton bars */}
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex justify-between items-center py-1">
            <div className="h-3 bg-bg-warm rounded w-28 animate-pulse" />
            <div
              className="h-3 bg-bg-warm rounded w-16 animate-pulse"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-muted mt-3 italic">
        {t("loading.searching", { school: displayName, program: program || "", degree })}
      </p>
    </div>
  );
}

export function SchoolResultCard({ result }: { result: SchoolResultState }) {
  const t = useTranslations();
  const locale = useLocale();

  if (result.status === "loading") return null;

  if (result.status === "error") {
    return (
      <div className="bg-surface border border-coral/20 rounded-xl p-5 shadow-card animate-fade-in">
        <p className="text-sm text-coral">{t("errors.agentFailed")}</p>
      </div>
    );
  }

  const data = result.data!;
  const displaySchool = getDisplayName(data.school, locale);
  const isLive = useIsLive(data.last_fetched);
  const relTime = useRelativeTime(data.last_fetched, locale);
  const summary = locale === "zh" ? data.summary_zh : data.summary_en;

  const curRoundDate = data.current_latest_round_date
    ? new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(data.current_latest_round_date))
    : null;

  const wlChance = computeWlChance(data);

  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="font-[family-name:var(--font-dm-mono)] font-medium text-text">
            {displaySchool}
          </h3>
          {locale === "zh" && displaySchool !== data.school && (
            <p className="text-xs text-muted">{data.school}</p>
          )}
          <p className="text-sm text-text-secondary">
            {data.program} · {translateDegree(data.degree, t)} · {data.season}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-soft text-amber font-medium animate-pulse-amber">
              {t("card.live")}
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-bg-warm text-muted font-medium">
              {t("card.cached")}
            </span>
          )}
        </div>
      </div>

      {relTime && (
        <p className="text-xs text-muted mb-4">
          {t("card.lastUpdated", { time: relTime })}
        </p>
      )}

      {data.data_quality === "low" && (
        <div className="mb-3 px-3 py-2 bg-amber-soft rounded-lg text-xs text-amber-hover">
          ⚠ {locale === "zh" ? "数据有限，结果可能不完整" : "Limited data — results may be incomplete"}
        </div>
      )}

      {/* HISTORICAL SECTION */}
      <SectionHeader title={t("card.historicalSection")} />
      <div className="divide-y divide-border">
        <StatRow
          label={t("card.histOfferRounds")}
          value={<>~<CountUp end={data.historical_offer_rounds_avg} /></>}
        />
        <StatRow
          label={t("card.histAdmitted")}
          value={
            data.historical_admitted_avg
              ? `~${data.historical_admitted_avg.low}–${data.historical_admitted_avg.high}`
              : t("card.noDataFound")
          }
          muted={!data.historical_admitted_avg}
        />
        <StatRow
          label={t("card.histWaitlisted")}
          value={<>~<CountUp end={data.historical_waitlisted_avg} /></>}
        />
        <StatRow
          label={t("card.histWlAdmits")}
          value={<>~<CountUp end={data.historical_wl_admits_avg} /></>}
        />
        <StatRow
          label={t("card.histWlPct")}
          value={
            data.wl_to_admitted_historical_pct != null
              ? `~${data.wl_to_admitted_historical_pct}%`
              : t("card.noDataFound")
          }
          muted={data.wl_to_admitted_historical_pct == null}
        />
      </div>

      {/* THIS SEASON SECTION */}
      <SectionHeader title={t("card.thisSeasonSection", { season: data.season })} />
      <div className="divide-y divide-border">
        <StatRow
          label={t("card.curOfferRounds")}
          value={
            data.current_offer_rounds > 0
              ? <CountUp end={data.current_offer_rounds} />
              : t("card.noneReported")
          }
          muted={data.current_offer_rounds === 0}
        />
        <StatRow
          label={t("card.curLatestRound")}
          value={curRoundDate ?? t("card.noneReported")}
          muted={!curRoundDate}
        />
        <StatRow
          label={t("card.curWaitlisted")}
          value={
            data.current_waitlisted_reports > 0
              ? <CountUp end={data.current_waitlisted_reports} />
              : t("card.noneReported")
          }
          muted={data.current_waitlisted_reports === 0}
        />
        <StatRow
          label={t("card.curWlAdmits")}
          value={
            data.current_wl_admits_so_far > 0
              ? <CountUp end={data.current_wl_admits_so_far} />
              : t("card.noneReported")
          }
          muted={data.current_wl_admits_so_far === 0}
        />
      </div>

      {/* Prediction section */}
      <div className="mt-4 pt-3 border-t border-border">
        <h4 className="text-xs font-medium text-amber uppercase tracking-wider mb-2">
          {t("card.prediction")}
        </h4>
        <StatRow
          label={t("card.moreOffersBy")}
          value={(() => {
            const est = locale === "zh" ? (data.next_offer_estimate_zh || data.next_offer_estimate_en) : data.next_offer_estimate_en;
            return data.more_offers_expected && est ? est : t("card.noDataFound");
          })()}
          muted={!data.more_offers_expected || !(data.next_offer_estimate_en || data.next_offer_estimate_zh)}
        />
        <StatRow
          label={t("card.wlChance")}
          value={
            wlChance != null
              ? `~${wlChance}%`
              : t("card.wlChanceUnavailable")
          }
          muted={wlChance == null}
        />
      </div>

      {/* AI Summary */}
      {summary && (
        <div className="mt-4 p-3 bg-bg-warm rounded-lg">
          <p className="text-sm text-text leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Sources */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary font-medium">
            {t("card.sources")}:
          </span>
          <SourceTags counts={data.source_counts} locale={locale} />
        </div>
        <p className="text-xs text-muted">{t("card.sourceNote")}</p>
      </div>

      {/* Disclaimer */}
      <p className="mt-3 text-xs text-muted italic">⚠ {t("card.disclaimer")}</p>
    </div>
  );
}
