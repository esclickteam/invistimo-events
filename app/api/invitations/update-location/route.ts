import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import mongoose from "mongoose";
import { prepareEventLocation } from "@/lib/eventLocation";
import { persistSharedIdentityMirror } from "@/lib/eventDetails/persistSharedIdentity";

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

    const prepared = await prepareEventLocation({
      input: location,
      previous: invitation.location,
    });

    if (!prepared.location.address && !prepared.location.name) {
      return NextResponse.json(
        { success: false, error: "INVALID_LOCATION" },
        { status: 400 }
      );
    }

    const {
      name,
      address,
      lat,
      lng,
      placeId,
      placeName,
      formattedAddress,
      wazeLat,
      wazeLng,
      wazeUrl,
    } = prepared.location;

    /* 💾 עדכון מיקום */
    invitation.location = {
      name: name || "",
      address,
      lat,
      lng,
      placeId: typeof placeId === "string" ? placeId.trim() : "",
      placeName: typeof placeName === "string" ? placeName.trim() : "",
      formattedAddress:
        typeof formattedAddress === "string" ? formattedAddress.trim() : "",
      wazeLat,
      wazeLng,
      wazeUrl: typeof wazeUrl === "string" ? wazeUrl.trim() : "",
    };

    await invitation.save();

    const eventIds = [
      invitation.eventId,
      invitation.productionEventId,
      invitation.linkedEventId,
    ]
      .map((value) => String(value || "").trim())
      .filter((value) => mongoose.Types.ObjectId.isValid(value));

    const uniqueEventIds = [...new Set(eventIds)];
    for (const eventId of uniqueEventIds) {
      await persistSharedIdentityMirror({
        source: "invitation",
        invitationId: String(invitation._id),
        eventId,
        incoming: {
          title: invitation.title,
          eventType: invitation.eventType,
          date: invitation.eventDate,
          time: invitation.eventTime,
          location: invitation.location || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      location: invitation.location,
      locationWarning: prepared.warning,
    });
  } catch (err) {
    console.error("UPDATE LOCATION ERROR:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
