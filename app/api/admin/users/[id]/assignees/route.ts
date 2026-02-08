import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const cookieStore = await cookies();
const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (decoded.role !== "admin") {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    const body = await req.json();
    const { assignedProducerId, assignedStaffIds } = body;

   const user = await User.findByIdAndUpdate(
  params.id,
  {
    assignedProducerId: assignedProducerId || null,
    assignedStaffIds: Array.isArray(assignedStaffIds)
      ? assignedStaffIds
      : [],
  },
  { new: true }
).lean();


    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error("❌ ASSIGN UPDATE ERROR:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
