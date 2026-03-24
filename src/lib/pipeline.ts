import type { SchoolEntry, AgentResult } from "./types";
import { getCached, setCache } from "./cache";
import { callGemini } from "./gemini";
import { validateAgentResponse } from "./validate-response";
import { checkAndNotifyWatchers } from "./notify";

export interface PipelineResult {
  data: AgentResult;
  fromCache: boolean;
  warnings: string[];
}

export async function analyzeSchool(
  entry: SchoolEntry
): Promise<PipelineResult> {
  const season =
    entry.season || process.env.NEXT_PUBLIC_CURRENT_SEASON || "2026 Fall";

  // 1. Check cache
  const cached = await getCached(
    entry.institution,
    entry.program,
    entry.degree,
    season
  );

  if (cached) {
    return { data: cached.data, fromCache: true, warnings: [] };
  }

  // 2. Call Gemini (with automatic fallback to 2.5-flash on quota error)
  const { raw, groundingMetadata } = await callGemini(entry);

  // 3. Validate
  const { result, warnings } = validateAgentResponse(raw, groundingMetadata);

  // Override school/program/degree/season to match the original query
  // (Gemini may slightly rephrase them)
  result.school = entry.institution;
  result.program = entry.program || result.program;
  result.degree = entry.degree;
  result.season = season;
  result.last_fetched = new Date().toISOString();

  // 4. Store in cache
  try {
    await setCache(entry.institution, entry.program, entry.degree, season, result);
  } catch (err) {
    console.error("[pipeline] Cache write failed:", err);
  }

  // 5. Notify watchers (fire-and-forget, non-blocking)
  checkAndNotifyWatchers(result).catch((err) =>
    console.error("[pipeline] Notification check failed:", err)
  );

  return { data: result, fromCache: false, warnings };
}
