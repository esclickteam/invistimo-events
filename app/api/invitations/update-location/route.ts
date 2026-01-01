import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

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

    const { name, address, lat, lng } = location;

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
