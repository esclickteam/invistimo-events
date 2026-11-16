import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const rl = rateLimit(`login:${ip}`, 20, 60_000);
    if (!rl.ok) return jsonError("יותר מדי ניסיונות", 429);

    const body = schema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return jsonError("אימייל או סיסמה שגויים", 401);
    }

    await createSession(user, { ip, ua: req.headers.get("user-agent") || undefined });
    await audit({ action: "auth.login", actorUserId: user.id, ip });

    return jsonOk({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
