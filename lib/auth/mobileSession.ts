import crypto from "crypto";
import MobileRefreshToken from "@/models/MobileRefreshToken";

export const MOBILE_REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 180;

export function hashRefreshToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function generateRefreshToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createMobileRefreshSession(input: {
  userId: string;
  authVersion: number;
  deviceLabel?: string;
}) {
  const refreshToken = generateRefreshToken();
  const familyId = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + MOBILE_REFRESH_TTL_MS);

  await MobileRefreshToken.create({
    userId: input.userId,
    tokenHash: hashRefreshToken(refreshToken),
    familyId,
    authVersion: input.authVersion,
    deviceLabel: String(input.deviceLabel || "").slice(0, 80),
    expiresAt,
  });

  return { refreshToken, expiresAt, familyId };
}

export async function rotateMobileRefreshSession(rawToken: string) {
  const tokenHash = hashRefreshToken(rawToken);
  const existing = await MobileRefreshToken.findOne({ tokenHash });

  if (!existing) {
    return { ok: false as const, error: "INVALID_REFRESH" };
  }

  if (existing.revokedAt) {
    await MobileRefreshToken.updateMany(
      { familyId: existing.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    return { ok: false as const, error: "REFRESH_REUSED" };
  }

  if (existing.expiresAt.getTime() <= Date.now()) {
    existing.revokedAt = new Date();
    await existing.save();
    return { ok: false as const, error: "REFRESH_EXPIRED" };
  }

  const nextRaw = generateRefreshToken();
  const nextHash = hashRefreshToken(nextRaw);
  const expiresAt = new Date(Date.now() + MOBILE_REFRESH_TTL_MS);

  existing.revokedAt = new Date();
  existing.replacedByHash = nextHash;
  existing.lastUsedAt = new Date();
  await existing.save();

  await MobileRefreshToken.create({
    userId: existing.userId,
    tokenHash: nextHash,
    familyId: existing.familyId,
    authVersion: existing.authVersion,
    deviceLabel: existing.deviceLabel,
    expiresAt,
  });

  return {
    ok: true as const,
    userId: String(existing.userId),
    authVersion: Number(existing.authVersion || 0),
    refreshToken: nextRaw,
    expiresAt,
  };
}

export async function revokeMobileRefreshToken(rawToken: string) {
  const tokenHash = hashRefreshToken(rawToken);
  const existing = await MobileRefreshToken.findOne({ tokenHash });
  if (!existing) return { ok: true as const, revoked: 0 };
  const result = await MobileRefreshToken.updateMany(
    { familyId: existing.familyId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  return { ok: true as const, revoked: result.modifiedCount || 0 };
}
