import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

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

  const producer = await User.findById(auth.userId).select("_id role");

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
     👤 Client lookup + ownership
  ========================= */
  const client = await User.findOne({
    _id: clientId,
    producerId: producer._id, // 🔑 חייב להיות שייך למפיק
  }).select("_id");

  if (!client) {
    return NextResponse.json(
      { success: false, message: "Client not found or not yours" },
      { status: 403 }
    );
  }

  /* =========================
     🎭 JWT – התחזות ללקוח
     userId = הלקוח הפעיל
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
     🍪 Overwrite authToken
     🔑 זה מה שמפעיל באמת את האימפרסונציה
  ========================= */
  const cookieStore = await cookies();

  cookieStore.set("authToken", impersonationToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  console.log("🍪 authToken overwritten with impersonation token");

  return NextResponse.json({ success: true });
}
