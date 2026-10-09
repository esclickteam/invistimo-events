import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { resolveAuthUserId } from "@/lib/calls/ivrRequestAuth";
import User from "@/models/User";
import { buildIvrUserCallReportWorkbook } from "@/lib/calls/ivrCallReportExcel";
import {
  listUserIvrReportExport,
  listUserIvrReportPage,
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
    from: params.get("from") || "",
    to: params.get("to") || "",
    round: params.get("round") || "",
    callStatus: params.get("callStatus") || "",
    rsvp: params.get("rsvp") || "",
    q: params.get("q") || "",
    page: Number(params.get("page") || 1),
    pageSize: Number(params.get("pageSize") || 25),
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await context.params;
    const query = readQuery(req);
    const params = req.nextUrl.searchParams;

    if (params.get("format") === "xlsx") {
      const exported = await listUserIvrReportExport(id, query);
      const buffer = await buildIvrUserCallReportWorkbook(
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

    const page = await listUserIvrReportPage(id, query);
    return NextResponse.json({ ok: true, ...page });
  } catch (error) {
    console.error("[admin/users/ivr-call-report]", error);
    return NextResponse.json(
      { ok: false, error: "IVR_CALL_REPORT_FAILED" },
      { status: 500 }
    );
  }
}
