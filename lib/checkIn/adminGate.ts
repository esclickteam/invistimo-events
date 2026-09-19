import type { AuthPayload } from "@/lib/getUserIdFromRequest";

/** Invistimo system Admin only — not event owners, producers, or staff. */
export function isInvistimoAdmin(
  auth?: Pick<
    AuthPayload,
    "role" | "impersonationRole" | "impersonatedByAdmin"
  > | null
): boolean {
  if (!auth) return false;
  return (
    auth.role === "admin" ||
    auth.impersonationRole === "admin" ||
    auth.impersonatedByAdmin === true
  );
}
