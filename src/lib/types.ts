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
  offer_rounds: number;
  latest_round_date: string | null;
  estimated_total_admitted: { low: number; high: number } | null;
  waitlisted_reports: number;
  wl_to_admitted_historical_pct: number | null;
  more_offers_expected: boolean;
  next_offer_estimate: string | null;
  wl_chance_low: number;
  wl_chance_high: number;
  wl_chance_label:
    | "Low"
    | "Low–Medium"
    | "Medium"
    | "Medium–High"
    | "High";
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
