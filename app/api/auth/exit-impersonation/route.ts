import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function getCookieStore() {
  const store = cookies();
  return store instanceof Promise ? await store : store;
}

export async function POST() {
  const cookieStore = await getCookieStore();

  const adminToken = cookieStore.get("adminToken")?.value;

  if (!adminToken) {
    return NextResponse.json(
      { success: false, error: "No admin token" },
      { status: 400 }
    );
  }

  const res = NextResponse.json({ success: true });

  // 🔁 שחזור אדמין
  res.cookies.set("authToken", adminToken, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  res.cookies.set("token", adminToken, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  // 🧹 ניקוי
  res.cookies.delete("adminToken");

  return res;
}
