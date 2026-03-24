import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { analyzeSchool } from "@/lib/pipeline";
import type { SchoolEntry } from "@/lib/types";

interface AnalyzeRequest {
  schools: SchoolEntry[];
  locale: "en" | "zh";
}

function sseMessage(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  // Rate limit
  const ip = getClientIp(request);
  const { allowed, remaining, retryAfterMs } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((retryAfterMs ?? 3600000) / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // Parse body
  let body: AnalyzeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { schools } = body;
  if (!Array.isArray(schools) || schools.length === 0 || schools.length > 10) {
    return NextResponse.json(
      { error: "Provide 1–10 schools" },
      { status: 400 }
    );
  }

  for (const s of schools) {
    if (!s.institution?.trim()) {
      return NextResponse.json(
        { error: "Each school must have an institution name" },
        { status: 400 }
      );
    }
  }

  // SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(sseMessage(data)));
        } catch {
          // Stream may have been closed by the client
        }
      };

      const promises = schools.map(async (entry) => {
        try {
          const result = await analyzeSchool(entry);
          enqueue({
            type: "result",
            schoolId: entry.id,
            data: result.data,
            fromCache: result.fromCache,
          });
        } catch (error) {
          const isQuota =
            error instanceof Error && error.message === "quota_exhausted";

          console.error(
            `[analyze] Error for ${entry.institution}:`,
            error instanceof Error ? error.message : error
          );

          enqueue({
            type: "error",
            schoolId: entry.id,
            message: isQuota
              ? "Service temporarily unavailable. The admin has been notified."
              : "Search failed. Please try again.",
            isQuotaError: isQuota,
          });
        }
      });

      await Promise.allSettled(promises);
      enqueue({ type: "done" });

      try {
        controller.close();
      } catch {
        // Already closed
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-RateLimit-Remaining": String(remaining),
    },
  });
}
