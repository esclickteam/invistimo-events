import jwt from "jsonwebtoken";
import { userHasWeddingChallengesEntitlement } from "@/lib/weddingChallenges/entitlement";

export const ACCESS_TOKEN_EXPIRES_IN = "7d" as const;

export function signAccessJwt(user: {
  _id: { toString(): string } | string;
  role?: unknown;
  hasPaid?: unknown;
  isTrial?: unknown;
  authVersion?: unknown;
}) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET missing");
  }

  const role = String(user.role || "user");
  const hasPaid = Boolean(user.hasPaid);
  const includeWeddingChallenges = userHasWeddingChallengesEntitlement(user as any);
  const isTrial = Boolean(user.isTrial);
  const authVersion = Number((user as any).authVersion ?? 0);

  return jwt.sign(
    {
      userId: user._id.toString(),
      role,
      hasPaid,
      includeWeddingChallenges,
      isTrial,
      authVersion,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    }
  );
}
