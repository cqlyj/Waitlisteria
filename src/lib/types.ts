export type DegreeType =
  | "bachelors"
  | "masters"
  | "phd"
  | "mba"
  | "jd"
  | "md"
  | "other";

export interface SchoolEntry {
  id: string;
  institution: string;
  program: string;
  degree: DegreeType;
  season: string;
}

export interface AgentResult {
  school: string;
  program: string;
  degree: string;
  season: string;

  // --- HISTORICAL (5-year average) ---
  historical_offer_rounds_avg: number;
  historical_admitted_avg: { low: number; high: number } | null;
  historical_waitlisted_avg: number;
  historical_wl_admits_avg: number;
  wl_to_admitted_historical_pct: number | null;

  // --- THIS SEASON ---
  current_offer_rounds: number;
  current_latest_round_date: string | null;
  current_waitlisted_reports: number;
  current_wl_admits_so_far: number;
  est_total_wl_pool: number;

  // --- PREDICTION (based on 5-year historical patterns) ---
  more_offers_expected: boolean;
  next_offer_estimate_en: string | null;
  next_offer_estimate_zh: string | null;

  // --- META ---
  source_counts: {
    reddit: number;
    gradcafe: number;
    rednote: number;
    other: number;
  };
  rednote_available: boolean;
  summary_en: string;
  summary_zh: string;
  data_quality: "high" | "medium" | "low";
  last_fetched: string;
}

export type SchoolResultStatus = "loading" | "done" | "error";

export interface SchoolResultState {
  schoolId: string;
  status: SchoolResultStatus;
  data?: AgentResult;
  fromCache?: boolean;
  error?: string;
}
