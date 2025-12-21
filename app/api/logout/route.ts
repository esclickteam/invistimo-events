import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set("authToken", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",   // ✅ זהה ללוגין
    path: "/",         // ✅ זהה ללוגין
    maxAge: 0,         // ✅ מחיקה מיידית
  });

  return response;
}
