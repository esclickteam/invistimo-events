import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  buildPasswordSmsMessage,
  createUserPasswordLink,
  type PasswordLinkPurpose,
} from "@/lib/admin/createUserPasswordLink";
import { connectDB } from "@/lib/db";
import { assertExternalSendAllowed } from "@/lib/env/externalSends";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { sendSMS } from "@/lib/sendSMS";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

function parsePurpose(value: unknown): PasswordLinkPurpose | null {
  if (value === "setup" || value === "reset") return value;
  return null;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    if (!isAdminContext(auth)) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const { id: userId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const action = body?.action === "sms" ? "sms" : "create";
    const purpose = parsePurpose(body?.purpose);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "MISSING_USER_ID" },
        { status: 400 },
      );
    }

    if (action === "sms") {
      const phone = String(body?.phone || "").trim();
      const shortLink = String(body?.shortLink || body?.link || "").trim();
      const smsPurpose = purpose || "reset";

      if (!phone) {
        return NextResponse.json(
          { success: false, error: "MISSING_PHONE" },
          { status: 400 },
        );
      }

      if (!shortLink) {
        return NextResponse.json(
          { success: false, error: "MISSING_LINK" },
          { status: 400 },
        );
      }

      const gate = assertExternalSendAllowed({
        channel: "sms",
        to: phone,
      });

      if (!gate.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: "EXTERNAL_SENDS_BLOCKED",
            reason: gate.reason,
          },
          { status: 403 },
        );
      }

      await sendSMS({
        to: phone,
        message: buildPasswordSmsMessage(smsPurpose, shortLink),
      });

      return NextResponse.json({
        success: true,
        smsSent: true,
        phone,
        shortLink,
        purpose: smsPurpose,
      });
    }

    if (!purpose) {
      return NextResponse.json(
        { success: false, error: "INVALID_PURPOSE" },
        { status: 400 },
      );
    }

    const result = await createUserPasswordLink({ userId, purpose });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message === "USER_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    console.error("ADMIN PASSWORD LINK FAILED:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message },
      { status: 500 },
    );
  }
}
