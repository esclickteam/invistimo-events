import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // מוחק את ה-cookie שנקרא authToken
  response.cookies.set("authToken", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0), // מוחק לחלוטין
  });

  return response;
}
