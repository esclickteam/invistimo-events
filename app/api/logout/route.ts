import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });

  // 🔥 מחיקה רגילה (חובה)
  res.cookies.delete("authToken");

  // 🔒 מחיקה משלימה לדומיין הראשי (למקרה שנוצר cookie עם domain)
  if (process.env.NODE_ENV === "production") {
    res.cookies.set("authToken", "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      domain: ".invistimo.com",
      maxAge: 0,
    });
  }

  return res;
}
