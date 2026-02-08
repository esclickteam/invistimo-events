import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import { nanoid } from "nanoid";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import Event from "@/models/Event";
import { recalcGroupExpectedCount } from "@/lib/recalcGroupExpectedCount";

const HARD_GUEST_CAP = 10000;

export const dynamic = "force-dynamic";

/* ============================================================
   Helpers
============================================================ */
function normalizePhone(phone: unknown): string {
  return String(phone || "").replace(/\D/g, "").trim();
}

function normalizeGroupId(raw: unknown): string | null {
  if (
    raw === null ||
    raw === undefined ||
    raw === "" ||
    raw === "null" ||
    raw === "undefined"
  ) {
    return null;
  }
  const v = String(raw).trim();
  return v || null;
}

/* ============================================================
   POST — יצירת מוזמן חדש
   ✅ כולל:
   - אימות משתמש
   - הרשאה להזמנה
   - הגבלת מכסה לפי owner.guests
   - כפילות טלפון רק אם יש טלפון
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

    const userId = String(auth.userId);

    const userDoc = await User.findById(userId).select("createdByProducer").lean();
    const producerId = (userDoc as any)?.createdByProducer || null;

    const body = await req.json();
    const { name, phone, relation, rsvp, guestsCount, tableNumber, groupId } = body || {};

    const safeName = String(name || "").trim();
    const normalizedPhone = normalizePhone(phone);

    if (!safeName) {
      return NextResponse.json(
        { success: false, error: "Missing name" },
        { status: 400 }
      );
    }

    /* ================= מציאת הזמנה או יצירת חדשה ================= */
    let invitation =
      (invitationId &&
        (await Invitation.findOne({
          _id: invitationId,
          eventId: { $exists: true, $ne: null },
          $or: [{ ownerId: userId }, { producerId: userId }],
        }))) ||
      (await Invitation.findOne({
        ownerId: userId,
        eventId: { $exists: true, $ne: null },
      })) ||
      (await Invitation.findOne({
        producerId: userId,
        eventId: { $exists: true, $ne: null },
      }));

    if (!invitation) {
      const user = await User.findById(userId).lean();

      console.log("🟡 No invitation found for user:", userId);

      // 1️⃣ למצוא Event קיים
      let event = await Event.findOne({ userId });
      console.log("🔎 Existing event:", event?._id);

      // 2️⃣ אם אין — ליצור אחד חדש
      if (!event) {
        const createdEvent = await Event.create({
          userId,
          email: (user as any)?.email || "noemail@placeholder.com",
          title: "אירוע חדש",
          eventType: "wedding",
          status: "active",
          date: new Date(),
          time: "00:00",
          maxGuests: HARD_GUEST_CAP,
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
        producerId: producerId,
        eventId: event._id,
        title: "הזמנה חדשה",
        eventType: "wedding",
        eventDate: (event as any).date || null,
        eventTime: (event as any).time || "",
        canvasData: {},
        previewImage: "",
        shareId: nanoid(10),
        maxGuests: HARD_GUEST_CAP,
        sentSmsCount: 0,
        guests: [],
      });

      console.log("✅ Invitation created successfully with eventId:", event._id);
    }

    /* ================= הגבלת מכסה לפי owner.guests ================= */
    const ownerUserId = String((invitation as any).ownerId);
    const ownerUser = await User.findById(ownerUserId).select("guests").lean();
    const limit = Number((ownerUser as any)?.guests || 0);

    if (!limit || limit < 1) {
      return NextResponse.json(
        { success: false, error: "GUEST_LIMIT_NOT_CONFIGURED" },
        { status: 400 }
      );
    }

    const currentCount = await InvitationGuest.countDocuments({
      invitationId: (invitation as any)._id,
    });

    if (currentCount >= limit) {
      return NextResponse.json(
        {
          success: false,
          code: "GUEST_LIMIT_REACHED",
          error: `הגעת למכסה המותרת (${limit}) ולא ניתן להוסיף רשומה נוספת.`,
          usage: {
            current: currentCount,
            limit,
            remaining: 0,
          },
        },
        { status: 409 }
      );
    }

    /* ================= בדיקת כפילות (רק אם יש טלפון) ================= */
    if (normalizedPhone) {
      const existing = await InvitationGuest.findOne({
        invitationId: (invitation as any)._id,
        phone: normalizedPhone,
      });

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: "מוזמן עם מספר הטלפון הזה כבר קיים ברשימה",
            guest: existing,
          },
          { status: 409 }
        );
      }
    }

    const incomingGuests =
      typeof guestsCount === "number" && guestsCount > 0 ? guestsCount : 1;

    const normalizedGroupId = normalizeGroupId(groupId);

    /* ================= יצירת המוזמן ================= */
    const guest = await InvitationGuest.create({
      invitationId: (invitation as any)._id,
      name: safeName,
      phone: normalizedPhone || "",
      relation: String(relation || "").trim(),
      rsvp: ["yes", "no", "pending"].includes(String(rsvp)) ? rsvp : "pending",
      guestsCount: incomingGuests,
      ...(normalizedGroupId ? { groupId: normalizedGroupId } : {}),
      tableNumber:
        tableNumber !== null &&
        tableNumber !== undefined &&
        tableNumber !== "" &&
        Number.isFinite(Number(tableNumber))
          ? Number(tableNumber)
          : undefined,
      tableName:
        tableNumber !== null &&
        tableNumber !== undefined &&
        tableNumber !== "" &&
        Number.isFinite(Number(tableNumber))
          ? `שולחן ${Number(tableNumber)}`
          : undefined,
      notes: "",
      token: nanoid(12),
    });

    // ✅ עדכון expectedCount לקבוצה (אם האורח שייך לקבוצה)
    if ((guest as any).groupId) {
      await recalcGroupExpectedCount(String((guest as any).groupId));
    }

    (invitation as any).guests.push((guest as any)._id);

    if (!(invitation as any).eventId) {
      console.error("❌ Invitation without eventId blocked:", (invitation as any)._id);
      return NextResponse.json(
        { success: false, error: "INVITATION_INVALID" },
        { status: 500 }
      );
    }

    await (invitation as any).save();

    const newCurrent = currentCount + 1;

    return NextResponse.json(
      {
        success: true,
        guest,
        invitationId: (invitation as any)._id,
        usage: {
          current: newCurrent,
          limit,
          remaining: Math.max(0, limit - newCurrent),
        },
      },
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
   ✅ כולל usage (current/limit/remaining)
============================================================ */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const userId = String(auth.userId);

    const invitation = await Invitation.findOne({
      _id: invitationId,
      $or: [{ ownerId: userId }, { producerId: userId }],
    })
      .select("_id ownerId")
      .lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found or forbidden" },
        { status: 404 }
      );
    }

    const guests = await InvitationGuest.find({ invitationId })
      .select(`
  _id
  name
  phone
  token
  rsvp
  guestsCount
  arrivedCount
  actualArrivedCount
  relation
  notes
  tableName
  tableNumber
  createdAt
`)
      .sort({ createdAt: -1 })
      .lean();

    const ownerUser = await User.findById((invitation as any).ownerId)
      .select("guests")
      .lean();

    const limit = Number((ownerUser as any)?.guests || 0);
    const current = Array.isArray(guests) ? guests.length : 0;

    return NextResponse.json({
      success: true,
      guests: Array.isArray(guests) ? guests : [],
      usage: {
        current,
        limit,
        remaining: Math.max(0, limit - current),
      },
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
   PUT — עדכון מוזמן
============================================================ */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: invitationId } = await context.params;
  const { guestId, guestsCount, ...updates } = await req.json();

  try {
    await db();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = String(auth.userId);

    const invitation = await Invitation.findOne({
      _id: invitationId,
      $or: [{ ownerId: userId }, { producerId: userId }],
    })
      .select("_id")
      .lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

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

    // ✅ נרמול groupId כדי שלא יישמר null/""/"null"/"undefined"
    const normalizedUpdates: any = { ...updates };

    if ("groupId" in normalizedUpdates) {
      const cleaned = normalizeGroupId(normalizedUpdates.groupId);
      if (cleaned) {
        normalizedUpdates.groupId = cleaned;
      } else {
        delete normalizedUpdates.groupId;
      }
    }

    if ("phone" in normalizedUpdates) {
      normalizedUpdates.phone = normalizePhone(normalizedUpdates.phone);
    }

    if ("name" in normalizedUpdates) {
      normalizedUpdates.name = String(normalizedUpdates.name || "").trim();
    }

    const before = await InvitationGuest.findById(guestId).lean();

    const updated = await InvitationGuest.findByIdAndUpdate(
      guestId,
      {
        ...normalizedUpdates,
        ...(typeof guestsCount === "number" ? { guestsCount } : {}),
      },
      { new: true }
    ).lean();

    // ✅ אם השתנתה קבוצה / RSVP / guestsCount → מחשבים מחדש לקבוצה הישנה והחדשה
    const affected = new Set<string>();

    if ((before as any)?.groupId) affected.add(String((before as any).groupId));
    if ((updated as any)?.groupId) affected.add(String((updated as any).groupId));

    for (const gid of affected) {
      await recalcGroupExpectedCount(gid);
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

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = String(auth.userId);

    const invitation = await Invitation.findOne({
      _id: invitationId,
      $or: [{ ownerId: userId }, { producerId: userId }],
    })
      .select("_id")
      .lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

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

    // ✅ עדכון expectedCount לקבוצה אחרי מחיקה
    if ((deleted as any).groupId) {
      await recalcGroupExpectedCount(String((deleted as any).groupId));
    }

    await Invitation.findByIdAndUpdate(invitationId, {
      $pull: { guests: (deleted as any)._id },
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
