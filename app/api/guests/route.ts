import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import SeatingTable from "@/models/SeatingTable";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

/* =========================================================
   Types
========================================================= */
type SeatedGuest = {
  guestId: Types.ObjectId;
  seatIndex: number;
};

type TableItem = {
  id: string;
  name?: string;
  seatedGuests?: SeatedGuest[];
};

type SeatingDoc = {
  eventId: Types.ObjectId;
  tables?: TableItem[];
};

type InvitationDoc = {
  _id: Types.ObjectId;
  eventId?: Types.ObjectId;
  ownerId?: Types.ObjectId;
  producerId?: Types.ObjectId;
};

type GuestDoc = {
  _id: Types.ObjectId;
  invitationId: Types.ObjectId;
  actualArrivedCount?: number;
  [key: string]: any;
};

/* =========================================================
   GET /api/guests
========================================================= */
export async function GET(req: NextRequest) {
  try {
    await db();
    console.log("✅ MongoDB connected");

    const auth = await getUserIdFromRequest();
    console.log("🧪 AUTH DEBUG:", auth);

    if (!auth?.userId) {
      console.log("⛔ No auth");
      return NextResponse.json({ guests: [], usage: null });
    }

    const userId = String(auth.userId);

    /* =========================================================
       🔹 אם יש invitation בפרמטרים — מחזיר רק אותה
    ========================================================= */
    const invitationId = req.nextUrl.searchParams.get("invitation");

    if (invitationId) {
      console.log("📌 Filtering by invitation:", invitationId);

      const invitation = (await Invitation.findById(invitationId)
        .select("_id ownerId producerId eventId")
        .lean()) as InvitationDoc | null;

      if (!invitation) {
        return NextResponse.json({ guests: [], usage: null });
      }

      const ownerId = invitation.ownerId?.toString();
      const producerId = invitation.producerId?.toString();

      if (ownerId !== userId && producerId !== userId) {
        return NextResponse.json({ guests: [], usage: null });
      }

      const guests = (await InvitationGuest.find({
        invitationId,
      }).lean()) as GuestDoc[];

      return NextResponse.json({
        guests,
        usage: null,
      });
    }

    /* =========================================================
       אם אין invitation — ממשיך ללוגיקה המקורית
    ========================================================= */

    const user = await User.findById(userId).select("guests").lean();
    const maxGuests = Number((user as any)?.guests || 0);

    const invitations = (await Invitation.find({
      $or: [{ ownerId: userId }, { producerId: userId }],
    })
      .select("_id eventId")
      .lean()) as InvitationDoc[];

    if (!invitations.length) {
      return NextResponse.json({
        guests: [],
        usage: {
          current: 0,
          limit: maxGuests,
          remaining: Math.max(0, maxGuests),
        },
      });
    }

    const invitationIds = invitations.map((i) => i._id);
    const eventIds = invitations
      .map((i) => i.eventId)
      .filter(Boolean) as Types.ObjectId[];

    const guests = (await InvitationGuest.find({
      invitationId: { $in: invitationIds },
    }).lean()) as GuestDoc[];

    const seatings = (await SeatingTable.find({
      eventId: { $in: eventIds },
    }).lean()) as SeatingDoc[];

    const invitationById = new Map<string, InvitationDoc>();
    for (const inv of invitations) {
      invitationById.set(inv._id.toString(), inv);
    }

    const eventGuestToTableMap = new Map<string, Map<string, string>>();

    for (const seating of seatings) {
      const eventKey = seating.eventId?.toString();
      if (!eventKey) continue;

      if (!eventGuestToTableMap.has(eventKey)) {
        eventGuestToTableMap.set(eventKey, new Map<string, string>());
      }

      const guestToTable = eventGuestToTableMap.get(eventKey)!;

      for (const table of seating.tables || []) {
        const tName = table.name || "-";
        for (const sg of table.seatedGuests || []) {
          guestToTable.set(sg.guestId.toString(), tName);
        }
      }
    }

    const guestsWithTable = guests.map((guest) => {
      let tableName: string | null = null;

      const invitation = invitationById.get(guest.invitationId.toString());
      const eventId = invitation?.eventId?.toString();

      if (eventId) {
        const guestToTable = eventGuestToTableMap.get(eventId);
        const found = guestToTable?.get(guest._id.toString());
        if (found) {
          tableName = found;
        }
      }

      return {
        ...guest,
        actualArrivedCount: guest.actualArrivedCount ?? 0,
        tableName,
      };
    });

    const current = guestsWithTable.length;
    const limit = maxGuests;
    const remaining = Math.max(0, limit - current);

    return NextResponse.json({
      guests: guestsWithTable,
      usage: {
        current,
        limit,
        remaining,
      },
    });
  } catch (err) {
    console.error("🔥 ERROR in /api/guests GET:", err);
    return NextResponse.json({ guests: [], usage: null });
  }
}

/* =========================================================
   POST — נשאר כמו שהיה
========================================================= */
export async function POST(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = String(auth.userId);
    const body = await req.json();

    const {
      invitationId,
      name,
      phone,
      side = "unknown",
      rsvpStatus = "pending",
      quantity = 1,
      notes = "",
      groupId = null,
      source = "manual",
      tags = [],
      actualArrivedCount = 0,
    } = body || {};

    if (!invitationId || !String(name || "").trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const invitation = (await Invitation.findById(invitationId)
      .select("_id ownerId producerId")
      .lean()) as InvitationDoc | null;

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    const ownerId = invitation.ownerId?.toString();
    const producerId = invitation.producerId?.toString();

    if (ownerId !== userId && producerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const user = await User.findById(userId).select("guests").lean();
    const limit = Number((user as any)?.guests || 0);
    const current = await InvitationGuest.countDocuments({ invitationId });

    if (current >= limit) {
      return NextResponse.json(
        {
          success: false,
          code: "GUEST_LIMIT_REACHED",
          error: `הגעת למכסה המותרת (${limit})`,
        },
        { status: 409 }
      );
    }

    const created = await InvitationGuest.create({
      invitationId,
      name: String(name).trim(),
      phone: phone ? String(phone).trim() : "",
      side,
      rsvpStatus,
      quantity: Number(quantity) || 1,
      notes,
      groupId,
      source,
      tags,
      actualArrivedCount: Number(actualArrivedCount) || 0,
    });

    return NextResponse.json({
      success: true,
      guest: created,
    });
  } catch (err: any) {
    console.error("🔥 ERROR in /api/guests POST:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
