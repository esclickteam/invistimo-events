import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const data = [
    {
      "שם מלא": "ישראל ישראלי",
      "טלפון": "'0501234567",   // טקסט – לא מספר
      "קרבה": "משפחה",

      "מוזמנים": 2,             // כמה הוזמנו
      "מגיעים": 0,              // תמיד מתחיל מ־0
      "סטטוס": "בהמתנה",        // ברירת מחדל

      "מס' שולחן": "",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);

  /* ============================================================
     כופה עמודת טלפון כ־TEXT
  ============================================================ */
  const phoneColIndex = 1; // עמודה B
  Object.keys(worksheet).forEach((cell) => {
    if (!cell.startsWith("B")) return;
    if (worksheet[cell]?.v) {
      worksheet[cell].t = "s";
    }
  });

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
