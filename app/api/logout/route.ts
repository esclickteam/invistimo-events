import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json(
    { success: true },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );

  /* =====================================================
     🔥 מחיקה נכונה של cookies – Next.js App Router
     ✔ בלי options
     ✔ בלי domain
     ✔ בלי TypeScript errors
  ===================================================== */

  response.cookies.delete("authToken");
  response.cookies.delete("role");

  response.cookies.delete("isTrial");
  response.cookies.delete("smsLimit");
  response.cookies.delete("smsUsed");
  response.cookies.delete("trialExpiresAt");

  return response;
}
