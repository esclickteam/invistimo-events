import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  // 🔑 חייב await כאן
  const cookieStore = await cookies();

  // 🔑 מחזיקים את ה-token המקורי של מפיק / אדמין
  const backupToken =
    cookieStore.get("producerAuthToken")?.value ??
    cookieStore.get("adminAuthToken")?.value;

  if (!backupToken) {
    return NextResponse.json({
      success: false,
      message: "No original session found",
    }, { status: 400 });
  }

  // 🔁 מחזירים את המשתמש המקורי ל-authToken
  cookieStore.set("authToken", backupToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  // 🧹 מנקים את ה-backup כדי למנוע כפילות
  cookieStore.delete({ name: "producerAuthToken", path: "/" });
  cookieStore.delete({ name: "adminAuthToken", path: "/" });

  return NextResponse.json({ success: true });
}
