import jwt from "jsonwebtoken";
import { cookies as nextCookies } from "next/headers";

type AuthPayload = {
  userId: string;
  role: "admin" | "user";
};

export async function getUserIdFromRequest(): Promise<AuthPayload | null> {
  try {
    // 🧩 טיפלנו בשני המקרים: Promise או ערך רגיל
    const rawCookies = nextCookies();
    const cookieStore =
      rawCookies instanceof Promise ? await rawCookies : rawCookies;

    const token =
      cookieStore.get("authToken")?.value ||
      cookieStore.get("token")?.value ||
      null;

    if (!token) {
      console.warn("⚠️ No auth token found in cookies");
      return null;
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const userId = decoded.userId || decoded.id || null;
    const role = decoded.role || "user";

    if (!userId) {
      console.warn("⚠️ Token decoded but userId missing:", decoded);
      return null;
    }

    return { userId, role };
  } catch (err) {
    console.error("❌ JWT decode error:", err);
    return null;
  }
}
