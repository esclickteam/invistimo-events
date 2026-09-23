/**
 * Invitation mirror fields for scheduled message times (UI / לוח אישורי הגעה).
 * ScheduledMessage is the source of truth for actual send workers;
 * these Invitation fields must stay in sync on create/update/cancel.
 */

export type ScheduleChannel = "sms" | "whatsapp";
export type ScheduleRound = 1 | 2 | 3;

export function normalizeScheduleRound(value: unknown): ScheduleRound {
  const n = Number(value);
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 1;
}

export function normalizeScheduleChannel(value: unknown): ScheduleChannel {
  return value === "whatsapp" ? "whatsapp" : "sms";
}

export function normalizeScheduleType(value: unknown): string {
  const type = String(value || "").toLowerCase();
  if (type === "thank_you" || type === "thank-you") return "thankyou";
  if (type === "table" || type === "rsvp_reminder") return "reminder";
  return type;
}

export function getRsvpScheduledField(
  channel: ScheduleChannel,
  round: ScheduleRound
) {
  return channel === "sms"
    ? `rsvpSmsRound${round}ScheduledAt`
    : `rsvpWhatsappRound${round}ScheduledAt`;
}

export function getReminderScheduledField(channel: ScheduleChannel) {
  return channel === "sms" ? "reminderSmsScheduledAt" : "reminderScheduledAt";
}

export function getThankYouScheduledField(channel: ScheduleChannel) {
  return channel === "sms" ? "thankYouSmsScheduledAt" : "thankYouScheduledAt";
}

/**
 * Build $set patch for Invitation when a schedule time is created/updated.
 * Returns null when the schedule type has no invitation mirror field.
 */
export function buildInvitationScheduleSetPatch(params: {
  type: unknown;
  channel: unknown;
  round?: unknown;
  scheduledAt: Date;
}): Record<string, Date> | null {
  const type = normalizeScheduleType(params.type);
  const channel = normalizeScheduleChannel(params.channel);
  const { scheduledAt } = params;

  if (type === "rsvp") {
    const round = normalizeScheduleRound(params.round);
    return { [getRsvpScheduledField(channel, round)]: scheduledAt };
  }

  if (type === "reminder") {
    return { [getReminderScheduledField(channel)]: scheduledAt };
  }

  if (type === "thankyou") {
    return { [getThankYouScheduledField(channel)]: scheduledAt };
  }

  return null;
}

/**
 * Build $set patch that clears Invitation mirror fields when a schedule is cancelled/deleted.
 */
export function buildInvitationScheduleClearPatch(params: {
  type: unknown;
  channel: unknown;
  round?: unknown;
}): Record<string, null> | null {
  const type = normalizeScheduleType(params.type);
  const channel = normalizeScheduleChannel(params.channel);

  if (type === "rsvp") {
    const round = normalizeScheduleRound(params.round);
    return { [getRsvpScheduledField(channel, round)]: null };
  }

  if (type === "reminder") {
    return {
      reminderScheduledAt: null,
      reminderSmsScheduledAt: null,
    };
  }

  if (type === "thankyou") {
    return {
      thankYouScheduledAt: null,
      thankYouSmsScheduledAt: null,
    };
  }

  return null;
}
