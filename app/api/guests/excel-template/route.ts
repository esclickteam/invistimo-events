import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  // כותרות + שורת דוגמה
  const data = [
    {
      "שם מלא": "ישראל ישראלי",
      "טלפון": "0501234567",
      "קרבה": "משפחה",
      "סטטוס": "בהמתנה",
      "כמות אורחים": 1,
      "מס' שולחן": "",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
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
      "Content-Disposition": 'attachment; filename="guest-template.xlsx"',
    },
  });
}
