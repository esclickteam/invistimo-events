import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { ReadonlyRequestCookies } from
  "next/dist/server/web/spec-extension/adapters/request-cookies";

import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================
   Cookie helper
========================= */
async function getCookieStore(): Promise<ReadonlyRequestCookies> {
  const store = cookies();
  return store instanceof Promise ? await store : store;
}

/* =========================
   POST /api/producer/impersonate
========================= */
export async function POST(req: NextRequest) {
  console.log("🟡 [Producer Impersonate] Request received");

  await dbConnect();

  /* =========================
     🔐 Auth – מפיק אמיתי
  ========================= */
  const auth = await getUserIdFromRequest();

  if (!auth?.userId) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const producer = await User.findById(auth.userId);

  if (!producer || producer.role !== "producer") {
    return NextResponse.json(
      { success: false, message: "Forbidden – not producer" },
      { status: 403 }
    );
  }

  /* =========================
     📥 Input
  ========================= */
  const { clientId } = await req.json();

  if (!clientId) {
    return NextResponse.json(
      { success: false, message: "Missing clientId" },
      { status: 400 }
    );
  }

  /* =========================
     👤 Client lookup
  ========================= */
  const client = await User.findById(clientId);

  if (!client || !client.producerId) {
    return NextResponse.json(
      { success: false, message: "Client not found / not linked" },
      { status: 404 }
    );
  }

  if (client.producerId.toString() !== producer._id.toString()) {
    return NextResponse.json(
      { success: false, message: "Not your client" },
      { status: 403 }
    );
  }

  /* =========================
     🎭 JWT – לקוח (התחזות)
  ========================= */
  const impersonationToken = jwt.sign(
    {
      userId: client._id.toString(),
      role: "client",

      impersonated: true,
      impersonatedBy: producer._id.toString(),
      impersonationRole: "producer",
    },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );

  /* =========================
     🍪 Cookies
     ❗ לא נוגעים ב-authToken
  ========================= */
  const cookieStore = await getCookieStore();

  cookieStore.set("impersonationToken", impersonationToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  console.log("🍪 impersonationToken set (authToken preserved)");

  return NextResponse.json({ success: true });
}
