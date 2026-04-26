import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import Group from "@/models/Group";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { invitationId, guests } = await req.json();

    console.log("📥 RAW REQUEST BODY:", guests);

    if (!invitationId) {
      return NextResponse.json(
        { success: false, error: "כדי להוסיף מוזמנים יש ליצור הזמנה תחילה" },
        { status: 400 }
      );
    }

    if (!Array.isArray(guests)) {
      return NextResponse.json(
        { success: false, error: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    await db();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = String(auth.userId);

    const invitation = await Invitation.findById(invitationId)
      .select("_id ownerId producerId eventId")
      .lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "NO_INVITATION" },
        { status: 404 }
      );
    }

    const canAccess =
      invitation.ownerId?.toString() === userId ||
      invitation.producerId?.toString() === userId;

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const user = await User.findById(userId).select("guests").lean();
    const limit = Number(user?.guests || 0);

    const current = await InvitationGuest.countDocuments({ invitationId });
    let remaining = Math.max(0, limit - current);

    if (remaining <= 0) {
      return NextResponse.json(
        { success: false, error: "GUEST_LIMIT_REACHED" },
        { status: 409 }
      );
    }

    /* =======================================================
       🔥 שלב 1: חילוץ קבוצות
    ======================================================= */

    const uniqueGroups = [
      ...new Set(
        guests
          .map((g: any) => {
            const raw = String(
              g.group || g.relation || g["קבוצה"] || g["קרבה"] || ""
            );

            return raw
              .replace(/\u00A0/g, " ")
              .replace(/\s+/g, " ")
              .trim();
          })
          .filter(Boolean)
      ),
    ];

    console.log("🔥 UNIQUE GROUPS:", uniqueGroups);

    /* =======================================================
       🔥 שלב 2: יצירת קבוצות
    ======================================================= */

    for (const name of uniqueGroups) {
      try {
        await Group.findOneAndUpdate(
          { invitationId: invitation._id, name },
          {
            $setOnInsert: {
              invitationId: invitation._id,
              eventId: invitation.eventId,
              name,
            },
          },
          { upsert: true, new: true }
        );
      } catch (err: any) {
        if (err.code !== 11000) throw err;
      }
    }

    /* =======================================================
       🔥 שלב 3: טעינה מחדש (הכי חשוב!)
    ======================================================= */

    const freshGroups = await Group.find({
      invitationId: invitation._id,
    });

    const groupMap: Record<string, any> = {};

    freshGroups.forEach((g) => {
      const key = g.name
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      groupMap[key] = g._id;
    });

    console.log("🧠 GROUP MAP:", groupMap);

    /* =======================================================
       🔥 שלב 4: בניית אורחים
    ======================================================= */

    const validPayloads: any[] = [];

    for (const [index, g] of guests.entries()) {
      console.log("====================================");
      console.log(`👤 GUEST ${index + 1}`);

      const name = String(g?.name || "").trim();
      if (!name) continue;

      const relationRaw = String(g.relation || g["קרבה"] || "")
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const groupRaw = String(g.group || g["קבוצה"] || "")
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const groupName = (groupRaw || relationRaw).trim();

      console.log("🔍 TRYING:", JSON.stringify(groupName));

      const groupId = groupMap[groupName] || null;

      console.log("➡️ GROUP ID:", groupId);

      const phone =
        g.phone && String(g.phone).replace(/\D/g, "")
          ? String(g.phone).replace(/\D/g, "")
          : null;

      const tableNumber = Number.isFinite(Number(g.table))
        ? Number(g.table)
        : null;

      validPayloads.push({
        invitationId,
        name,
        phone,
        relation: relationRaw || null,
        groupId,
        rsvp: ["yes", "no", "pending"].includes(g.rsvp)
          ? g.rsvp
          : "pending",
        guestsCount: Number.isFinite(Number(g.guestsCount))
          ? Math.max(1, Number(g.guestsCount))
          : 1,
        arrivedCount: 0,
        notes: String(g.notes || "").trim() || null,
        tableNumber,
        tableName: tableNumber ? `שולחן ${tableNumber}` : null,
        token: crypto.randomUUID(),
      });
    }

    if (validPayloads.length === 0) {
      return NextResponse.json(
        { success: false, error: "NO_VALID_GUESTS" },
        { status: 400 }
      );
    }

    const toImport = validPayloads.slice(0, remaining);

    console.log("📦 FINAL INSERT:", toImport);

    await InvitationGuest.insertMany(toImport, { ordered: true });

    return NextResponse.json({
      success: true,
      count: toImport.length,
    });
  } catch (err) {
    console.error("❌ Import guests error:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}