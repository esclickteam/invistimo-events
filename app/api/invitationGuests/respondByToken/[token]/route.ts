import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  return fallback;
}

function normalizeNotes(value: unknown): string {
  if (value === undefined) return "";

  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join(", ");
  }

  return "";
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  try {
    await db();

    const body = await req.json().catch(() => ({}));
    const { rsvp, notes, arrivedCount } = body;

    console.log("🟦 [respondByToken] token:", token);
    console.log("🟦 [respondByToken] body:", body);

    /* -------------------------------
       🔎 ולידציה ל-RSVP
    -------------------------------- */
    if (!rsvp || !["yes", "no", "pending"].includes(rsvp)) {
      return NextResponse.json(
        { success: false, error: "Invalid RSVP value" },
        { status: 400 }
      );
    }

    /* -------------------------------
       🔎 שליפת האורח
       חשוב:
       רק כדי לדעת שהוא קיים ולקחת guestsCount.
       לא עושים save() כדי לא להריץ validation על callRounds.
    -------------------------------- */
    const guest = await InvitationGuest.findOne({ token }).lean();

    if (!guest) {
      return NextResponse.json(
        { success: false, error: "Guest not found" },
        { status: 404 }
      );
    }

    console.log("🟨 BEFORE UPDATE:", {
      _id: guest._id.toString(),
      rsvp: guest.rsvp,
      status: guest.status,
      guestsCount: guest.guestsCount,
      arrivedCount: guest.arrivedCount,
      amount: guest.amount,
    });

    /* -------------------------------
       🔢 חישוב arrivedCount בלבד
       ❗ guestsCount לא נוגעים
       ❗ callRounds לא נוגעים
    -------------------------------- */
    let validatedArrivedCount = 0;

    if (rsvp === "yes") {
      if (arrivedCount !== undefined) {
        const n = toNumber(arrivedCount, Number(guest.guestsCount || 1));
        validatedArrivedCount = Math.max(1, n);
      } else {
        validatedArrivedCount = Number(guest.guestsCount || 1);
      }
    }

    if (rsvp === "no" || rsvp === "pending") {
      validatedArrivedCount = 0;
    }

    /* -------------------------------
       💾 עדכון
       חשוב:
       findOneAndUpdate + runValidators:false
       כדי שהיסטוריית callRounds ישנה לא תפיל RSVP.
    -------------------------------- */
    const updateSet: Record<string, unknown> = {
      rsvp,
      status: rsvp,
      arrivedCount: validatedArrivedCount,
      amount: validatedArrivedCount,
      updatedAt: new Date(),
    };

    if (notes !== undefined) {
      updateSet.notes = normalizeNotes(notes);
    }

    const fresh = await InvitationGuest.findOneAndUpdate(
      { token },
      {
        $set: updateSet,
      },
      {
        new: true,
        runValidators: false,
      }
    ).lean();

    console.log("🟩 AFTER UPDATE:", {
      _id: fresh?._id?.toString(),
      rsvp: fresh?.rsvp,
      status: fresh?.status,
      guestsCount: fresh?.guestsCount,
      arrivedCount: fresh?.arrivedCount,
      amount: fresh?.amount,
      notes: fresh?.notes,
    });

    return NextResponse.json(
      {
        success: true,
        guest: fresh,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ [respondByToken] error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Server error",
      },
      { status: 500 }
    );
  }
}