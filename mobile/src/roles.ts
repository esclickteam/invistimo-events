import type { MeUser } from "@/src/api";

export type AppExperience =
  | "admin"
  | "staff"
  | "venue"
  | "producer"
  | "producer_staff"
  | "customer"
  | "customer_production"
  | "customer_challenges";

function cleanRole(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

export function userHasWeddingChallengesEntitlement(user: MeUser | null | undefined) {
  if (!user) return false;
  return (
    user.accessModules?.weddingChallenges === true ||
    user.includeWeddingChallenges === true ||
    user.salesUpsells?.weddingChallenges?.enabled === true ||
    user.planLimits?.weddingChallengesEnabled === true
  );
}

export function userHasInviteOrProductionPackage(user: MeUser | null | undefined) {
  if (!user) return false;
  if (user.weddingChallengesOnly === true) return false;
  return (
    user.includeDigitalSeating === true ||
    user.includeEventManagement === true ||
    user.selfManageEnabled === true ||
    user.accessModules?.eventProduction === true ||
    user.accessModules?.rsvpSeating === true ||
    user.planLimits?.seatingEnabled === true ||
    user.features?.weddingWebsite === true
  );
}

export function userIsWeddingChallengesOnly(user: MeUser | null | undefined) {
  if (!userHasWeddingChallengesEntitlement(user)) return false;
  if (user?.weddingChallengesOnly === true) return true;
  if (userHasInviteOrProductionPackage(user)) return false;
  if (user?.hasPaid === true) return false;
  return true;
}

export function userCanAccessCheckIn(user: MeUser | null | undefined) {
  if (!user) return false;
  const role = cleanRole(user.impersonationRole || user.role);
  const staffType = cleanRole(user.staffType);
  const moduleOn =
    user.accessModules?.checkIn === true ||
    user.permissions?.checkIn === true ||
    user.features?.checkIn === true ||
    user.accessModules?.liveDashboard === true ||
    user.accessModules?.actualArrivals === true ||
    user.permissions?.liveDashboard === true ||
    user.permissions?.actualArrivals === true ||
    user.features?.liveDashboard === true ||
    user.planLimits?.liveDashboard === true;

  if (
    role === "admin" ||
    role === "producer" ||
    role === "user" ||
    role === "client" ||
    role === "customer"
  ) {
    return true;
  }
  if (staffType === "usher_staff") return true;
  if (
    staffType === "seating_staff" ||
    staffType === "general_staff" ||
    staffType === "producer_staff"
  ) {
    return true;
  }
  return moduleOn;
}

export function hasWeddingWebsiteFeature(user: MeUser | null | undefined, invitation?: Record<string, unknown> | null) {
  if (user?.features?.weddingWebsite === true) return true;
  if (user?.accessModules?.weddingWebsite === true) return true;
  const experience = String(
    invitation?.guestExperienceType ||
      invitation?.rsvpSiteMode ||
      (invitation?.invitationSettings as Record<string, unknown> | undefined)?.guestExperienceType ||
      user?.guestExperienceType ||
      ""
  );
  return experience === "wedding_website" || experience === "personal";
}

export function hasGuestMessagesFeature(user: MeUser | null | undefined, invitation?: Record<string, unknown> | null) {
  if (user?.features?.guestMessages === true) return true;
  if (user?.accessModules?.guestMessages === true) return true;
  return hasWeddingWebsiteFeature(user, invitation);
}

/**
 * Same redirect priority as website `getUserRedirectPath` in AuthContext.
 */
export function resolveAppExperience(user: MeUser | null | undefined): AppExperience | "guest" {
  if (!user) return "guest";

  const role = cleanRole(user.role);
  const effectiveRole = cleanRole(user.effectiveRole);
  const impersonationRole = cleanRole(user.impersonationRole);
  const originalTargetRole = cleanRole(user.originalTargetRole);
  const staffType = cleanRole(user.staffType);
  const employeeScope = cleanRole(user.employeeScope);

  const targetRole =
    originalTargetRole || impersonationRole || effectiveRole || role || "user";

  const isSystemStaff =
    targetRole === "system_staff" ||
    effectiveRole === "system_staff" ||
    user.isSystemStaff === true ||
    role === "system_staff" ||
    (role === "staff" && staffType !== "producer_staff" && employeeScope !== "producer") ||
    (role === "staff" && staffType === "general_staff");

  const isProducerStaff =
    targetRole === "producer_staff" ||
    targetRole === "staff_producer" ||
    effectiveRole === "producer_staff" ||
    effectiveRole === "staff_producer" ||
    user.isProducerStaff === true ||
    role === "producer_staff" ||
    role === "staff_producer" ||
    (role === "staff" && staffType === "producer_staff") ||
    (role === "staff" && employeeScope === "producer");

  const isVenueOwner =
    targetRole === "venue_owner" ||
    role === "venue_owner" ||
    effectiveRole === "venue_owner" ||
    user.venueOwner === true ||
    user.accessModules?.venues === true ||
    user.accessModules?.venueDashboard === true;

  const isVenueUser =
    targetRole === "venue_user" ||
    effectiveRole === "venue_user" ||
    user.venueUser === true ||
    user.isVenueUser === true ||
    (employeeScope === "venue" && role !== "staff" && !isSystemStaff);

  const rsvpSeating =
    user.accessModules?.rsvpSeating ??
    user.includeDigitalSeating ??
    user.planLimits?.seatingEnabled ??
    true;

  const eventProduction =
    user.accessModules?.eventProduction ??
    user.includeEventManagement ??
    user.selfManageEnabled ??
    false;

  if (targetRole === "admin" || role === "admin" || effectiveRole === "admin") {
    return "admin";
  }
  if (isSystemStaff) return "staff";
  if (isVenueOwner || isVenueUser) return "venue";
  if (targetRole === "producer" || role === "producer" || effectiveRole === "producer") {
    return "producer";
  }
  if (isProducerStaff) return "producer_staff";
  if (eventProduction === true && rsvpSeating === false) return "customer_production";
  if (userIsWeddingChallengesOnly(user)) return "customer_challenges";
  return "customer";
}

export function homeHref(experience: AppExperience | "guest") {
  switch (experience) {
    case "admin":
      return "/(admin)";
    case "staff":
      return "/(staff)";
    case "venue":
      return "/(venue)";
    case "producer":
      return "/(producer)";
    case "producer_staff":
      return "/(producer-staff)";
    case "customer_production":
      return "/(app)/production";
    case "customer_challenges":
      return "/(app)/more/challenges";
    case "customer":
      return "/(app)";
    default:
      return "/login";
  }
}

export function isUsherStaff(user: MeUser | null | undefined) {
  return (
    cleanRole(user?.role) === "staff" &&
    cleanRole(user?.staffType) === "usher_staff" &&
    (cleanRole(user?.employeeScope) === "system" || user?.isUsherStaff === true)
  );
}

export function canOpenEventManagement(user: MeUser | null | undefined) {
  return (
    user?.accessModules?.eventProduction === true ||
    user?.includeEventManagement === true ||
    user?.selfManageEnabled === true
  );
}

export function canOpenTransportationManagement(user: MeUser | null | undefined) {
  return (
    user?.accessModules?.transportationManagement === true ||
    user?.includeTransportationManagement === true
  );
}

export function experienceAllowsHref(
  experience: AppExperience | "guest",
  href: string
) {
  if (experience === "guest") return href.startsWith("/login") || href === "/forgot-password";
  if (href === "/security" || href === "/login") return true;
  if (experience === "admin") return href.startsWith("/(admin)") || href.startsWith("/security");
  if (experience === "staff") return href.startsWith("/(staff)") || href.startsWith("/security");
  if (experience === "venue") return href.startsWith("/(venue)") || href.startsWith("/security");
  if (experience === "producer") return href.startsWith("/(producer)") || href.startsWith("/security");
  if (experience === "producer_staff") {
    return href.startsWith("/(producer-staff)") || href.startsWith("/security");
  }
  return href.startsWith("/(app)") || href.startsWith("/security");
}
