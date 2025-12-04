import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("cookie")
      ?.split("; ")
      ?.find((c) => c.startsWith("authToken="))
      ?.split("=")[1];

    if (!token) return NextResponse.json({ user: null });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const user = await User.findById(decoded.id).select("-password");

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
}
