import crypto from "crypto";

export function createShortCode(length = 5) {
  return crypto
    .randomBytes(length)
    .toString("base64url")
    .slice(0, length);
}
