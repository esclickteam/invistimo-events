import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

type AuthResult = {
  userId: string;              // 🔁 תאימות אחורה
  id: string;                  // ⭐ זהות אפקטיבית
  role?: string;
  isImpersonated?: boolean;
  realAdminId?: string;
};

export async function getUserIdFromRequest(
  req?: NextRequest | Request
): Promise<AuthResult | null> {
  try {
    if (!req) return null;

    const cookie = req.headers.get("cookie");
    if (!cookie) return null;

    const token =
      cookie
        .split(";")
        .find((c) => c.trim().startsWith("token="))
        ?.split("=")[1] ?? null;

    if (!token) return null;

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // ⭐ אימפרסונציה – זה הקסם
    if (decoded.impersonatedUserId) {
      return {
        userId: decoded.impersonatedUserId, // 🔁 כל הקוד הישן יעבוד
        id: decoded.impersonatedUserId,
        role: "user",
        isImpersonated: true,
        realAdminId: decoded.userId,
      };
    }

    // משתמש רגיל / אדמין רגיל
    return {
      userId: decoded.userId,
      id: decoded.userId,
      role: decoded.role,
      isImpersonated: false,
    };
  } catch (err) {
    console.error("JWT decode error:", err);
    return null;
  }
}
