import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function getUserIdFromRequest() {
  try {
    const cookieStore = await cookies(); // ✔ אצלך זה Promise

    console.log("🔥 SERVER COOKIES:", await cookieStore.getAll());

    const token =
      (await cookieStore.get("authToken"))?.value ||
      (await cookieStore.get("token"))?.value ||
      null;

    console.log("🔑 TOKEN FOUND:", token ? "YES" : "NO");

    if (!token) return null;

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    console.log("🧩 DECODED JWT:", decoded);

    return decoded.userId || null;

  } catch (err) {
    console.error("❌ JWT decode error:", err);
    return null;
  }
}
