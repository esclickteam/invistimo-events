import { NextRequest, NextResponse } from "next/server";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import { requireIvrSession } from "@/lib/calls/ivrRequestAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REMOVED = {
  ok: false,
  error: "SELF_RECORDING_REMOVED",
  message:
    "הקלטה אישית אינה זמינה. השיחות המוקלטות משתמשות בקריינות AI לפי שם האירוע מפרטי האירוע. הקלטות שכבר בוצעו נשמרות.",
};

/**
 * Personal recording is no longer accepted.
 * Existing files stay in storage and are not deleted.
 */
async function rejectUpload(req: NextRequest) {
  const session = await requireIvrSession(req);
  if ("error" in session) {
    return NextResponse.json(
      { ok: false, error: session.error },
      { status: session.status }
    );
  }
  if (!session.user || !isIvrCallsUser(session.user)) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }
  return NextResponse.json(REMOVED, { status: 410 });
}

export async function POST(req: NextRequest) {
  return rejectUpload(req);
}

export async function DELETE(req: NextRequest) {
  return rejectUpload(req);
}
