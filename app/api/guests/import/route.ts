import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import Group from "@/models/Group";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/* =======================================================
   Helpers
======================================================= */

function cleanText(value: any) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanPhone(value: any) {
  const phone = cleanText(value).replace(/\D/g, "");
  return phone || null;
}

function normalizeTableNumber(value: any) {
  if (value === null || value === undefined || value === "") return null;

  const onlyDigits = String(value).replace(/[^\d]/g, "").trim();
  if (!onlyDigits) return null;

  const num = Number(onlyDigits);
  return Number.isFinite(num) ? num : null;
}

function normalizeRsvp(value: any) {
  const rsvp = cleanText(value);

  if (["yes", "no", "pending"].includes(rsvp)) {
    return rsvp;
  }

  return "pending";
}

function normalizeGuestsCount(value: any) {
  const num = Number(value);

  if (!Number.isFinite(num)) return 1;

  return Math.max(1, num);
}

export async function POST(req: NextRequest) {
  try {
    const { invitationId, guests } = await req.json();

    console.log("📥 RAW REQUEST BODY:", guests);

    if (!invitationId) {
      return NextResponse.json(
        {
          success: false,
          error: "כדי להוסיף מוזמנים יש ליצור הזמנה תחילה",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(guests)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_REQUEST",
          message: "בקשת הייבוא אינה תקינה.",
        },
        { status: 400 }
      );
    }

    await db();

    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "יש להתחבר מחדש כדי לייבא מוזמנים.",
        },
        { status: 401 }
      );
    }

    const userId = String(auth.userId);

    const invitation = await Invitation.findById(invitationId)
      .select("_id ownerId producerId eventId")
      .lean();

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: "NO_INVITATION",
          message: "לא נמצאה הזמנה מתאימה לייבוא.",
        },
        { status: 404 }
      );
    }

    const canAccess =
      invitation.ownerId?.toString() === userId ||
      invitation.producerId?.toString() === userId;

    if (!canAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          message: "אין לך הרשאה לייבא מוזמנים להזמנה הזו.",
        },
        { status: 403 }
      );
    }

    /* =======================================================
       בדיקת מגבלת רשומות לפי user.guests
       חשוב:
       guests.length = מספר רשומות באקסל
       guestsCount = כמות מוזמנים בתוך רשומה, לא קשור למגבלת הרשומות
    ======================================================= */

    const user = await User.findById(userId).select("guests").lean();

    const limit = Number(user?.guests || 0);
    const current = await InvitationGuest.countDocuments({ invitationId });

    const incomingRecordsCount = guests.filter((g: any) =>
      cleanText(g?.name || g?.["שם"] || g?.["שם מלא"])
    ).length;

    const remaining = Math.max(0, limit - current);
    const totalAfterImport = current + incomingRecordsCount;

    console.log("📌 IMPORT LIMIT CHECK:", {
      userId,
      invitationId,
      limit,
      current,
      incomingRecordsCount,
      remaining,
      totalAfterImport,
    });

    if (limit > 0 && current >= limit) {
      return NextResponse.json(
        {
          success: false,
          code: "GUEST_RECORD_LIMIT_EXCEEDED",
          error: "GUEST_RECORD_LIMIT_EXCEEDED",
          message: `לא ניתן להעלות את הקובץ. החבילה שלך מאפשרת עד ${limit} רשומות בלבד, וכבר קיימות ${current} רשומות במערכת.`,
          usage: {
            limit,
            existing: current,
            incomingCount: incomingRecordsCount,
            remaining: 0,
            totalAfterImport,
          },
        },
        { status: 403 }
      );
    }

    if (limit > 0 && totalAfterImport > limit) {
      return NextResponse.json(
        {
          success: false,
          code: "GUEST_RECORD_LIMIT_EXCEEDED",
          error: "GUEST_RECORD_LIMIT_EXCEEDED",
          message: `לא ניתן להעלות את הקובץ. החבילה שלך מאפשרת עד ${limit} רשומות בלבד. כרגע קיימות ${current} רשומות, ובקובץ נמצאו ${incomingRecordsCount} רשומות.`,
          usage: {
            limit,
            existing: current,
            incomingCount: incomingRecordsCount,
            remaining,
            totalAfterImport,
          },
        },
        { status: 403 }
      );
    }

    /* =======================================================
       שלב 1: חילוץ קבוצות
    ======================================================= */

    const uniqueGroups = [
      ...new Set(
        guests
          .map((g: any) => {
            const groupRaw = cleanText(g.group || g["קבוצה"] || "");
            const relationRaw = cleanText(g.relation || g["קרבה"] || "");

            return groupRaw || relationRaw;
          })
          .filter(Boolean)
      ),
    ];

    console.log("🔥 UNIQUE GROUPS:", uniqueGroups);

    /* =======================================================
       שלב 2: יצירת קבוצות
    ======================================================= */

    for (const name of uniqueGroups) {
      try {
        await Group.findOneAndUpdate(
          {
            invitationId: invitation._id,
            name,
          },
          {
            $setOnInsert: {
              invitationId: invitation._id,
              eventId: invitation.eventId,
              name,
            },
          },
          {
            upsert: true,
            new: true,
          }
        );
      } catch (err: any) {
        if (err.code !== 11000) throw err;
      }
    }

    /* =======================================================
       שלב 3: טעינה מחדש של קבוצות
    ======================================================= */

    const freshGroups = await Group.find({
      invitationId: invitation._id,
    });

    const groupMap: Record<string, any> = {};

    freshGroups.forEach((g) => {
      const key = cleanText(g.name);
      groupMap[key] = g._id;
    });

    console.log("🧠 GROUP MAP:", groupMap);

    /* =======================================================
       שלב 4: בניית אורחים
    ======================================================= */

    const validPayloads: any[] = [];

    for (const [index, g] of guests.entries()) {
      console.log("====================================");
      console.log(`👤 GUEST ${index + 1}`);

      const name = cleanText(g?.name || g?.["שם"] || g?.["שם מלא"] || "");

      if (!name) continue;

      const relationRaw = cleanText(g.relation || g["קרבה"] || "");
      const groupRaw = cleanText(g.group || g["קבוצה"] || "");

      const groupName = groupRaw || relationRaw;

      console.log("🔍 TRYING:", JSON.stringify(groupName));

      const groupId = groupName ? groupMap[groupName] || null : null;

      console.log("➡️ GROUP ID:", groupId);

      const phone = cleanPhone(g.phone || g["טלפון"]);

      const tableNumber = normalizeTableNumber(
        g.tableNumber ??
          g.table ??
          g["מס' שולחן"] ??
          g["מספר שולחן"] ??
          g["שולחן"] ??
          ""
      );

      validPayloads.push({
        invitationId,
        name,
        phone,
        relation: relationRaw || null,
        groupId,
        rsvp: normalizeRsvp(g.rsvp),
        guestsCount: normalizeGuestsCount(g.guestsCount),
        arrivedCount: 0,
        notes: cleanText(g.notes || g["הערות"] || "") || null,
        tableNumber,
        tableName: tableNumber !== null ? `שולחן ${tableNumber}` : null,
        token: crypto.randomUUID(),
      });
    }

    if (validPayloads.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "NO_VALID_GUESTS",
          message: "לא נמצאו רשומות תקינות לייבוא.",
        },
        { status: 400 }
      );
    }

    /*
      חשוב:
      לא עושים slice.
      אם הקובץ עבר את המגבלה — חסמנו למעלה.
      אם הוא לא עבר — מייבאים את כולו.
    */
    console.log("📦 FINAL INSERT:", validPayloads);

    await InvitationGuest.insertMany(validPayloads, {
      ordered: true,
    });

    return NextResponse.json({
      success: true,
      count: validPayloads.length,
      message: `✅ יובאו ${validPayloads.length} מוזמנים בהצלחה`,
      usage: {
        limit,
        existingBeforeImport: current,
        imported: validPayloads.length,
        totalAfterImport: current + validPayloads.length,
        remainingAfterImport:
          limit > 0 ? Math.max(0, limit - (current + validPayloads.length)) : null,
      },
    });
  } catch (err) {
    console.error("❌ Import guests error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: "אירעה שגיאה בייבוא הקובץ.",
      },
      { status: 500 }
    );
  }
}