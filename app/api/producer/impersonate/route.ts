import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { ReadonlyRequestCookies } from
  "next/dist/server/web/spec-extension/adapters/request-cookies";

import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================
   Cookie helper (קריטי)
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
  console.log("🟢 DB connected");

  /* =========================
     🔐 Auth
  ========================= */
  const auth = await getUserIdFromRequest();
  console.log("🔎 Auth payload:", auth);

  if (!auth?.userId) {
    console.error("❌ No auth or userId");
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  /**
   * ⚠️ תיקון קריטי:
   * לא סומכים רק על auth.role
   * בודקים גם את המשתמש במסד
   */
  const producer = await User.findById(auth.userId);
  console.log("👤 Producer from DB:", producer?._id, producer?.role);

  if (!producer || producer.role !== "producer") {
    console.error("❌ User is not producer");
    return NextResponse.json(
      { success: false, message: "Forbidden – not producer" },
      { status: 403 }
    );
  }

  /* =========================
     📥 Input
  ========================= */
  const body = await req.json();
  console.log("📦 Request body:", body);

  const { clientId } = body;

  if (!clientId) {
    console.error("❌ Missing clientId");
    return NextResponse.json(
      { success: false, message: "Missing clientId" },
      { status: 400 }
    );
  }

  /* =========================
     👤 Client lookup
  ========================= */
  const client = await User.findById(clientId);
  console.log("👥 Client found:", client?._id, client?.producerId);

  if (!client) {
    console.error("❌ Client not found");
    return NextResponse.json(
      { success: false, message: "Client not found" },
      { status: 404 }
    );
  }

  if (!client.producerId) {
    console.error("❌ Client has no producerId");
    return NextResponse.json(
      { success: false, message: "Client not linked to producer" },
      { status: 403 }
    );
  }

  if (client.producerId.toString() !== producer._id.toString()) {
    console.error(
      "❌ Client does not belong to producer",
      client.producerId.toString(),
      "!==",
      producer._id.toString()
    );
    return NextResponse.json(
      { success: false, message: "Not your client" },
      { status: 403 }
    );
  }

  /* =========================
     🎭 JWT (Client impersonation)
  ========================= */
  const token = jwt.sign(
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

  console.log("🎟️ Impersonation JWT created");

  /* =========================
     🍪 Cookie SET
  ========================= */
  const cookieStore = await getCookieStore();

  cookieStore.set("authToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  // תאימות אם יש קוד שמחפש token
  cookieStore.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  console.log("🍪 Cookies set – impersonation active");

  return NextResponse.json({ success: true });
}
