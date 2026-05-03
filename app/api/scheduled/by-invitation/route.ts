import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";
import WhatsappQueue from "@/models/WhatsappQueue";

export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);

    const invitationId = searchParams.get("invitationId");
    const round = Number(searchParams.get("round"));

    if (!invitationId) {
      return NextResponse.json(
        { error: "Missing invitationId" },
        { status: 400 }
      );
    }

    const objectId = new mongoose.Types.ObjectId(invitationId);

    /* ================= 🔥 FETCH ALL ================= */

    const schedules = await WhatsappQueue.find({
      invitationId: objectId,
      status: { $in: ["scheduled", "sending"] },
    }).lean();

    /* ================= 🎯 PICK BY ROUND ================= */

    let schedule: any = null;

    if (schedules.length > 0) {
      if (round === 1) {
        schedule = schedules.find(
          (s: any) => s.templateName === "rsvp_invitation_media"
        );
      } else if (round === 2) {
        schedule = schedules.find(
          (s: any) => s.templateName === "rsvp_reminder_invistimo"
        );
      }

      // fallback אם לא נמצא לפי round
      if (!schedule) {
        schedule = schedules[0];
      }
    }

    /* ================= DEBUG ================= */

    console.log("FOUND schedules:", schedules);
    console.log("SELECTED schedule:", schedule);

    /* ================= RESPONSE ================= */

    return NextResponse.json({
      success: true,
      schedule: schedule || null,
    });

  } catch (err: any) {
    console.error("❌ by-invitation error:", err);

    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}