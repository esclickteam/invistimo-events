import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export async function GET() {
  await connectDB();

  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value;

  if (!token) {
    return Response.json({ success: false }, { status: 401 });
  }

  const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

  // ✅ חייב להיות עובד
  if (decoded.role !== "staff") {
    return Response.json({ success: false }, { status: 403 });
  }

  const staff = await User.findById(decoded.userId).lean();
  if (!staff) {
    return Response.json({ success: false }, { status: 403 });
  }

  // ✅ חייב להיות עובד מפיק
  if (staff.staffType !== "producer_staff") {
    return Response.json({ success: false }, { status: 403 });
  }

  // ✅ שליפת כל המשתמשים שהוקצו (client + user)
  const users = await User.find({
    _id: { $in: staff.assignedClientIds || [] },
    role: { $in: ["client", "user"] },
  })
    .populate("event")
    .lean();

  return Response.json({ success: true, users });
}
