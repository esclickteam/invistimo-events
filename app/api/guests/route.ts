import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import SeatingTable from "@/models/SeatingTable";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { Types } from "mongoose";
import crypto from "crypto";

export const dynamic = "force-dynamic";

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

type AuthLike = {
  userId?: string | Types.ObjectId;
  role?: string;
  impersonationRole?: string;
  impersonatedBy?: string | Types.ObjectId;
};

const RSVP_VALUES = new Set(["yes", "no", "pending"]);

function normalizeEffectiveRole(auth: AuthLike) {
  if (auth?.impersonationRole === "producer_staff") return "producer";
  return auth?.impersonationRole || auth?.role || "";
}

async function getMaxGuestsForOwner(ownerId: string) {
  const owner = await User.findById(ownerId).select("planLimits").lean();
  return owner?.planLimits?.maxGuests ?? 100;
}

async function getCurrentGuestsTotal(invitationId: string) {
  const agg = await InvitationGuest.aggregate([
    { $match: { invitationId: new Types.ObjectId(invitationId) } },
    { $group: { _id: null, total: { $sum: "$guestsCount" } } },
  ]);
  return agg?.[0]?.total ?? 0;
}

function sanitizePhone(raw?: string) {
  if (!raw) return "";
  return String(raw).replace(/[^\d]/g, "");
}

function createGuestToken() {
  return crypto.randomBytes(16).toString("hex");
}

/* ============================================
   GET — שליפת כל האורחים של היוזר (owner/producer)
============================================ */
export async function GET(req: NextRequest) {
  try {
    await db();
    console.log("✅ MongoDB connected");

    const auth = (await getUserIdFromRequest(req)) as AuthLike;
    console.log("🧪 AUTH DEBUG:", auth);

    if (!auth?.userId) {
      console.log("⛔ No auth");
      return NextResponse.json({ guests: [] });
    }

    const userId = auth.userId;

    /* ===============================
       הזמנות (לקוח + מפיק)
    =============================== */
    const invitations = await Invitation.find({
      $or: [{ ownerId: userId }, { producerId: userId }],
    })
      .select("_id eventId")
      .lean();

    console.log("📩 Invitations:", invitations.length);

    if (!invitations.length) {
      return NextResponse.json({ guests: [] });
    }

    const invitationIds = invitations.map((i) => i._id);
    const eventIds = invitations.map((i) => i.eventId).filter(Boolean);

    /* ===============================
       אורחים
    =============================== */
    const guests = await InvitationGuest.find({
      invitationId: { $in: invitationIds },
    }).lean();

    console.log("👥 Guests:", guests.length);

    /* ===============================
       הושבות – לפי EVENT ID
    =============================== */
    const seatings = (await SeatingTable.find({
      eventId: { $in: eventIds },
    }).lean()) as SeatingDoc[];

    console.log("🪑 Seatings:", seatings.length);

    /* ===============================
       חיבור אורח ← שולחן
    =============================== */
    let withTable = 0;

    const guestsWithTable = guests.map((guest: any) => {
      let tableName: string | null = null;

      const invitation = invitations.find(
        (i) => i._id.toString() === guest.invitationId.toString()
      );

      const seating = seatings.find(
        (s) => s.eventId?.toString() === invitation?.eventId?.toString()
      );

      if (seating?.tables?.length) {
        const table = seating.tables.find((t) =>
          t.seatedGuests?.some(
            (sg) => sg.guestId.toString() === guest._id.toString()
          )
        );

        if (table) {
          tableName = table.name || "-";
          withTable++;
        }
      }

      return {
        ...guest,
        actualArrivedCount: guest.actualArrivedCount ?? 0,
        tableName,
      };
    });

    console.log("✅ Guests with table:", withTable);

    return NextResponse.json({ guests: guestsWithTable });
  } catch (err) {
    console.error("🔥 ERROR in GET /api/guests:", err);
    return NextResponse.json({ guests: [] }, { status: 500 });
  }
}

/* ============================================
   POST — יצירת מוזמן חדש + הגבלת חבילה
============================================ */
export async function POST(req: NextRequest) {
  try {
    await db();

    const auth = (await getUserIdFromRequest(req)) as AuthLike;
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await req.json();

    const invitationId = String(data?.invitationId || "").trim();
    const name = String(data?.name || "").trim();
    const phone = sanitizePhone(data?.phone);
    const relation = typeof data?.relation === "string" ? data.relation.trim() : "";
    const notes = typeof data?.notes === "string" ? data.notes.trim() : "";
    const groupIdRaw = data?.groupId;
    const rsvpRaw = String(data?.rsvp || "pending");
    const guestsCountRaw = Number(data?.guestsCount ?? 1);

    if (!invitationId) {
      return NextResponse.json(
        { success: false, error: "Missing invitationId" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Missing guest name" },
        { status: 400 }
      );
    }

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    const effectiveRole = normalizeEffectiveRole(auth);

    const isOwner = auth.userId.toString() === invitation.ownerId.toString();
    const isAdmin = effectiveRole === "admin";
    const isProducerRole = effectiveRole === "producer";
    const isWorkerRole = effectiveRole === "worker";

    const producerIdStr = invitation.producerId?.toString?.() || null;
    const isProducerByInvitation =
      !!producerIdStr &&
      (auth.userId?.toString?.() === producerIdStr ||
        auth.impersonatedBy?.toString?.() === producerIdStr);

    if (
      !isOwner &&
      !isAdmin &&
      !isProducerRole &&
      !isWorkerRole &&
      !isProducerByInvitation
    ) {
      return NextResponse.json(
        { success: false, error: "Not authorized to create guest" },
        { status: 403 }
      );
    }

    // normalize fields
    const guestsCount = Number.isFinite(guestsCountRaw) && guestsCountRaw >= 1 ? guestsCountRaw : 1;

    const rsvp = RSVP_VALUES.has(rsvpRaw) ? rsvpRaw : "pending";
    const arrivedCount =
      typeof data?.arrivedCount === "number" && data.arrivedCount >= 0
        ? data.arrivedCount
        : rsvp === "yes"
        ? guestsCount
        : 0;

    // group normalize
    const cleanedGroupId =
      groupIdRaw === null ||
      groupIdRaw === undefined ||
      groupIdRaw === "" ||
      groupIdRaw === "null" ||
      groupIdRaw === "undefined"
        ? undefined
        : String(groupIdRaw).trim();

    /* ===============================
       הגבלת חבילה (לפי owner של ההזמנה)
       בודקים על SUM של guestsCount
    =============================== */
    const maxGuests = await getMaxGuestsForOwner(invitation.ownerId.toString());
    const currentTotalGuests = await getCurrentGuestsTotal(invitationId);
    const requestedTotalGuests = currentTotalGuests + guestsCount;

    if (requestedTotalGuests > maxGuests) {
      return NextResponse.json(
        {
          success: false,
          code: "PLAN_GUEST_LIMIT_EXCEEDED",
          error: `חרגת ממכסת החבילה. מותר עד ${maxGuests} מוזמנים.`,
          limit: maxGuests,
          currentTotal: currentTotalGuests,
          requestedTotal: requestedTotalGuests,
        },
        { status: 409 }
      );
    }

    const guest = await InvitationGuest.create({
      invitationId: invitation._id,
      name,
      phone,
      token: createGuestToken(),
      relation: relation || undefined,
      notes: notes || undefined,
      groupId: cleanedGroupId || undefined,
      rsvp,
      guestsCount,
      arrivedCount,
      actualArrivedCount: 0,
    });

    return NextResponse.json({ success: true, guest }, { status: 201 });
  } catch (err) {
    console.error("🔥 ERROR in POST /api/guests:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
