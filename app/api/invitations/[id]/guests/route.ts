import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import { nanoid } from "nanoid";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import mongoose from "mongoose";
import Event from "@/models/Event";


export const dynamic = "force-dynamic";

/* ============================================================
   POST — יצירת מוזמן חדש
============================================================ */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id?: string }> }
) {
  const { id: invitationId } = await context.params;

  try {
    await db();

    const auth = await getUserIdFromRequest();

if (!auth?.userId) {
  return NextResponse.json(
    { success: false, error: "UNAUTHORIZED" },
    { status: 401 }
  );
}

const userId = auth.userId;

    const { name, phone, relation, rsvp, guestsCount, tableNumber } =
      await req.json();

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: "Missing name or phone" },
        { status: 400 }
      );
    }

    /* ================= מציאת הזמנה או יצירת חדשה ================= */
    let invitation =
      (invitationId && (await Invitation.findById(invitationId))) ||
      (await Invitation.findOne({ ownerId: userId }));

    if (!invitation) {
  const user = await User.findById(userId).lean();
  const planLimit = user?.planLimits?.maxGuests || 100;

  console.log("🟡 No invitation found for user:", userId);

  // 1️⃣ למצוא Event קיים
  let event = await Event.findOne({ userId });
  console.log("🔎 Existing event:", event?._id);

  // 2️⃣ אם אין — ליצור אחד חדש
  if (!event) {
    const createdEvent = await Event.create({
      userId,
      email: user?.email || "noemail@placeholder.com",
      title: "אירוע חדש",
      eventType: "wedding",
      status: "active",
      date: new Date(),
      time: "00:00",
      maxGuests: planLimit,
      location: {},
    });

    event = createdEvent;
    console.log("✅ נוצר אירוע חדש:", event._id);
  }

  // 3️⃣ ודא שהאירוע באמת קיים
  if (!event?._id) {
    console.error("❌ event._id עדיין undefined!");
    return NextResponse.json(
      { success: false, error: "EVENT_CREATION_FAILED" },
      { status: 500 }
    );
  }

  // 4️⃣ עכשיו ליצור Invitation עם eventId תקין
  invitation = await Invitation.create({
    ownerId: userId,
    eventId: event._id, // ✅ החלק הקריטי
    title: "הזמנה חדשה",
    eventType: "wedding",
    eventDate: event.date || null,
    eventTime: event.time || "",
    canvasData: {},
    previewImage: "",
    shareId: nanoid(10),
    maxGuests: planLimit,
    sentSmsCount: 0,
    guests: [],
  });

  console.log("✅ Invitation created successfully with eventId:", event._id);
}



    /* ================= בדיקת כפילות ================= */
    const existing = await InvitationGuest.findOne({
      invitationId: invitation._id,
      phone,
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Guest already exists", guest: existing },
        { status: 409 }
      );
    }

    /* ================= בדיקת מכסת אורחים ================= */
    const guestsAgg = await InvitationGuest.aggregate([
      {
        $match: {
          invitationId: new mongoose.Types.ObjectId(invitation._id),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$guestsCount" },
        },
      },
    ]);

    const totalGuests = guestsAgg[0]?.total || 0;
    const incomingGuests =
      typeof guestsCount === "number" && guestsCount > 0
        ? guestsCount
        : 1;

    if (totalGuests + incomingGuests > invitation.maxGuests) {
      return NextResponse.json(
        {
          success: false,
          error: "הגעת למכסת האורחים המרבית בחבילה שלך",
          code: "MAX_GUESTS_REACHED",
          remaining: invitation.maxGuests - totalGuests,
        },
        { status: 403 }
      );
    }

    /* ================= יצירת המוזמן ================= */
    const guest = await InvitationGuest.create({
      invitationId: invitation._id,
      name,
      phone,
      relation: relation || "",
      rsvp: rsvp || "pending",
      guestsCount: incomingGuests,
      tableName: tableNumber ? `שולחן ${tableNumber}` : undefined,
      notes: "",
      token: nanoid(12),
    });

    invitation.guests.push(guest._id);
    await invitation.save();

    return NextResponse.json(
      { success: true, guest, invitationId: invitation._id },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ POST error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}


/* ============================================================
   GET — כל המוזמנים להזמנה
   ✅ כולל tableName + tableNumber
============================================================ */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: invitationId } = await context.params;

  try {
    await db();

    const guests = await InvitationGuest.find({ invitationId })
      .select(`
  _id
  name
  phone
  token
  rsvp
  guestsCount
  arrivedCount
  relation
  notes
  tableName
  tableNumber
  createdAt
`)

      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      guests: Array.isArray(guests) ? guests : [],
    });
  } catch (err) {
    console.error("❌ GET error:", err);
    return NextResponse.json(
      { success: false, error: "Failed loading guests" },
      { status: 500 }
    );
  }
}


/* ============================================================
   PUT — עדכון מוזמן (עם חסימת חריגה)
============================================================ */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: invitationId } = await context.params;
  const { guestId, guestsCount, ...updates } = await req.json();

  try {
    await db();

    if (!guestId) {
      return NextResponse.json(
        { success: false, error: "Missing guestId" },
        { status: 400 }
      );
    }

    const guest = await InvitationGuest.findOne({
      _id: guestId,
      invitationId,
    });

    if (!guest) {
      return NextResponse.json(
        { success: false, error: "Guest not found" },
        { status: 404 }
      );
    }

    if (typeof guestsCount === "number" && guestsCount > 0) {
      const guestsAgg = await InvitationGuest.aggregate([
        {
          $match: {
            invitationId: new mongoose.Types.ObjectId(invitationId),
            _id: { $ne: new mongoose.Types.ObjectId(guestId) },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$guestsCount" },
          },
        },
      ]);

      const totalGuests = guestsAgg[0]?.total || 0;
      const invitation = await Invitation.findById(invitationId);

      if (totalGuests + guestsCount > invitation.maxGuests) {
        return NextResponse.json(
          {
            success: false,
            error: "חרגת ממכסת האורחים בחבילה שלך",
          },
          { status: 403 }
        );
      }

      updates.guestsCount = guestsCount;
    }

    const updated = await InvitationGuest.findByIdAndUpdate(
      guestId,
      updates,
      { new: true }
    );

    return NextResponse.json({ success: true, guest: updated });
  } catch (err) {
    console.error("❌ PUT error:", err);
    return NextResponse.json(
      { success: false, error: "Update failed" },
      { status: 500 }
    );
  }
}

/* ============================================================
   DELETE — מחיקת מוזמן
============================================================ */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: invitationId } = await context.params;
  const { guestId } = await req.json();

  try {
    await db();

    if (!guestId) {
      return NextResponse.json(
        { success: false, error: "Missing guestId" },
        { status: 400 }
      );
    }

    const deleted = await InvitationGuest.findOneAndDelete({
      _id: guestId,
      invitationId,
    });

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Guest not found" },
        { status: 404 }
      );
    }

    await Invitation.findByIdAndUpdate(invitationId, {
      $pull: { guests: deleted._id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE error:", err);
    return NextResponse.json(
      { success: false, error: "Delete failed" },
      { status: 500 }
    );
  }
}
