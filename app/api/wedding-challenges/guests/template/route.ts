import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const data = [
    {
      "שם פרטי": "דני",
      טלפון: "0501234567",
      שולחן: 4,
      מבוגר: "כן",
    },
    {
      "שם פרטי": "נועה",
      טלפון: "0527654321",
      שולחן: "",
      מבוגר: "כן",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "אורחים");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="wedding-challenges-guests.xlsx"',
    },
  });
}
