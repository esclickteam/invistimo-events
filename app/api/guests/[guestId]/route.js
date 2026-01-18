import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

/* =========================
   Allowed fields per role
========================= */

// זמנית – בלי אימות, נאכוף לפי role בצד לקוח
const CLIENT_FIELDS = [
  "name",
  "phone",
  "relation",
  "guestsCount",
];

const PRODUCER_FIELDS = [
  "arrivalStatus", // arrived | not-arrived | cancelled
  "table",
  "notes",
];

export async function PATCH(req, { params }) {
  try {
    await connectDB();

    const { guestId } = params;
    const body = await req.json();

    const guest = await InvitationGuest.findById(guestId);
    if (!guest) {
      return NextResponse.json(
        { error: "Guest not found" },
        { status: 404 }
      );
    }

    /**
     * ⚠️ שליטה רכה – זמנית ללא auth
     * כרגע אנחנו סומכים על ה־UI שישלח
     * רק שדות מותרים לפי מסך
     *
     * אימות role יתווסף בהמשך
     */

    const allowedFields = [
      ...CLIENT_FIELDS,
      ...PRODUCER_FIELDS,
    ];

    const updates = Object.keys(body);

    const illegal = updates.filter(
      (field) => !allowedFields.includes(field)
    );

    if (illegal.length > 0) {
      return NextResponse.json(
        {
          error: "Forbidden fields",
          fields: illegal,
        },
        { status: 403 }
      );
    }

    // עדכון בפועל
    updates.forEach((field) => {
      guest[field] = body[field];
    });

    await guest.save();

    return NextResponse.json({
      success: true,
      guest,
    });
  } catch (err) {
    console.error("❌ PATCH guest error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
