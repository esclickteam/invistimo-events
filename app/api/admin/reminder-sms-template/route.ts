import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  getReminderSmsBody,
  saveReminderSmsBody,
} from "@/lib/messages/reminderSmsSettings";
import { REMINDER_WITH_TABLE_SERVER_TEMPLATE } from "@/lib/messages/resolveReminderSmsTemplate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isMainAdmin(auth: Awaited<ReturnType<typeof getUserIdFromRequest>>) {
  return Boolean(
    auth &&
      auth.role === "admin" &&
      !auth.impersonated &&
      !auth.impersonatedByAdmin
  );
}

export async function GET() {
  try {
    await dbConnect();

    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await getReminderSmsBody();

    return NextResponse.json({
      success: true,
      reminderSmsBody: body,
      defaultBody: REMINDER_WITH_TABLE_SERVER_TEMPLATE,
      canEdit: isMainAdmin(auth),
    });
  } catch (err) {
    console.error("❌ GET reminder-sms-template:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (!isMainAdmin(auth)) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const payload = await req.json().catch(() => ({}));
    const reminderSmsBody =
      typeof payload?.reminderSmsBody === "string"
        ? payload.reminderSmsBody
        : "";

    const saved = await saveReminderSmsBody(reminderSmsBody);

    return NextResponse.json({
      success: true,
      reminderSmsBody: saved,
    });
  } catch (err) {
    console.error("❌ PUT reminder-sms-template:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
