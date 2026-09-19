import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Event from "@/models/Event";
import { isValidCheckInTokenShape, buildCheckInQrPayload } from "@/lib/checkIn/token";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public QR image for a check-in token.
 * Reveals no PII — only renders the opaque token as QR.
 */
export async function GET(req: NextRequest) {
  try {
    const token = String(req.nextUrl.searchParams.get("t") || "").trim();
    if (!isValidCheckInTokenShape(token)) {
      return new NextResponse("Not found", { status: 404 });
    }

    await dbConnect();

    const guest = await InvitationGuest.findOne({ checkInToken: token })
      .select("invitationId checkInToken")
      .lean();

    if (!guest) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Only serve when event has check-in enabled
    const Invitation = (await import("@/models/Invitation")).default;
    const invitation = await Invitation.findById((guest as any).invitationId)
      .select("eventId")
      .lean();
    const eventId = invitation?.eventId ? String(invitation.eventId) : "";
    if (eventId) {
      const event = await Event.findById(eventId).select("checkInEnabled").lean();
      if (!(event as any)?.checkInEnabled) {
        return new NextResponse("Disabled", { status: 404 });
      }
    }

    const payload = buildCheckInQrPayload(token);
    const png = await QRCode.toBuffer(payload, {
      type: "png",
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#241A14", light: "#FFFDF8" },
    });

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("❌ GET check-in/qr:", err);
    return new NextResponse("Error", { status: 500 });
  }
}
