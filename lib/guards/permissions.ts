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

/* =========================================================
   Internal type – כדי לוודא שיש _id
========================================================= */
type UserWithId = IUser & {
  _id: mongoose.Types.ObjectId;
};

/* =========================================================
   Context helpers
========================================================= */

function isAdminByContext(auth?: AuthContext | null) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

function isProducerByContext(auth?: AuthContext | null) {
  return auth?.role === "producer" || auth?.impersonationRole === "producer";
}

function isProducerStaffByContext(auth?: AuthContext | null) {
  return (
    (auth?.role === "staff" && auth?.staffType === "producer_staff") ||
    auth?.impersonationRole === "producer_staff" ||
    auth?.impersonationRole === "staff_producer"
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
   Recommended checks
========================= */

export function canCreateUser({
  actingUser,
  roleToCreate,
  auth,
}: {
  actingUser: UserWithId;
  roleToCreate: IUser["role"];
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
    (roleToCreate === "client" ||
      roleToCreate === "user" ||
      roleToCreate === "staff")
  ) {
    return true;
  }

  return false;
}

export function canEditUser({
  actingUser,
  targetUser,
  auth,
}: {
  actingUser: UserWithId;
  targetUser: UserWithId;
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
    new mongoose.Types.ObjectId(
      targetUser.createdByProducer
    ).equals(actingUser._id)
  ) {
    return true;
  }

  return false;
}
