import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import Event from "@/models/Event";
import { connectDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();

  /* =========================
     Auth
  ========================= */
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value;

  if (!token) {
    return Response.json({ success: false }, { status: 401 });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return Response.json({ success: false }, { status: 401 });
  }

  // ✅ חייב להיות עובד
  if (decoded.role !== "staff") {
    return Response.json({ success: false }, { status: 403 });
  }

  const staff = await User.findById(decoded.userId)
    .select("staffType assignedClientIds")
    .lean();

  if (!staff) {
    return Response.json({ success: false }, { status: 403 });
  }

  // ✅ חייב להיות עובד מפיק
  if (staff.staffType !== "producer_staff") {
    return Response.json({ success: false }, { status: 403 });
  }

  const assignedClientIds = staff.assignedClientIds || [];

  if (assignedClientIds.length === 0) {
    return Response.json({ success: true, users: [] });
  }

  /* =========================
     Load clients
  ========================= */
  const clients = await User.find({
    _id: { $in: assignedClientIds },
    role: "client",
  })
    .select("name email phone role")
    .lean();

  /* =========================
     Load events of clients
  ========================= */
  const events = await Event.find({
    owner: { $in: assignedClientIds },
  })
    .select("owner date location totalGuests approvedCount")
    .lean();

  /* =========================
     Merge client + event
  ========================= */
  const users = clients.map((client) => {
    const event = events.find(
      (e) => String(e.owner) === String(client._id)
    );

    return {
      ...client,
      event: event || null,
    };
  });

  return Response.json({
    success: true,
    users,
  });
}
