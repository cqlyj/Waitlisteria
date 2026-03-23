"use client";

import { useTranslations, useLocale } from "next-intl";
import type { AgentResult, SchoolResultState } from "@/lib/types";
import { CountUp } from "./count-up";
import { getDisplayName } from "@/lib/institution-utils";

function relativeTime(isoDate: string, locale: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return locale === "zh" ? "刚刚" : "just now";
  if (diffMin < 60)
    return locale === "zh" ? `${diffMin} 分钟` : `${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)
    return locale === "zh" ? `${diffHr} 小时` : `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return locale === "zh" ? `${diffDay} 天` : `${diffDay}d`;
}

function SourceTags({
  counts,
  locale,
}: {
  counts: AgentResult["source_counts"];
  locale: string;
}) {
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
          ···
        </span>
      </div>

      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex justify-between items-center py-1.5">
            <div className="h-3 bg-bg-warm rounded w-28 animate-pulse" />
            <div
              className="h-3 bg-bg-warm rounded w-16 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-muted mt-4 italic">
        {t("loading.searching", {
          school,
          program: program || "",
          degree,
        })}
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
  const isLive =
    (Date.now() - new Date(data.last_fetched).getTime()) < 3_600_000;
  const summary = locale === "zh" ? data.summary_zh : data.summary_en;

  const formattedDate = data.latest_round_date
    ? new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(data.latest_round_date))
    : null;

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
            {data.program} · {data.degree} · {data.season}
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

      <p className="text-xs text-muted mb-4">
        {t("card.lastUpdated", { time: relativeTime(data.last_fetched, locale) })}
      </p>

      {data.data_quality === "low" && (
        <div className="mb-3 px-3 py-2 bg-amber-soft rounded-lg text-xs text-amber-hover">
          ⚠ Limited data — results may be incomplete
        </div>
      )}

      {/* Stats */}
      <div className="divide-y divide-border">
        <StatRow
          label={t("card.offerRounds")}
          value={<CountUp end={data.offer_rounds} />}
        />
        <StatRow
          label={t("card.latestRound")}
          value={formattedDate ?? t("card.insufficientData")}
          muted={!formattedDate}
        />
        <StatRow
          label={t("card.estAdmitted")}
          value={
            data.estimated_total_admitted
              ? `~${data.estimated_total_admitted.low}–${data.estimated_total_admitted.high}`
              : t("card.insufficientData")
          }
          muted={!data.estimated_total_admitted}
        />
        <StatRow
          label={t("card.waitlistedReports")}
          value={<CountUp end={data.waitlisted_reports} />}
        />
        <StatRow
          label={t("card.wlHistorical")}
          value={
            data.wl_to_admitted_historical_pct != null
              ? `~${data.wl_to_admitted_historical_pct}%`
              : t("card.insufficientData")
          }
          muted={data.wl_to_admitted_historical_pct == null}
        />
      </div>

      {/* Prediction section */}
      <div className="mt-4 pt-3 border-t border-border">
        <h4 className="text-xs font-medium text-amber uppercase tracking-wider mb-2">
          {t("card.prediction")}
        </h4>
        <StatRow
          label={t("card.moreOffersBy")}
          value={data.next_offer_estimate ?? t("card.insufficientData")}
          muted={!data.next_offer_estimate}
        />
        <StatRow
          label={t("card.wlChance")}
          value={
            data.wl_chance_label !== "Low" || data.wl_chance_low > 0
              ? `${data.wl_chance_label} (${data.wl_chance_low}–${data.wl_chance_high}%)`
              : t("card.insufficientData")
          }
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
      <p className="mt-3 text-xs text-muted italic">
        ⚠ {t("card.disclaimer")}
      </p>
    </div>
  );
}
