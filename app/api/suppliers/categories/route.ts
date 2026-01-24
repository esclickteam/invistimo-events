import { NextRequest, NextResponse } from "next/server";
import SupplierCategory from "@/models/SupplierCategory";
import db from "@/lib/db";

/* =========================================================
   DEFAULT CATEGORIES (SEED)
========================================================= */

const DEFAULT_CATEGORIES = [
  {
    name: "צילום",
    subs: ["סטילס", "וידאו", "מגנטים", "רחפן", "סושיאל"],
  },
  {
    name: "מוזיקה ובידור",
    subs: ["DJ", "להקה", "נגן", "זמר חופה"],
  },
  {
    name: "אוכל ושתייה",
    subs: ["אולם", "קייטרינג", "בר אלכוהול", "קינוחים"],
  },
  {
    name: "עיצוב והפקה",
    subs: ["חופה", "שולחנות", "פרחים", "תאורה", "הגברה"],
  },
  {
    name: "אטרקציות",
    subs: ["מגנטים מיוחדים", "360", "עשן כבד", "זיקוקים"],
  },
  {
    name: "תוכן וניהול",
    subs: ["רב / מנחה", "מפיק יום", "סידורי הושבה"],
  },
];

/* =========================================================
   GET – כל תחומי הספקים (עם seed אוטומטי)
========================================================= */

export async function GET(_request: NextRequest) {
  await db();

  let categories = await SupplierCategory.find().lean();

  // ✅ אם אין קטגוריות – יוצרים ברירת מחדל
  if (categories.length === 0) {
    await SupplierCategory.insertMany(DEFAULT_CATEGORIES);
    categories = await SupplierCategory.find().lean();
  }

  return NextResponse.json(categories);
}

/* =========================================================
   POST – הוספת תחום חדש ידנית
========================================================= */

export async function POST(request: NextRequest) {
  await db();

  const body = await request.json();

  if (!body?.name) {
    return NextResponse.json(
      { error: "Category name is required" },
      { status: 400 }
    );
  }

  const cat = await SupplierCategory.create({
    name: body.name,
    subs: body.subs || [],
  });

  return NextResponse.json(cat);
}
