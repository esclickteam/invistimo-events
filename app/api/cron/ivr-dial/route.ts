import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import {
  executeIvrRound,
  listDueIvrRounds,
} from "@/lib/calls/ivrDialer";
import { getAppBaseUrl } from "@/lib/calls/ivrAudioStorage";
import { getCallRoundDateKeyInIsrael } from "@/lib/calls/callRoundScheduleTime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isAuthorized(req: NextRequest) {
  const cronSecret = cleanStr(process.env.CRON_SECRET);
  const auth = cleanStr(req.headers.get("authorization"));
  const headerSecret = cleanStr(req.headers.get("x-cron-secret"));

  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  if (cronSecret && headerSecret === cronSecret) return true;

  // Vercel cron sends Authorization: Bearer <CRON_SECRET> when configured.
  if (!cronSecret && process.env.NODE_ENV !== "production") return true;

  return false;
}

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    await db();

    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    const dateKey =
      cleanStr(url.searchParams.get("date")) ||
      getCallRoundDateKeyInIsrael(new Date());
    const maxCalls = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("maxCalls") || 40))
    );

    const baseUrl = getAppBaseUrl();
    const webhookUrl =
      process.env.TELNYX_IVR_WEBHOOK_URL ||
      (baseUrl ? `${baseUrl}/api/telnyx/ivr/webhook` : "");

    if (!webhookUrl) {
      return NextResponse.json(
        { ok: false, error: "IVR_WEBHOOK_URL_MISSING" },
        { status: 500 }
      );
    }

    const due = await listDueIvrRounds({ dateKey, force });
    const runs = [];

    for (const item of due) {
      const result = await executeIvrRound({
        due: item,
        webhookUrl,
        maxCalls,
      });
      runs.push(result);
    }

    return NextResponse.json({
      ok: true,
      dateKey,
      force,
      dueCount: due.length,
      liveDialEnabled: process.env.IVR_ALLOW_LIVE_DIAL === "true",
      testAllowlistConfigured: Boolean(
        cleanStr(process.env.IVR_TEST_PHONE_ALLOWLIST)
      ),
      runs,
    });
  } catch (error) {
    console.error("[ivr-dial] fatal", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "IVR_DIAL_FAILED",
      },
      { status: 500 }
    );
  }
}
