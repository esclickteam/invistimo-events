import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { resolveAuthUserId } from "@/lib/calls/ivrRequestAuth";
import User from "@/models/User";
import { buildIvrCallReportWorkbook } from "@/lib/calls/ivrCallReportExcel";
import {
  getIvrReportAttempt,
  listIvrReportExport,
  listIvrReportOptions,
  listIvrReportPage,
  summarizeIvrRounds,
  type IvrReportQuery,
} from "@/lib/calls/ivrCallReportQuery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function requireAdmin(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);
  const userId = resolveAuthUserId(auth);
  if (!userId) {
    return { error: "UNAUTHORIZED" as const, status: 401 as const };
  }
  await connectDB();
  const user = await User.findById(userId).select("_id role").lean();
  if (!user || String((user as { role?: string }).role) !== "admin") {
    return { error: "FORBIDDEN" as const, status: 403 as const };
  }
  return { userId };
}

function readQuery(req: NextRequest): IvrReportQuery {
  const params = req.nextUrl.searchParams;
  return {
    invitationId: params.get("invitationId") || "",
    userId: params.get("userId") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
    round: params.get("round") || "",
    direction: params.get("direction") || "",
    callStatus: params.get("callStatus") || "",
    rsvp: params.get("rsvp") || "",
    audioMode: params.get("audioMode") || "",
    outcome: params.get("outcome") || "",
    q: params.get("q") || "",
    page: Number(params.get("page") || 1),
    pageSize: Number(params.get("pageSize") || 50),
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }

    const params = req.nextUrl.searchParams;
    const query = readQuery(req);

    if (params.get("meta") === "1") {
      const options = await listIvrReportOptions();
      return NextResponse.json({ ok: true, ...options });
    }

    const attemptId = params.get("attemptId");
    if (attemptId) {
      const attempt = await getIvrReportAttempt(attemptId);
      if (!attempt) {
        return NextResponse.json(
          { ok: false, error: "NOT_FOUND" },
          { status: 404 }
        );
      }
      return NextResponse.json({ ok: true, attempt });
    }

    if (params.get("format") === "xlsx") {
      const exported = await listIvrReportExport(query);
      const buffer = await buildIvrCallReportWorkbook(
        exported.rows,
        exported.truncated
      );
      const filename = encodeURIComponent("דוח_שיחות_IVR.xlsx");
      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="ivr-call-report.xlsx"; filename*=UTF-8''${filename}`,
          "Cache-Control": "no-store",
        },
      });
    }

    const page = await listIvrReportPage(query);
    const rounds = query.invitationId
      ? await summarizeIvrRounds(query.invitationId)
      : [];
    return NextResponse.json({
      ok: true,
      ...page,
      rounds,
    });
  } catch (error) {
    console.error("[admin/ivr/call-report]", error);
    return NextResponse.json(
      { ok: false, error: "IVR_CALL_REPORT_FAILED" },
      { status: 500 }
    );
  }
}
