import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });

  // 🔥 מחיקה של cookie עם domain
  res.cookies.set("authToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: ".invistimo.com",
    maxAge: 0,
  });

  return res;
}
