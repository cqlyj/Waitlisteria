import type { AgentResult } from "./types";

export function generateMockResult(
  school: string,
  program: string,
  degree: string,
  season: string
): AgentResult {
  const histRounds = Math.floor(Math.random() * 4) + 1;
  const histAdmittedLow = Math.floor(Math.random() * 40) + 15;
  const histWl = Math.floor(Math.random() * 20) + 5;
  const histWlAdmits = Math.floor(Math.random() * 10) + 2;
  const curRounds = Math.floor(Math.random() * 3);
  const curWl = Math.floor(Math.random() * 15);
  const curWlAdmits = Math.floor(Math.random() * histWlAdmits);
  const estPool = histWl + Math.floor(Math.random() * 30) + 10;

  return {
    school,
    program: program || "General",
    degree,
    season,

    historical_offer_rounds_avg: histRounds,
    historical_admitted_avg: {
      low: histAdmittedLow,
      high: histAdmittedLow + Math.floor(Math.random() * 20) + 5,
    },
    historical_waitlisted_avg: histWl,
    historical_wl_admits_avg: histWlAdmits,
    wl_to_admitted_historical_pct:
      Math.random() > 0.3 ? Math.floor(Math.random() * 25) + 5 : null,

    current_offer_rounds: curRounds,
    current_latest_round_date: curRounds > 0 ? "2026-03-18" : null,
    current_waitlisted_reports: curWl,
    current_wl_admits_so_far: curWlAdmits,
    est_total_wl_pool: estPool,

    more_offers_expected: Math.random() > 0.3,
    next_offer_estimate_en: Math.random() > 0.3 ? "April 10 ± 2 weeks" : null,
    next_offer_estimate_zh: Math.random() > 0.3 ? "4月10日前后两周" : null,

    source_counts: {
      reddit: Math.floor(Math.random() * 15) + 1,
      gradcafe: Math.floor(Math.random() * 20) + 3,
      rednote: Math.floor(Math.random() * 5),
      other: Math.floor(Math.random() * 3),
    },
    rednote_available: Math.random() > 0.4,
    summary_en: `Based on 5-year data, ${school}'s ${program} program averages ${histRounds} offer rounds. This season: ${curRounds} rounds reported, ${curWl} waitlisted. WL movement is moderate.`,
    summary_zh: `根据近5年数据，${school} ${program} 项目平均每年 ${histRounds} 轮 offer。本季已报 ${curRounds} 轮，${curWl} 人候补，候补动态适中。`,
    data_quality: Math.random() > 0.7 ? "medium" : "high",
    last_fetched: new Date().toISOString(),
  };
}
