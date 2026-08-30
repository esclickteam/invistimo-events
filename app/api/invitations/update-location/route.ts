import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { parseCoord } from "@/lib/navigationLinks";
import Event from "@/models/Event";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    /* 🔐 זיהוי משתמש */
    const auth = await getUserIdFromRequest();

if (!auth?.userId) {
  return NextResponse.json(
    { success: false, error: "UNAUTHORIZED" },
    { status: 401 }
  );
}

const userId = auth.userId;

    /* 📦 נתונים מהטופס */
    const { invitationId, location } = await req.json();

    if (!invitationId || !location) {
      return NextResponse.json(
        { success: false, error: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    const { name, address } = location;
    const lat = parseCoord(location.lat);
    const lng = parseCoord(location.lng);

    if (!address || lat == null || lng == null) {
      return NextResponse.json(
        { success: false, error: "INVALID_LOCATION" },
        { status: 400 }
      );
    }

    /* 🔎 בדיקת בעלות */
    const invitation = await Invitation.findOne({
      _id: invitationId,
      ownerId: userId,
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* 💾 עדכון מיקום */
    invitation.location = {
      name: name || "",
      address,
      lat,
      lng,
    };

    await invitation.save();

    const eventIds = [
      invitation.eventId,
      invitation.productionEventId,
      invitation.linkedEventId,
    ]
      .map((value) => String(value || "").trim())
      .filter((value) => mongoose.Types.ObjectId.isValid(value));

    if (eventIds.length) {
      await Event.updateOne(
        {
          _id: { $in: eventIds.map((id) => new mongoose.Types.ObjectId(id)) },
        },
        {
          $set: {
            "location.address": address,
            "location.lat": lat,
            "location.lng": lng,
            updatedAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      location: invitation.location,
    });
  } catch (err) {
    console.error("UPDATE LOCATION ERROR:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
