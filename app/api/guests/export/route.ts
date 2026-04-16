import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Group from "@/models/Group";
import { RSVP_LABELS, type RSVPStatus } from "@/lib/rsvp";
import * as XLSX from "xlsx";

export async function GET(req: Request) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const invitationId = searchParams.get("invitationId");
  const mode = searchParams.get("mode"); // ⭐️ חדש

  if (!invitationId) {
    return NextResponse.json(
      { error: "Missing invitationId" },
      { status: 400 }
    );
  }

  /* =========================
     Load data
  ========================= */

  let guests = await InvitationGuest.find({ invitationId }).lean();

  const groups = await Group.find({ invitationId }).lean();
  const groupMap = new Map<string, string>(
    groups.map((g: any) => [String(g._id), g.name])
  );

  /* =========================
     ⭐️ LIVE FILTER
  ========================= */

  if (mode === "live") {
    guests = guests.filter(
      (g: any) => (g.actualArrivedCount || 0) > 0
    );
  }

  /* =========================
     Build Excel rows
  ========================= */

  const rows = guests.map((g: any) => {
    const baseRow: any = {
      "שם מלא": g.name || "",
      "טלפון": g.phone || "",
      "קרבה": g.relation || "",
      "קבוצה": g.groupId
        ? groupMap.get(String(g.groupId)) || ""
        : "",
      "סטטוס": RSVP_LABELS[g.rsvp as RSVPStatus] || "",
      "מוזמנים": g.guestsCount ?? 0,
      "מגיעים": g.arrivedCount ?? 0,
      "מס' שולחן":
        g.tableName ||
        (g.tableNumber ? `שולחן ${g.tableNumber}` : ""),
      "הערות": g.notes || "",
    };

    // ⭐️ רק בלייב נוסיף עמודה
    if (mode === "live") {
      baseRow["מגיעים בפועל"] = g.actualArrivedCount ?? 0;
    }

    return baseRow;
  });

  /* =========================
     Create Excel
  ========================= */

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    mode === "live" ? "הגיעו בפועל" : "מוזמנים"
  );

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  /* =========================
     Filename
  ========================= */

  const filename =
    mode === "live"
      ? "מוזמנים_הגיעו_בפועל.xlsx"
      : "מוזמנים.xlsx";

  const hebrewFilename = encodeURIComponent(filename);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

      "Content-Disposition": `attachment; filename*=UTF-8''${hebrewFilename}`,
    },
  });
}