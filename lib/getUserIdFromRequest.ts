import jwt from "jsonwebtoken";

type AuthPayload = {
  userId: string;
  role: "admin" | "user";
};

export async function getUserIdFromRequest(
  req: Request
): Promise<AuthPayload | null> {
  try {
    // 🔑 קריאת cookie ישירות מה־Request (חובה ב־Route Handlers)
    const cookieHeader = req.headers.get("cookie");
    if (!cookieHeader) return null;

    // חיפוש authToken / token
    const token =
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find(
          (c) =>
            c.startsWith("authToken=") || c.startsWith("token=")
        )
        ?.split("=")[1] || null;

    if (!token) return null;

    // 🔐 אימות JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as any;

    /*
      מצופה JWT:
      {
        userId | id,
        role: "admin" | "user",
        iat,
        exp
      }
    */

    const userId = decoded.userId || decoded.id || null;
    const role = decoded.role === "admin" ? "admin" : "user";

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
