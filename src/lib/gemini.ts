import { GoogleGenAI } from "@google/genai";
import type { SchoolEntry, AgentResult } from "./types";

const PRIMARY_MODEL = "gemini-3-flash-preview";
const FALLBACK_MODEL = "gemini-2.5-flash";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY environment variable");
  client = new GoogleGenAI({ apiKey });
  return client;
}

function buildPrompt(entry: SchoolEntry): string {
  const prog = entry.program || "General";
  const seasonYear = entry.season.match(/\d{4}/)?.[0] ?? "2026";
  const prevYears = Array.from(
    { length: 5 },
    (_, i) => `${Number(seasonYear) - 1 - i}`,
  );

  return `You are a graduate admissions data analyst. Search the web for BOTH historical (past 5 years) and current season applicant reports about admission offers, waitlist activity, and outcomes for a specific program.

Target: ${entry.institution} — ${prog} — ${entry.degree} — ${entry.season}

YOU MUST USE GOOGLE SEARCH. Do NOT answer from memory. Search for real data.

=== SEARCH STRATEGY (search ALL sources for BOTH historical AND current season) ===

You MUST search EACH of these sources separately. Do not skip any.

GRADCAFE (thegradcafe.com) — has the MOST TROLLS, verify carefully:
- Search: "${entry.institution} ${prog}" site:thegradcafe.com
- Search: "${entry.institution} ${entry.degree}" site:thegradcafe.com
- Gradcafe has structured result entries but is notorious for fake/troll submissions. Cross-reference with Reddit and other sources before trusting any Gradcafe data point.
- Still count entries you found in source_counts.gradcafe — do NOT report 0 if you visited thegradcafe.com and found results.

REDDIT:
- Historical: "${entry.institution} ${prog} ${entry.degree} admitted waitlisted" site:reddit.com
- Current: "${entry.institution} ${prog} ${entry.degree} ${entry.season} waitlist offer" site:reddit.com

CHINESE SOURCES (小红书 / Rednote):
- "${entry.institution} ${prog} ${entry.season} offer 候补 录取"

GENERAL WEB:
- "${entry.institution} ${prog} ${entry.degree} acceptance rate waitlist"
- "${entry.institution} ${prog} graduate admissions statistics"

Historical data (past 5 years: ${prevYears.join(", ")}) provides baselines.
Current season (${entry.season}) data shows live progress. Both are needed.

=== SOURCE COUNTING (critical — be accurate) ===
Count how many distinct data points you found from each source:
- source_counts.gradcafe: number of Gradcafe result entries found (this should almost NEVER be 0 for well-known programs)
- source_counts.reddit: number of Reddit posts/comments with relevant info
- source_counts.rednote: number of 小红书 posts found
- source_counts.other: number of data points from other websites
If you visited a source and found data there, you MUST count it. Do not under-report.

=== TROLL & NOISE FILTERING ===
- IGNORE jokes, memes, sarcastic posts, posts with no specifics
- IGNORE Gradcafe entries with implausible stats (GPA 5.0, fake GRE scores)
- Cross-reference: trust reports corroborated by multiple sources
- When in doubt, exclude rather than include

=== RETURN FORMAT ===
Return ONLY valid JSON (no markdown fences, no explanation):
{
  "school": "${entry.institution}",
  "program": "${prog}",
  "degree": "${entry.degree}",
  "season": "${entry.season}",

  "historical_offer_rounds_avg": <number, MUST be > 0 — every program has offer rounds, estimate based on similar programs if exact data is sparse>,
  "historical_admitted_avg": { "low": <number>, "high": <number> },
  "historical_waitlisted_avg": <number, MUST be > 0 — estimate from acceptance rate, class size, and typical yield if direct WL data is unavailable>,
  "historical_wl_admits_avg": <number, MUST be > 0 — estimate from WL conversion rates of similar programs if direct data is unavailable>,
  "wl_to_admitted_historical_pct": <1-100, MUST be > 0 — derive from historical_wl_admits_avg / historical_waitlisted_avg, or estimate from similar programs>,

  "current_offer_rounds": <offer rounds reported so far THIS season, 0 if none found>,
  "current_latest_round_date": <ISO date of most recent round this season, or null>,
  "current_waitlisted_reports": <WL reports found this season, 0 if none>,
  "current_wl_admits_so_far": <people reported admitted off WL this season, 0 if none>,
  "est_total_wl_pool": <your estimate of total people on the waitlist this season — typically 2-5x the reported count. Estimate from program size and acceptance rate if no direct data. MUST be > 0>,

  "more_offers_expected": <boolean, based on historical timing patterns>,
  "next_offer_estimate_en": <string like "April 10 ± 2 weeks" in English, or null>,
  "next_offer_estimate_zh": <string like "4月10日前后两周" in natural Chinese, or null>,

  "source_counts": { "reddit": <n>, "gradcafe": <n>, "rednote": <n>, "other": <n> },
  "rednote_available": <boolean>,
  "summary_en": "<2 sentence summary: what historical data shows + current season status>",
  "summary_zh": "<same in natural spoken Chinese — 口语化，不要机器翻译腔>",
  "data_quality": "high" | "medium" | "low",
  "last_fetched": "${new Date().toISOString()}"
}

=== CRITICAL: NO ZEROS FOR HISTORICAL DATA ===
NEVER return 0 for historical fields (historical_offer_rounds_avg, historical_admitted_avg, historical_waitlisted_avg, historical_wl_admits_avg, wl_to_admitted_historical_pct, est_total_wl_pool).
Every graduate program admits students, has a waitlist, and has offer rounds. If you cannot find exact numbers:
1. Look at the program's acceptance rate, class size, application volume
2. Look at similar programs at peer institutions
3. Use typical ranges for the degree type (e.g. PhD programs: 5-15 admitted, Masters: 30-200+)
4. Provide your BEST ESTIMATE. We label estimates with ~ on the frontend — an educated guess is always better than "no data"
5. Set data_quality to "low" or "medium" to signal the estimate is rough

=== OTHER RULES ===
- historical_admitted_avg: ALWAYS provide this. Every program admits people — estimate from class size, acceptance rate, or peers.
- est_total_wl_pool: ALWAYS provide this. Typically 2-5x the reported count. Derive from applicant pool and acceptance rate if needed.
- current_* fields CAN be 0 — these represent actual current season observations, and it's valid that nothing has been reported yet.
- next_offer_estimate should be based on when historical rounds typically happened
- Paraphrase only — never reproduce posts verbatim
- summary_zh must sound natural, not machine-translated
- data_quality: "high" = multiple corroborating sources across years, "medium" = some data + estimates, "low" = mostly estimates`;
}

function isQuotaError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("429") ||
      msg.includes("quota") ||
      msg.includes("rate limit") ||
      msg.includes("resource exhausted") ||
      msg.includes("too many requests")
    );
  }
  return false;
}

function extractJSON(text: string): Record<string, unknown> {
  let cleaned = text.trim();

  // Strip markdown code fences if present
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  return JSON.parse(cleaned);
}

interface GeminiResult {
  raw: Record<string, unknown>;
  groundingMetadata: Record<string, unknown> | null;
}

async function callWithModel(
  entry: SchoolEntry,
  model: string,
): Promise<GeminiResult> {
  const ai = getClient();
  const prompt = buildPrompt(entry);

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");

  const raw = extractJSON(text);

  // Extract grounding metadata from the response object
  const responseAny = response as unknown as Record<string, unknown>;
  const candidates = responseAny.candidates as
    | Record<string, unknown>[]
    | undefined;
  const candidate = candidates?.[0] ?? null;
  const groundingMetadata =
    (candidate?.groundingMetadata as Record<string, unknown>) ?? null;

  return { raw, groundingMetadata };
}

export async function callGemini(entry: SchoolEntry): Promise<GeminiResult> {
  try {
    return await callWithModel(entry, PRIMARY_MODEL);
  } catch (error) {
    if (isQuotaError(error)) {
      console.error(
        `[gemini] Quota exceeded on ${PRIMARY_MODEL}, falling back to ${FALLBACK_MODEL}`,
      );
      try {
        return await callWithModel(entry, FALLBACK_MODEL);
      } catch (fallbackError) {
        if (isQuotaError(fallbackError)) {
          console.error("[gemini] Both models quota exhausted");
          throw new Error("quota_exhausted");
        }
        throw fallbackError;
      }
    }
    throw error;
  }
}
