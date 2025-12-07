import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function getUserIdFromRequest() {
  try {
    // ✔ אצלך cookies() מחזיר Promise
    const cookieStore = await cookies();

    console.log("🔥 SERVER COOKIES:", cookieStore.getAll());

    const token =
      cookieStore.get("authToken")?.value ||
      cookieStore.get("token")?.value ||
      null;

    console.log("🔑 TOKEN FOUND:", token ? "YES" : "NO");

    if (!token) return null;

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    console.log("🧩 DECODED JWT:", decoded);

    // אצלך ה-JWT מכיל id ולא userId
    return decoded.id || decoded.userId || null;

  } catch (err) {
    console.error("❌ JWT decode error:", err);
    return null;
  }
}
