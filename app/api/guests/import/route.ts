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
       🧠 המרת ערכים בעברית לאנגלית + תיקון מבנה
    ============================================================ */
    const translateRSVP = (value: string) => {
      if (!value) return "pending";
      const normalized = value.toString().trim().toLowerCase();

      // תמיכה בעברית ובאנגלית
      if (["yes", "מגיע", "הגיע", "בא"].includes(normalized)) return "yes";
      if (["no", "לא", "לא מגיע"].includes(normalized)) return "no";
      if (["pending", "ממתין", "לא השיב", "טרם"].includes(normalized))
        return "pending";

      // ערך לא מזוהה
      return "pending";
    };

    const formattedGuests = guests
      .filter((g: any) => g["שם"] || g.name) // דילוג על שורות ריקות
      .map((g: any) => {
        const guest = {
          invitationId,
          name: g.name || g["שם מלא"] || g["שם"] || "אורח ללא שם",
          phone: g.phone || g["טלפון"] || "",
          relation: g.relation || g["קרבה"] || "",
          rsvp: translateRSVP(g.rsvp || g["סטטוס"]),
          guestsCount: Number(
            g.guestsCount || g["מוזמנים"] || g["כמות משתתפים"] || 1
          ),
          notes: g.notes || g["הערות"] || "",
          token: crypto.randomUUID(),
        };
        return guest;
      });

    if (formattedGuests.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No valid guests found in Excel file",
      });
    }

    // 🟢 שמירה למסד
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
