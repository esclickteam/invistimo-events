import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import * as XLSX from "xlsx";

export async function GET(req: Request) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const invitationId = searchParams.get("invitationId");

  if (!invitationId) {
    return NextResponse.json(
      { error: "Missing invitationId" },
      { status: 400 }
    );
  }

  const guests = await InvitationGuest.find({
    invitationId,
  }).lean();

  // 🧾 התאמת השדות לאקסל
  const rows = guests.map((g, index) => ({
    "#": index + 1,
    "שם מלא": g.name || "",
    "טלפון": g.phone || "",
    "סטטוס": g.rsvp || "",
    "כמות מוזמנים": g.guestsCount || 0,
    "קבוצה": g.groupId || "",
    "שולחן": g.tableName || g.tableNumber || "",
    "הערות": g.notes || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "מוזמנים");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="guests.xlsx"',
    },
  });
}
