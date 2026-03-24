import { getServerSupabase } from "./supabase";
import type { AgentResult } from "./types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function normalizeKey(school: string, program: string, degree: string, season: string) {
  return {
    school: school.trim(),
    program: program.trim().toLowerCase(),
    degree: degree.toLowerCase(),
    season: season.trim(),
  };
}

export async function getCached(
  school: string,
  program: string,
  degree: string,
  season: string
): Promise<{ data: AgentResult; fetchedAt: string } | null> {
  const key = normalizeKey(school, program, degree, season);
  const db = getServerSupabase();

  const { data, error } = await db
    .from("results_cache")
    .select("data, fetched_at")
    .eq("school", key.school)
    .eq("program", key.program)
    .eq("degree", key.degree)
    .eq("season", key.season)
    .single();

  if (error || !data) return null;

  const age = Date.now() - new Date(data.fetched_at).getTime();
  if (age > CACHE_TTL_MS) return null;

  return {
    data: data.data as AgentResult,
    fetchedAt: data.fetched_at,
  };
}

export async function setCache(
  school: string,
  program: string,
  degree: string,
  season: string,
  result: AgentResult
): Promise<void> {
  const key = normalizeKey(school, program, degree, season);
  const db = getServerSupabase();

  await db.from("results_cache").upsert(
    {
      school: key.school,
      program: key.program,
      degree: key.degree,
      season: key.season,
      data: result,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "school,program,degree,season" }
  );
}
