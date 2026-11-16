import { createHash, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { env } from "./env";
import type { User, UserRole } from "@prisma/client";

const COOKIE = "album_session";
const key = () => new TextEncoder().encode(env.authSecret);

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(user: User, meta?: { ua?: string; ip?: string }) {
  const raw = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(raw),
      expiresAt,
      userAgent: meta?.ua,
      ip: meta?.ip,
    },
  });
  const jwt = await new SignJWT({ sid: hashToken(raw), uid: user.id, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
    .setIssuedAt()
    .sign(key());
  const jar = await cookies();
  jar.set(COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return jwt;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, key());
      const sid = String(payload.sid || "");
      if (sid) await prisma.session.deleteMany({ where: { tokenHash: sid } });
    } catch {
      /* ignore */
    }
  }
  jar.delete(COOKIE);
}

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    const sid = String(payload.sid || "");
    const uid = String(payload.uid || "");
    if (!sid || !uid) return null;
    const session = await prisma.session.findUnique({
      where: { tokenHash: sid },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) return null;
    if (session.userId !== uid) return null;
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    };
  } catch {
    return null;
  }
}

export async function requireUser(roles?: UserRole[]) {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("נדרשת התחברות", 401);
  if (roles && !roles.includes(user.role)) {
    throw new AuthError("אין הרשאה", 403);
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function getUserTenantIds(userId: string) {
  const memberships = await prisma.tenantMember.findMany({
    where: { userId },
    select: { tenantId: true, role: true },
  });
  return memberships;
}
