import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import User from "@/models/User";

export async function POST(req) {
  try {
    await connectDB();

    /* =========================
       AUTH (מפיק מחובר)
    ========================= */
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const producerId = decoded?.id || decoded?._id;
    if (!producerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // לוודא שזה באמת מפיק/אדמין
    const producer = await User.findById(producerId).select("role email");
    if (!producer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (producer.role !== "producer" && producer.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* =========================
       BODY
    ========================= */
    const {
      userId,
      eventType,
      title,
      date,
      location,
      maxGuests,
    } = await req.json();

    if (!userId || !eventType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    /* =========================
       CLIENT
    ========================= */
    const client = await User.findById(userId).select("email name");
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    /* =========================
       (אופציונלי) מניעת כפילות
       אם לחצו פעמיים מהר
    ========================= */
    const existing = await Event.findOne({
      userId,
      producerId,
      eventType,
      title: title || "",
      date: date || "",
    });

    if (existing) {
      return NextResponse.json({ success: true, event: existing });
    }

    /* =========================
       CREATE EVENT
    ========================= */
    const event = await Event.create({
      userId,
      producerId,
      email: client.email,
      eventType,
      title: title || "",
      date: date || "",
      location: location || "",
      maxGuests: Number(maxGuests) || 200,
      paymentStatus: "paid",
      status: "active",
      // stripeSessionId / stripePriceId נשארים null (לפי הסכמה המעודכנת)
    });

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error("❌ create-event error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
