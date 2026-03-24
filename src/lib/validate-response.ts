import type { AgentResult } from "./types";

interface GroundingMetadata {
  webSearchQueries?: string[];
  searchEntryPoint?: { renderedContent?: string };
  groundingChunks?: { web?: { uri: string; title: string } }[];
  groundingSupports?: unknown[];
}

interface ValidationResult {
  result: AgentResult;
  warnings: string[];
}

const VALID_QUALITY = ["high", "medium", "low"] as const;

export function validateAgentResponse(
  raw: Record<string, unknown>,
  groundingMetadata: GroundingMetadata | null | undefined
): ValidationResult {
  const warnings: string[] = [];

  const hasGrounding =
    groundingMetadata &&
    ((groundingMetadata.groundingChunks?.length ?? 0) > 0 ||
      (groundingMetadata.webSearchQueries?.length ?? 0) > 0);

  if (!hasGrounding) {
    warnings.push("no_grounding");
  }

  const result: AgentResult = {
    school: str(raw.school, "Unknown"),
    program: str(raw.program, "Unknown"),
    degree: str(raw.degree, "Unknown"),
    season: str(raw.season, process.env.NEXT_PUBLIC_CURRENT_SEASON || "2026 Fall"),

    // Historical
    historical_offer_rounds_avg: clampNum(raw.historical_offer_rounds_avg, 0, 50, 0),
    historical_admitted_avg: parseRange(raw.historical_admitted_avg),
    historical_waitlisted_avg: clampNum(raw.historical_waitlisted_avg, 0, 9999, 0),
    historical_wl_admits_avg: clampNum(raw.historical_wl_admits_avg, 0, 9999, 0),
    wl_to_admitted_historical_pct: raw.wl_to_admitted_historical_pct != null
      ? clampNum(raw.wl_to_admitted_historical_pct, 0, 100, null)
      : null,

    // This season
    current_offer_rounds: clampNum(raw.current_offer_rounds, 0, 50, 0),
    current_latest_round_date: raw.current_latest_round_date
      ? String(raw.current_latest_round_date)
      : null,
    current_waitlisted_reports: clampNum(raw.current_waitlisted_reports, 0, 9999, 0),
    current_wl_admits_so_far: clampNum(raw.current_wl_admits_so_far, 0, 9999, 0),
    est_total_wl_pool: clampNum(raw.est_total_wl_pool, 0, 9999, 0),

    // Prediction
    more_offers_expected: Boolean(raw.more_offers_expected),
    next_offer_estimate_en: raw.next_offer_estimate_en
      ? String(raw.next_offer_estimate_en)
      : raw.next_offer_estimate ? String(raw.next_offer_estimate) : null,
    next_offer_estimate_zh: raw.next_offer_estimate_zh
      ? String(raw.next_offer_estimate_zh)
      : null,

    // Meta
    source_counts: {
      reddit: clampNum((raw.source_counts as Record<string, unknown>)?.reddit, 0, 9999, 0),
      gradcafe: clampNum((raw.source_counts as Record<string, unknown>)?.gradcafe, 0, 9999, 0),
      rednote: clampNum((raw.source_counts as Record<string, unknown>)?.rednote, 0, 9999, 0),
      other: clampNum((raw.source_counts as Record<string, unknown>)?.other, 0, 9999, 0),
    },
    rednote_available: Boolean(raw.rednote_available),
    summary_en: str(raw.summary_en, "No summary available."),
    summary_zh: str(raw.summary_zh, "暂无摘要。"),
    data_quality: validQuality(raw.data_quality),
    last_fetched: new Date().toISOString(),
  };

  // Sanity checks
  if (result.historical_offer_rounds_avg > 20) {
    warnings.push("suspicious_historical_rounds");
  }
  if (result.historical_admitted_avg && result.historical_admitted_avg.high > 5000) {
    warnings.push("suspicious_admitted_count");
  }
  if (result.current_wl_admits_so_far > result.est_total_wl_pool && result.est_total_wl_pool > 0) {
    result.current_wl_admits_so_far = result.est_total_wl_pool;
  }

  if (!hasGrounding) {
    result.data_quality = "low";
  }

  return { result, warnings };
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number;
function clampNum(v: unknown, min: number, max: number, fallback: null): number | null;
function clampNum(v: unknown, min: number, max: number, fallback: number | null): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function parseRange(v: unknown): { low: number; high: number } | null {
  if (!v || typeof v !== "object") return null;
  const obj = v as Record<string, unknown>;
  const low = Number(obj.low);
  const high = Number(obj.high);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  return { low: Math.max(0, Math.round(low)), high: Math.max(0, Math.round(high)) };
}

function validQuality(v: unknown): AgentResult["data_quality"] {
  if (typeof v === "string" && VALID_QUALITY.includes(v as typeof VALID_QUALITY[number])) {
    return v as AgentResult["data_quality"];
  }
  return "medium";
}
