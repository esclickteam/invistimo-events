import { IUser } from "@/models/User";
import mongoose from "mongoose";

/**
 * Auth context from token (getUserIdFromRequest)
 * לא תלוי במודל משתמש כדי לאפשר אדמין בהתחזות
 */
type AuthContext = {
  role?: string | null;
  staffType?: string | null;
  impersonated?: boolean;
  impersonatedBy?: string | null;
  impersonationRole?: string | null;
};

function isAdminByContext(auth?: AuthContext | null) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy // אדמין מתחזה
  );
}

function isProducerByContext(auth?: AuthContext | null) {
  return auth?.role === "producer" || auth?.impersonationRole === "producer";
}

function isProducerStaffByContext(auth?: AuthContext | null) {
  return (
    (auth?.role === "staff" && auth?.staffType === "producer_staff") ||
    auth?.impersonationRole === "producer_staff" ||
    auth?.impersonationRole === "staff_producer" // תאימות לאחור
  );
}

/* =========================
   Legacy checks (by user doc)
========================= */
export function isAdmin(user?: IUser | null) {
  return user?.role === "admin";
}

export function isProducer(user?: IUser | null) {
  return user?.role === "producer";
}

/* =========================
   Recommended checks (with auth context)
========================= */

export function canCreateUser({
  actingUser,
  roleToCreate,
  auth,
}: {
  actingUser: IUser;
  roleToCreate: IUser["role"];
  auth?: AuthContext | null;
}) {
  // ✅ אדמין אמיתי או אדמין בהתחזות
  if (isAdminByContext(auth) || actingUser.role === "admin") return true;

  const producerLike =
    actingUser.role === "producer" ||
    isProducerByContext(auth) ||
    isProducerStaffByContext(auth);

  // מפיק/עוזר מפיק יכולים ליצור לקוח/משתמש צוות לפי הצורך שלך
  if (producerLike && (roleToCreate === "client" || roleToCreate === "user" || roleToCreate === "staff")) {
    return true;
  }

  return false;
}

export function canEditUser({
  actingUser,
  targetUser,
  auth,
}: {
  actingUser: IUser;
  targetUser: IUser;
  auth?: AuthContext | null;
}) {
  // ✅ אדמין אמיתי או אדמין בהתחזות
  if (isAdminByContext(auth) || actingUser.role === "admin") return true;

  const producerLike =
    actingUser.role === "producer" ||
    isProducerByContext(auth) ||
    isProducerStaffByContext(auth);

  if (
    producerLike &&
    targetUser.createdByProducer &&
    new mongoose.Types.ObjectId(targetUser.createdByProducer).equals(actingUser._id)
  ) {
    return true;
  }

  return false;
}
