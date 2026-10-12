import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  customerExclusiveLockRequired,
  readSeatingMapVersion,
  runSeatingLockAction,
} from "@/lib/seating/editLockServer";
import {
  canSaveSeating,
  cleanString,
  findInvitationForSeating,
} from "@/lib/seating/seatingAccess";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

const ACTIONS = new Set([
  "acquire",
  "heartbeat",
  "activity",
  "release",
  "transfer",
  "revalidate",
]);

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "לא מחובר" },
        { status: 401 }
      );
    }

    const { eventId } = await context.params;
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "MISSING_EVENT_ID" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = cleanString(body?.action);
    if (!ACTIONS.has(action)) {
      return NextResponse.json(
        { success: false, error: "INVALID_ACTION" },
        { status: 400 }
      );
    }

    const invitationId = cleanString(body?.invitationId);
    const invitation = await findInvitationForSeating({
      eventId,
      invitationId,
    });
    const allowed = invitation
      ? await canSaveSeating({
          userId: String(auth.userId),
          eventId,
          invitationId: invitationId || String(invitation._id),
          invitation,
          auth,
        })
      : false;

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "אין הרשאה לעריכת הושבה" },
        { status: 403 }
      );
    }

    const exclusive = await customerExclusiveLockRequired(auth, eventId);
    if (!exclusive) {
      const mapVersion = await readSeatingMapVersion(eventId);
      return NextResponse.json({
        success: true,
        mode: "edit",
        collaborative: true,
        mapVersion,
      });
    }

    const result = await runSeatingLockAction({
      eventId,
      userId: String(auth.userId),
      action: action as
        | "acquire"
        | "heartbeat"
        | "activity"
        | "release"
        | "transfer"
        | "revalidate",
      screenInstanceId: cleanString(body?.screenInstanceId),
      lockId: cleanString(body?.editLockId || body?.lockId),
      generation: Number(body?.lockGeneration ?? body?.generation),
      baseMapVersion: Number(body?.baseMapVersion ?? body?.mapVersion),
      confirmed: body?.confirmed === true,
      recordActivity: body?.recordActivity !== false,
    });

    const status = result.mode === "edit" || result.mode === "view" || result.success
      ? 200
      : result.code === "LOCK_REQUIRED"
        ? 400
        : 409;

    return NextResponse.json(result, { status });
  } catch (error: any) {
    console.error("seating edit lock error", error);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: "שגיאת שרת בנעילת ההושבה" },
      { status: 500 }
    );
  }
}
