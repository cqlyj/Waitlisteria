import { Resend } from "resend";
import { getServerSupabase } from "./supabase";
import { buildNotificationEmail } from "./email-template";
import type { AgentResult } from "./types";

interface WatchlistRow {
  id: string;
  user_id: string;
  school: string;
  program: string;
  degree: string;
  season: string;
  lang: string;
  notify_email: boolean;
  last_known_data: {
    current_offer_rounds?: number;
    current_latest_round_date?: string | null;
    current_waitlisted_reports?: number;
    current_wl_admits_so_far?: number;
  } | null;
}

interface Change {
  field: string;
  fieldLabel: string;
  oldValue: string | number | null;
  newValue: string | number;
}

const FIELD_LABELS: Record<string, [string, string]> = {
  current_offer_rounds: ["Offer rounds", "录取轮次"],
  current_wl_admits_so_far: ["Admitted off WL", "候补录取人数"],
  current_waitlisted_reports: ["Waitlisted reports", "候补报告数"],
  current_latest_round_date: ["Latest round date", "最新轮次日期"],
};

function diffData(
  oldData: WatchlistRow["last_known_data"],
  newResult: AgentResult,
  lang: string
): Change[] | null {
  if (!oldData) return null;

  const changes: Change[] = [];

  const numericFields = [
    "current_offer_rounds",
    "current_wl_admits_so_far",
    "current_waitlisted_reports",
  ] as const;

  for (const field of numericFields) {
    const oldVal = oldData[field] ?? 0;
    const newVal = newResult[field] ?? 0;
    if (newVal > oldVal) {
      const labels = FIELD_LABELS[field];
      changes.push({
        field,
        fieldLabel: lang === "zh" ? labels[1] : labels[0],
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  const oldDate = oldData.current_latest_round_date ?? null;
  const newDate = newResult.current_latest_round_date ?? null;
  if (newDate && newDate !== oldDate) {
    const labels = FIELD_LABELS.current_latest_round_date;
    changes.push({
      field: "current_latest_round_date",
      fieldLabel: lang === "zh" ? labels[1] : labels[0],
      oldValue: oldDate,
      newValue: newDate,
    });
  }

  return changes.length > 0 ? changes : null;
}

function snapshotFromResult(result: AgentResult): WatchlistRow["last_known_data"] {
  return {
    current_offer_rounds: result.current_offer_rounds,
    current_latest_round_date: result.current_latest_round_date,
    current_waitlisted_reports: result.current_waitlisted_reports,
    current_wl_admits_so_far: result.current_wl_admits_so_far,
  };
}

/**
 * Check all watchers for a given school combo and send notifications
 * if the data has changed. Fire-and-forget from the pipeline.
 */
export async function checkAndNotifyWatchers(
  result: AgentResult
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  if (!apiKey) {
    console.warn("[notify] RESEND_API_KEY not set, skipping notifications");
    return;
  }

  const db = getServerSupabase();
  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const { data: watchers, error } = await db
    .from("watchlist")
    .select("id, user_id, school, program, degree, season, lang, notify_email, last_known_data")
    .eq("school", result.school)
    .eq("program", result.program || "")
    .eq("degree", result.degree)
    .eq("season", result.season);

  if (error) {
    console.error("[notify] Watchlist query error:", error.message);
    return;
  }
  if (!watchers || watchers.length === 0) {
    console.log(`[notify] No watchers for ${result.school} / ${result.program} / ${result.degree} / ${result.season}`);
    return;
  }
  console.log(`[notify] Found ${watchers.length} watcher(s) for ${result.school}`);

  const resend = new Resend(apiKey);
  const emailCache = new Map<string, string>();

  for (const watcher of watchers as WatchlistRow[]) {
    try {
      const changes = diffData(watcher.last_known_data, result, watcher.lang || "en");
      if (!changes) {
        console.log(`[notify] No changes for watcher ${watcher.id} (${watcher.school})`);
        continue;
      }
      console.log(`[notify] ${changes.length} change(s) detected for watcher ${watcher.id}:`, changes.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`));

      // Update last_known_data regardless of email preference
      await db
        .from("watchlist")
        .update({ last_known_data: snapshotFromResult(result) })
        .eq("id", watcher.id);

      if (!watcher.notify_email) continue;

      // Look up user email (cache across watchers for same user)
      let email = emailCache.get(watcher.user_id);
      if (!email) {
        const { data: userData } = await db.auth.admin.getUserById(watcher.user_id);
        email = userData?.user?.email ?? undefined;
        if (email) emailCache.set(watcher.user_id, email);
      }
      if (!email) continue;

      const { subject, html } = buildNotificationEmail({
        school: watcher.school,
        program: watcher.program,
        degree: watcher.degree,
        season: watcher.season,
        changes,
        lang: watcher.lang || "en",
        appUrl,
      });

      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject,
        html,
      });

      console.log(`[notify] Sent email to ${email} for ${watcher.school}`);
    } catch (err) {
      console.error(`[notify] Error processing watcher ${watcher.id}:`, err);
    }
  }
}
