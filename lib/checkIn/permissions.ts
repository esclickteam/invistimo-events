import type { AuthPayload } from "@/lib/getUserIdFromRequest";

/**
 * Check-in permissions layered on existing roles/staffTypes.
 * Named like checkin.view / checkin.scan for clarity; resolved from role.
 */
export type CheckInPermission =
  | "checkin.view"
  | "checkin.scan"
  | "checkin.edit"
  | "checkin.manage";

type PermissionSource = {
  role?: string | null;
  impersonationRole?: string | null;
  staffType?: string | null;
  accessModules?: {
    checkIn?: boolean;
    liveDashboard?: boolean;
    actualArrivals?: boolean;
    rsvpSeating?: boolean;
  } | null;
  permissions?: {
    checkIn?: boolean;
    liveDashboard?: boolean;
    actualArrivals?: boolean;
  } | null;
  features?: {
    checkIn?: boolean;
    liveDashboard?: boolean;
  } | null;
  planLimits?: {
    liveDashboard?: boolean;
  } | null;
};

function normalizeRole(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function resolveCheckInPermissions(
  source?: PermissionSource | null
): Set<CheckInPermission> {
  const role = normalizeRole(
    source?.impersonationRole || source?.role
  );
  const staffType = normalizeRole(source?.staffType);
  const perms = new Set<CheckInPermission>();

  const isAdmin = role === "admin";
  const isProducer = role === "producer";
  const isOwnerLike =
    role === "user" ||
    role === "client" ||
    role === "customer" ||
    (!role && !staffType);

  const isUsher = staffType === "usher_staff";
  const isSeating = staffType === "seating_staff";
  const isGeneralStaff = staffType === "general_staff";
  const isProducerStaff = staffType === "producer_staff";

  const moduleOn =
    source?.accessModules?.checkIn === true ||
    source?.permissions?.checkIn === true ||
    source?.features?.checkIn === true ||
    source?.accessModules?.liveDashboard === true ||
    source?.accessModules?.actualArrivals === true ||
    source?.permissions?.liveDashboard === true ||
    source?.permissions?.actualArrivals === true ||
    source?.features?.liveDashboard === true ||
    source?.planLimits?.liveDashboard === true;

  if (isAdmin || isProducer || isOwnerLike) {
    perms.add("checkin.view");
    perms.add("checkin.scan");
    perms.add("checkin.edit");
    perms.add("checkin.manage");
    return perms;
  }

  if (isUsher) {
    perms.add("checkin.view");
    perms.add("checkin.scan");
    return perms;
  }

  if (isSeating || isGeneralStaff || isProducerStaff || moduleOn) {
    perms.add("checkin.view");
    perms.add("checkin.scan");
    if (isGeneralStaff || isProducerStaff || moduleOn) {
      perms.add("checkin.edit");
    }
  }

  return perms;
}

export function hasCheckInPermission(
  source: PermissionSource | null | undefined,
  permission: CheckInPermission
): boolean {
  return resolveCheckInPermissions(source).has(permission);
}

export function authHasCheckInPermission(
  auth: AuthPayload | null | undefined,
  user: PermissionSource | null | undefined,
  permission: CheckInPermission
): boolean {
  if (!auth?.userId) return false;

  const merged: PermissionSource = {
    role: auth.impersonationRole || auth.role || user?.role,
    impersonationRole: auth.impersonationRole,
    staffType: (auth as any).staffType || user?.staffType,
    accessModules: user?.accessModules,
    permissions: user?.permissions,
    features: user?.features,
    planLimits: user?.planLimits,
  };

  if (
    auth.role === "admin" ||
    auth.impersonationRole === "admin" ||
    auth.impersonatedByAdmin === true
  ) {
    return true;
  }

  return hasCheckInPermission(merged, permission);
}

/** Client-side nav / UI gate */
export function userCanAccessCheckIn(user?: PermissionSource | null): boolean {
  return hasCheckInPermission(user, "checkin.view");
}

export function userCanScanCheckIn(user?: PermissionSource | null): boolean {
  return hasCheckInPermission(user, "checkin.scan");
}

export function userCanEditCheckIn(user?: PermissionSource | null): boolean {
  return hasCheckInPermission(user, "checkin.edit");
}

export function userCanManageCheckIn(user?: PermissionSource | null): boolean {
  return hasCheckInPermission(user, "checkin.manage");
}
