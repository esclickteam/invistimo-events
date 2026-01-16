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
   POST
========================= */
export async function POST(req: NextRequest) {
  await dbConnect();

  const auth = await getUserIdFromRequest();
  if (!auth || auth.role !== "producer") {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 403 }
    );
  }

  const { clientId } = await req.json();
  if (!clientId) {
    return NextResponse.json(
      { success: false, message: "Missing clientId" },
      { status: 400 }
    );
  }

  const client = await User.findById(clientId);
  if (!client) {
    return NextResponse.json(
      { success: false, message: "Client not found" },
      { status: 404 }
    );
  }

  if (client.producerId?.toString() !== auth.userId) {
    return NextResponse.json(
      { success: false, message: "Not your client" },
      { status: 403 }
    );
  }

  /* =========================
     JWT
  ========================= */
  const token = jwt.sign(
    {
      userId: client._id.toString(),
      role: "client",
      impersonated: true,
      impersonatedBy: auth.userId,
      impersonationRole: "producer",
    },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );

  /* =========================
     Cookie SET (מתוקן)
  ========================= */
  const cookieStore = await getCookieStore();

  cookieStore.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return NextResponse.json({ success: true });
}
