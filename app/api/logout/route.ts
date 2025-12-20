import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set("authToken", "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",          // ⭐️ חייב להיות זהה
    domain: ".invistimo.com",  // ⭐️ חייב להיות זהה
    path: "/",
    expires: new Date(0),
  });

  return response;
}
