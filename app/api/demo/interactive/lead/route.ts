import { NextResponse } from "next/server";
import {
  commitDemoSession,
  ensureDemoSession,
} from "@/lib/demo/interactive/sessionCookie";
import { getSession, saveLead } from "@/lib/demo/interactive/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await ensureDemoSession();
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  const phone = String(body?.phone || "").trim();
  const email = String(body?.email || "").trim();

  if (name.length < 2 || phone.replace(/\D/g, "").length < 9) {
    return NextResponse.json(
      { success: false, message: "נא למלא שם וטלפון" },
      { status: 400 }
    );
  }

  const lead = saveLead(session.id, {
    name,
    phone,
    email,
    note: String(body?.note || ""),
  });
  await commitDemoSession(getSession(session.id));

  return NextResponse.json({
    success: true,
    message: "הפרטים נשמרו. נחזור אליכם עם הצעה.",
    lead,
  });
}
