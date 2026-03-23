import type { AgentResult } from "./types";

export function generateMockResult(
  school: string,
  program: string,
  degree: string,
  season: string
): AgentResult {
  const rounds = Math.floor(Math.random() * 4) + 1;
  const wlReports = Math.floor(Math.random() * 20) + 2;
  const admitted = Math.floor(Math.random() * 40) + 15;

  return {
    school,
    program: program || "General",
    degree,
    season,
    offer_rounds: rounds,
    latest_round_date: "2026-03-18",
    estimated_total_admitted: {
      low: admitted,
      high: admitted + Math.floor(Math.random() * 20) + 5,
    },
    waitlisted_reports: wlReports,
    wl_to_admitted_historical_pct:
      Math.random() > 0.3 ? Math.floor(Math.random() * 25) + 5 : null,
    more_offers_expected: Math.random() > 0.3,
    next_offer_estimate:
      Math.random() > 0.3 ? "April 10 ± 2 weeks" : null,
    wl_chance_low: 10,
    wl_chance_high: 30,
    wl_chance_label: "Low–Medium",
    source_counts: {
      reddit: Math.floor(Math.random() * 15) + 1,
      gradcafe: Math.floor(Math.random() * 20) + 3,
      rednote: Math.floor(Math.random() * 5),
      other: Math.floor(Math.random() * 3),
    },
    rednote_available: Math.random() > 0.4,
    summary_en: `Based on ${wlReports} community reports, ${school}'s ${program} program has completed ${rounds} offer rounds so far this cycle. Waitlist movement appears moderate with some reports of admits from the waitlist in late March. The next wave is expected in mid-April.`,
    summary_zh: `根据 ${wlReports} 条社区报告，${school} 的 ${program} 项目本轮已发放 ${rounds} 轮 offer。候补名单有一定动态，3 月下旬有少量候补转正的报告。预计下一波 offer 将在 4 月中旬发出。`,
    data_quality: Math.random() > 0.7 ? "medium" : "high",
    last_fetched: new Date().toISOString(),
  };
}
