import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/* ============================================================
   POST — ייבוא אורחים מאקסל (חכם בעברית / אנגלית)
============================================================ */
export async function POST(req: Request) {
  try {
    const { invitationId, guests } = await req.json();

    if (!invitationId || !Array.isArray(guests)) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    await db();

    // 🟢 אימות בעל האירוע
    const userId = await getUserIdFromRequest();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const invitation = await Invitation.findById(invitationId);
    if (!invitation || invitation.ownerId.toString() !== userId.toString()) {
      return NextResponse.json(
        { success: false, error: "Not authorized for this invitation" },
        { status: 403 }
      );
    }

    /* ============================================================
       Helpers
    ============================================================ */

    const translateRSVP = (value: any): "yes" | "no" | "pending" => {
      if (value === undefined || value === null) return "pending";
      const normalized = String(value).trim().toLowerCase();

      if (["yes", "מגיע", "הגיע", "בא", "נוכח"].includes(normalized)) return "yes";
      if (["no", "לא", "לא מגיע", "לא נוכח"].includes(normalized)) return "no";
      if (["pending", "ממתין", "לא השיב", "טרם"].includes(normalized)) return "pending";

      return "pending";
    };

    const cleanPhone = (value: any) => {
      if (value === undefined || value === null) return "";
      let phone = String(value).replace(/\D/g, ""); // רק ספרות
      if (!phone) return "";
      if (!phone.startsWith("0")) phone = "0" + phone; // מחזיר 0 שנעלם באקסל
      return phone;
    };

    // ✅ תיקון TS: defaultValue יכול להיות string או number
    const getField = (
      obj: any,
      keys: string[],
      defaultValue: string | number = ""
    ) => {
      for (const key of keys) {
        const v = obj?.[key];
        if (v !== undefined && v !== null && v !== "") return v;
      }
      return defaultValue;
    };

    const toSafeNumber = (v: any, fallback = 1) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };

    /* ============================================================
       Build guests
    ============================================================ */
    const formattedGuests = guests
      .map((g: any) => {
        const name = String(
          getField(g, ["שם", "שם מלא", "Name", "Full Name"], "")
        ).trim();

        const phone = cleanPhone(
          getField(g, ["טלפון", "טל׳", "Phone", "מספר טלפון"], "")
        );

        const relation = String(
          getField(g, ["קרבה", "קשר", "Relation"], "")
        ).trim();

        const rsvp = translateRSVP(
          getField(g, ["סטטוס", "מענה", "RSVP", "אישור הגעה"], "pending")
        );

        const guestsCount = toSafeNumber(
          getField(g, ["מוזמנים", "כמות משתתפים", "Guests Count", "Guests"], 1),
          1
        );

        const notes = String(
          getField(g, ["הערות", "הערה", "Notes"], "")
        ).trim();

        // דילוג על שורות ריקות באמת
        if (!name && !phone) return null;

        return {
          invitationId,
          name: name || "אורח ללא שם",
          phone,
          relation,
          rsvp,
          guestsCount,
          notes,
          token: crypto.randomUUID(),
        };
      })
      .filter(Boolean);

    if (formattedGuests.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No valid guests found in Excel file",
      });
    }

    await InvitationGuest.insertMany(formattedGuests);

    return NextResponse.json({
      success: true,
      count: formattedGuests.length,
    });
  } catch (err) {
    console.error("❌ Import Excel error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
