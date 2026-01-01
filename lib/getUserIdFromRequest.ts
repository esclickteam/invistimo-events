import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

type AuthPayload = {
  userId: string;
  role: "admin" | "user";
};

export async function getUserIdFromRequest(): Promise<AuthPayload | null> {
  try {
    // ✔ אצלך cookies() מחזיר Promise
    const cookieStore = await cookies();

    const token =
      cookieStore.get("authToken")?.value ||
      cookieStore.get("token")?.value ||
      null;

    if (!token) return null;

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    /*
      מצופה JWT בצורה:
      {
        id / userId,
        role: "admin" | "user",
        iat,
        exp
      }
    */

    const userId = decoded.userId || decoded.id || null;
    const role = decoded.role || "user";

    if (!userId) return null;

    return {
      userId,
      role,
    };
  } catch (err) {
    console.error("❌ JWT decode error:", err);
    return null;
  }
}
