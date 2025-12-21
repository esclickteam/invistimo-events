import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });

  // ✅ הדרך הנכונה לפי ה-API של Next.js
  res.cookies.delete("authToken");

  return res;
}
