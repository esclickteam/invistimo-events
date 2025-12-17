import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import { nanoid } from "nanoid";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* ============================================================
   POST — יצירת מוזמן חדש (גם אם אין הזמנה קיימת)
============================================================ */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id?: string }> }
) {
  const { id: invitationId } = await context.params;

  try {
    await db();

    const userId = await getUserIdFromRequest();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { name, phone, relation, rsvp, guestsCount, tableNumber } =
      await req.json();

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: "Missing name or phone" },
        { status: 400 }
      );
    }

    /* ================= מציאת ההזמנה או יצירת חדשה ================= */
    let invitation =
      (invitationId && (await Invitation.findById(invitationId))) ||
      (await Invitation.findOne({ ownerId: userId }));

    // אם אין בכלל הזמנה קיימת — ניצור אחת ריקה
    if (!invitation) {
      // שליפת פרטי המשתמש כדי לדעת את המגבלות מהמנוי שלו
      const user = await User.findById(userId).lean();
      const planLimit = user?.planLimits?.maxGuests || 100;

      console.log(`👤 יוצר הזמנה למשתמש ${user?.name || "לא מזוהה"} עם מגבלת ${planLimit} אורחים`);

      invitation = await Invitation.create({
        ownerId: userId,
        title: "הזמנה חדשה",
        eventType: "",
        eventDate: null,
        eventTime: "",
        eventLocation: "",
        canvasData: {},
        previewImage: "",
        shareId: nanoid(10),
        maxGuests: planLimit, // ✅ נקבע מהמנוי של המשתמש
        sentSmsCount: 0,
        guests: [],
      });

      console.log("✨ Invitation created automatically:", invitation._id);
    }

    // בדיקה אם כבר קיים מוזמן עם אותו טלפון
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

    // בדיקה אם לא עבר את מכסת האורחים
    const totalGuests = await InvitationGuest.countDocuments({
      invitationId: invitation._id,
    });
    if (totalGuests >= invitation.maxGuests) {
      return NextResponse.json(
        { success: false, error: "הגעת למכסת המוזמנים המרבית שלך" },
        { status: 403 }
      );
    }

    const token = nanoid(12);

    /* ================= יצירת המוזמן ================= */
    const guest = await InvitationGuest.create({
      invitationId: invitation._id,
      name,
      phone,
      relation: relation || "",
      rsvp: rsvp || "pending",
      guestsCount: guestsCount || 1,
      tableName: tableNumber ? `שולחן ${tableNumber}` : undefined,
      notes: "",
      token,
    });

    // עדכון רשימת האורחים בהזמנה
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
============================================================ */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: invitationId } = await context.params;

  try {
    await db();

    const guests = await InvitationGuest.find({ invitationId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, guests });
  } catch (err) {
    console.error("❌ GET error:", err);
    return NextResponse.json(
      { success: false, error: "Failed loading guests" },
      { status: 500 }
    );
  }
}

/* ============================================================
   PUT — עדכון מוזמן
============================================================ */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: invitationId } = await context.params;
  const { guestId, ...updates } = await req.json();

  try {
    await db();

    if (!guestId) {
      return NextResponse.json(
        { success: false, error: "Missing guestId" },
        { status: 400 }
      );
    }

    const updated = await InvitationGuest.findOneAndUpdate(
      { _id: guestId, invitationId },
      updates,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Guest not found" },
        { status: 404 }
      );
    }

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
