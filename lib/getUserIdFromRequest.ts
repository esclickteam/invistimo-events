import jwt from "jsonwebtoken";

export function getUserIdFromRequest(req: Request) {
  try {
    const cookie = req.headers.get("cookie");
    if (!cookie) return null;

    // מפרקים את כל ה-cookies בצורה בטוחה
    const cookiePairs = cookie.split(";").map((c) => c.trim());

    // מחפשים את authToken או token
    const rawToken = cookiePairs.find((c) =>
      c.startsWith("authToken=") || c.startsWith("token=")
    );
    if (!rawToken) return null;

    // כאן הטוקן יכול להכיל "=" — לכן משתמשים ב-slice ולא split("=")
    const token = rawToken.slice(rawToken.indexOf("=") + 1);

    if (!token) return null;

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    return decoded.userId || null;
  } catch (err) {
    console.error("JWT decode error:", err);
    return null;
  }
}
