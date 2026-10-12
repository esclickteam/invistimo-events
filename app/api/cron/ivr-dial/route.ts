import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import {
  executeIvrRound,
  listDueIvrRounds,
} from "@/lib/calls/ivrDialer";
import { continueKosherMessageDials } from "@/lib/kosherPhones/dispatch";
import { KOSHER_MESSAGE_ROUND_ORIGIN } from "@/lib/kosherPhones/match";
import IvrCallAttempt from "@/models/IvrCallAttempt";
import {
  countActiveOutboundByUser,
  countActiveOutboundCalls,
  ivrDialTickBudget,
  planFairDialGrants,
} from "@/lib/calls/ivrCapacity";
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
    const requestedCap = Number(url.searchParams.get("maxCalls") || 0);

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
    const active = await countActiveOutboundCalls();
    const activeByUser = await countActiveOutboundByUser();
    let budget = ivrDialTickBudget(active);
    if (requestedCap > 0) budget = Math.min(budget, Math.floor(requestedCap));

    const kosherGroups = await IvrCallAttempt.aggregate([
      { $match: { origin: KOSHER_MESSAGE_ROUND_ORIGIN, status: "queued" } },
      { $group: { _id: "$userId", n: { $sum: 1 } } },
    ]);

    const sources = [
      ...due.map((item) => ({
        id: `ivr:${item.userId}:${item.round}`,
        waiting: Math.max(1, budget),
        active: activeByUser.get(item.userId) || 0,
      })),
      ...kosherGroups.map((group: { _id?: unknown; n?: unknown }) => ({
        id: `kosher:${String(group._id || "")}`,
        waiting: Number(group.n) || 0,
        active: activeByUser.get(String(group._id || "")) || 0,
      })),
    ];
    const grants = planFairDialGrants({ budget, sources });
    const runs = [];

    for (const item of due) {
      const maxCalls = grants[`ivr:${item.userId}:${item.round}`] || 0;
      if (maxCalls < 1) continue;
      const result = await executeIvrRound({
        due: item,
        webhookUrl,
        maxCalls,
      });
      runs.push(result);
    }

    const kosherMax = Object.entries(grants).reduce(
      (sum, [id, count]) => (id.startsWith("kosher:") ? sum + count : sum),
      0
    );
    const kosherContinuation = kosherMax
      ? await continueKosherMessageDials({
          maxCalls: kosherMax,
        }).catch((error) => {
          console.error("[ivr-dial] kosher continuation failed", error);
          return { dialed: 0, failed: 0, error: "KOSHER_CONTINUATION_FAILED" };
        })
      : { dialed: 0, failed: 0 };

    return NextResponse.json({
      ok: true,
      dateKey,
      force,
      dueCount: due.length,
      kosherContinuation,
      liveDialEnabled: process.env.IVR_ALLOW_LIVE_DIAL === "true",
      testAllowlistConfigured: Boolean(
        cleanStr(process.env.IVR_TEST_PHONE_ALLOWLIST)
      ),
      runs,
    });
  } catch (error) {
    console.error("[ivr-dial] fatal", error);
    try {
      const { recordSystemError } = await import("@/lib/customerNotifications/liveEvents");
      await recordSystemError("ivr-dial");
    } catch (notifyError) {
      console.error("system notification failed", notifyError);
    }
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "IVR_DIAL_FAILED",
      },
      { status: 500 }
    );
  }
}
