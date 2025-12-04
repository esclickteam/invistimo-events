import jwt from "jsonwebtoken";

export function getUserIdFromRequest(req: Request) {
  try {
    const cookie = req.headers.get("cookie");

    if (!cookie) return null;

    const token = cookie
      .split(";")
      .find((c) => c.trim().startsWith("token="))
      ?.split("=")[1];

    if (!token) return null;

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    return decoded.userId || null;
  } catch (err) {
    console.error("JWT decode error:", err);
    return null;
  }
}
