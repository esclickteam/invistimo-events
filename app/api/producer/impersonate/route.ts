import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import dbConnect from "@/lib/db";
import User from "@/models/User";
import Event from "@/models/Event";
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
     👤 Client ownership
  ========================= */
  const client = await User.findOne({
    _id: clientId,
    producerId: producer._id,
  }).select("_id");

  if (!client) {
    return NextResponse.json(
      { success: false, message: "Client not found or not yours" },
      { status: 403 }
    );
  }

  /* =========================
     🎬 Client Event
  ========================= */
  const event = await Event.findOne({
    userId: client._id,
  }).select("_id");

  if (!event) {
    return NextResponse.json(
      { success: false, message: "Event not found for client" },
      { status: 404 }
    );
  }

  /* =========================
     🍪 Cookies
  ========================= */
  const cookieStore = await cookies();

  const producerAuthToken = cookieStore.get("authToken")?.value;

  if (!producerAuthToken) {
    return NextResponse.json(
      { success: false, message: "Missing producer session" },
      { status: 401 }
    );
  }

  // 🧠 שומרים את session של המפיק
  cookieStore.set("producerAuthToken", producerAuthToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  /* =========================
     🎭 Impersonation token
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

  // 🔁 overwrite authToken
  cookieStore.set("authToken", impersonationToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  console.log("🍪 authToken overwritten, producerAuthToken saved");

  /* =========================
     ✅ Response
  ========================= */
  return NextResponse.json({
    success: true,
    eventId: event._id.toString(),
  });
}
