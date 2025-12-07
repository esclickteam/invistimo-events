import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function getUserIdFromRequest() {
  try {
    const cookieStore = await cookies(); // 👈 חובה await

    const token =
      cookieStore.get("authToken")?.value ||
      cookieStore.get("token")?.value ||
      null;

    if (!token) return null;

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    return decoded.userId || null;
  } catch (err) {
    console.error("JWT decode error:", err);
    return null;
  }
}
