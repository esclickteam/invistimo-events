import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies(); // ✅ חובה await

  cookieStore.delete("impersonationToken"); // 🔥 זה הקריטי

  return NextResponse.json({ success: true });
}
