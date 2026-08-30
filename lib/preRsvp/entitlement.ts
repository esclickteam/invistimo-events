export type PreRsvpMode =
  | "none"
  | "save_the_date_only"
  | "invitation_only"
  | "both";

export type PreRsvpFlags = {
  enabled: boolean;
  mode: PreRsvpMode;
  saveTheDateEnabled: boolean;
  invitationOnlyEnabled: boolean;
};

function cleanEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function asMode(value: unknown): PreRsvpMode | "" {
  const mode = String(value || "").trim();
  if (
    mode === "none" ||
    mode === "save_the_date_only" ||
    mode === "invitation_only" ||
    mode === "both"
  ) {
    return mode;
  }
  return "";
}

export function preRsvpModeFromFlags(
  saveTheDateEnabled: boolean,
  invitationOnlyEnabled: boolean
): PreRsvpMode {
  if (saveTheDateEnabled && invitationOnlyEnabled) return "both";
  if (saveTheDateEnabled) return "save_the_date_only";
  if (invitationOnlyEnabled) return "invitation_only";
  return "none";
}

export function readPreRsvpFlags(user?: {
  salesUpsells?: {
    preRsvpMessages?: {
      enabled?: boolean | null;
      mode?: string | null;
      saveTheDateEnabled?: boolean | null;
      invitationOnlyEnabled?: boolean | null;
    } | null;
  } | null;
} | null): PreRsvpFlags {
  const pre = user?.salesUpsells?.preRsvpMessages || {};
  const mode = asMode(pre.mode);

  const saveTheDateEnabled = Boolean(
    pre.saveTheDateEnabled === true ||
      mode === "save_the_date_only" ||
      mode === "both"
  );
  const invitationOnlyEnabled = Boolean(
    pre.invitationOnlyEnabled === true ||
      mode === "invitation_only" ||
      mode === "both"
  );

  const resolvedMode =
    mode || preRsvpModeFromFlags(saveTheDateEnabled, invitationOnlyEnabled);

  const enabled =
    pre.enabled !== false &&
    resolvedMode !== "none" &&
    (saveTheDateEnabled || invitationOnlyEnabled);

  return {
    enabled,
    mode: resolvedMode || "none",
    saveTheDateEnabled,
    invitationOnlyEnabled,
  };
}

export function buildPreRsvpMessagesSet(flags: {
  saveTheDateEnabled: boolean;
  invitationOnlyEnabled: boolean;
  givenFree?: boolean;
}) {
  const mode = preRsvpModeFromFlags(
    flags.saveTheDateEnabled,
    flags.invitationOnlyEnabled
  );
  const enabled = mode !== "none";

  return {
    "salesUpsells.preRsvpMessages.enabled": enabled,
    "salesUpsells.preRsvpMessages.mode": mode,
    "salesUpsells.preRsvpMessages.saveTheDateEnabled": Boolean(
      flags.saveTheDateEnabled
    ),
    "salesUpsells.preRsvpMessages.invitationOnlyEnabled": Boolean(
      flags.invitationOnlyEnabled
    ),
    ...(flags.givenFree
      ? { "salesUpsells.preRsvpMessages.givenFree": true }
      : {}),
  };
}

/**
 * One-customer ops grant: open pre-RSVP invitation sending after deploy
 * without waiting for another admin click. Idempotent.
 */
export const PRE_RSVP_INVITATION_GRANTS = [
  "jonathan.crystal@gmail.com",
] as const;

export function shouldGrantPreRsvpInvitation(email: unknown) {
  return PRE_RSVP_INVITATION_GRANTS.includes(
    cleanEmail(email) as (typeof PRE_RSVP_INVITATION_GRANTS)[number]
  );
}

export async function ensurePreRsvpInvitationGrant(user?: {
  _id?: unknown;
  email?: unknown;
  salesUpsells?: {
    preRsvpMessages?: {
      enabled?: boolean | null;
      mode?: string | null;
      saveTheDateEnabled?: boolean | null;
      invitationOnlyEnabled?: boolean | null;
    } | null;
  } | null;
} | null) {
  if (!user?._id || !shouldGrantPreRsvpInvitation(user.email)) {
    return readPreRsvpFlags(user);
  }

  const current = readPreRsvpFlags(user);
  if (current.enabled && current.invitationOnlyEnabled) {
    return current;
  }

  const next = {
    saveTheDateEnabled: current.saveTheDateEnabled,
    invitationOnlyEnabled: true,
    givenFree: true,
  };
  const set = buildPreRsvpMessagesSet(next);

  const { default: User } = await import("@/models/User");
  await User.updateOne({ _id: user._id }, { $set: set });

  return {
    enabled: true,
    mode: preRsvpModeFromFlags(next.saveTheDateEnabled, true),
    saveTheDateEnabled: next.saveTheDateEnabled,
    invitationOnlyEnabled: true,
  };
}
