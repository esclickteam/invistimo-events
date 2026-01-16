import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.delete({
    name: "impersonationToken",
    path: "/", // 🔥 קריטי – חייב להתאים ל-path של ה-set
  });

  return NextResponse.json({ success: true });
}
