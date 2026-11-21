/**
 * Audience for one WhatsApp execution.
 *
 * The Mongo query, invitation-only post-filters, kosher split, phone
 * digits, and table visibility all come from the modules the legacy
 * worker already uses. This file does not add a business rule.
 */

import { toWhatsappDigits } from "@/lib/phones/international";
import { filterGuestsByInvitationAudience } from "@/lib/messages/invitationOnlyDetails";
import {
  buildScheduledGuestsQuery,
  needsInvitationDeliveryStatusPostFilter,
  needsNeverInvitedPostFilter,
  normalizeScheduleRound,
  scheduleUsesExplicitGuestIds,
} from "@/lib/messages/resolveScheduledAudience";
import {
  getEventReminderTableVisibility,
  getGuestTableDisplayName,
  guestHasAssignedTable,
  shouldIncludeTableNumber,
} from "@/lib/messages/resolveReminderSmsTemplate";
import {
  partitionMessageGuestsForKosherService,
  type KosherPrefixRule,
} from "@/lib/kosherPhones/match";
import { buildEngineTemplateMessage, type HeaderMediaRef, type TemplateComponent } from "@/lib/whatsapp/engine/message";

export type EngineGuest = {
  _id: string;
  invitationId: string;
  phone?: unknown;
  rsvp?: unknown;
  token?: unknown;
  name?: unknown;
  tableName?: unknown;
  tableNumber?: unknown;
  tableId?: unknown;
};

export type EngineScheduleCriteria = {
  type?: unknown;
  templateKey?: unknown;
  round?: unknown;
  roundNumber?: unknown;
  filter?: unknown;
  guestIds?: unknown;
  templateName?: unknown;
};

export type EngineGuards = {
  purged?: boolean;
  roundNotAllowed?: boolean;
  roundAlreadySent?: boolean;
  reminderAlreadySent?: boolean;
  thankYouAlreadySent?: boolean;
  scheduleCancelled?: boolean;
};

export type AudienceSkip = {
  guestId: string;
  reason: "INVALID_PHONE" | "MISSING_PHONE" | "KOSHER_ROUTE";
};

export type PlannedRecipient = {
  guestId: string;
  phone: string;
  idempotencyKey: string;
  includeTableNumber: boolean;
  message: ReturnType<typeof buildEngineTemplateMessage>;
};

export type AudiencePlan = {
  blockedReason: string | null;
  expectedCount: number;
  recipients: PlannedRecipient[];
  skipped: AudienceSkip[];
  kosherGuestIds: string[];
  query: Record<string, unknown> | null;
};

const BLOCKS: Array<[keyof EngineGuards, string]> = [
  ["scheduleCancelled", "SCHEDULE_CANCELLED"],
  ["purged", "CUSTOMER_PURGED"],
  ["roundNotAllowed", "ROUND_NOT_ALLOWED"],
  ["roundAlreadySent", "ROUND_ALREADY_SENT"],
  ["reminderAlreadySent", "REMINDER_ALREADY_SENT"],
  ["thankYouAlreadySent", "THANKYOU_ALREADY_SENT"],
];

function guestMatchesQuery(guest: EngineGuest, query: Record<string, unknown>) {
  if (String(guest.invitationId) !== String(query.invitationId)) return false;
  if (query.rsvp != null && String(guest.rsvp || "pending") !== String(query.rsvp)) {
    return false;
  }
  if (Array.isArray(query.$or)) {
    return guestHasAssignedTable(guest);
  }
  return true;
}

export function whatsappIdempotencyKey(input: {
  type: string;
  invitationId: string;
  round: number;
  guestId: string;
  scheduleId: string;
  templateName: string;
}) {
  return [
    "whatsapp",
    input.type,
    input.invitationId,
    String(input.round),
    input.guestId,
    input.scheduleId,
    input.templateName,
  ].join(":");
}

export function planWhatsappAudience(input: {
  invitationId: string;
  scheduleId: string;
  schedule: EngineScheduleCriteria;
  guests: EngineGuest[];
  shareId: string;
  rsvpSiteMode?: unknown;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  header: HeaderMediaRef | null;
  templateName: string;
  guards?: EngineGuards;
  quotaRemaining?: number;
  kosherEnabled?: boolean;
  kosherPrefixes?: KosherPrefixRule[];
  hideTableNumberForAll?: boolean;
  hiddenTableIds?: string[];
  alreadyInvitedGuestIds?: Set<string>;
  deliveryStatusGuestIds?: Set<string>;
  passthroughComponents?: TemplateComponent[] | null;
}): AudiencePlan {
  const empty = (blockedReason: string | null, query: Record<string, unknown> | null): AudiencePlan => ({
    blockedReason,
    expectedCount: 0,
    recipients: [],
    skipped: [],
    kosherGuestIds: [],
    query,
  });

  for (const [key, reason] of BLOCKS) {
    if (input.guards?.[key]) return empty(reason, null);
  }

  const type = String(input.schedule.type || input.schedule.templateKey || "custom");
  const round = normalizeScheduleRound(input.schedule.round ?? input.schedule.roundNumber);
  let selected: EngineGuest[];
  let query: Record<string, unknown> | null = null;

  if (scheduleUsesExplicitGuestIds(input.schedule)) {
    const ids = new Set(
      (Array.isArray(input.schedule.guestIds) ? input.schedule.guestIds : []).map(String)
    );
    selected = input.guests.filter(
      (guest) =>
        String(guest.invitationId) === input.invitationId && ids.has(String(guest._id))
    );
  } else {
    query = buildScheduledGuestsQuery({
      schedule: input.schedule,
      invitationId: input.invitationId,
    });
    selected = input.guests.filter((guest) => guestMatchesQuery(guest, query!));
    if (needsNeverInvitedPostFilter(input.schedule)) {
      selected = filterGuestsByInvitationAudience({
        guests: selected,
        filter: "never_invited",
        alreadyInvitedGuestIds: input.alreadyInvitedGuestIds,
      });
    }
    const deliveryFilter = needsInvitationDeliveryStatusPostFilter(input.schedule);
    if (deliveryFilter) {
      selected = filterGuestsByInvitationAudience({
        guests: selected,
        filter: deliveryFilter,
        deliveryStatusGuestIds: input.deliveryStatusGuestIds,
      });
    }
  }

  const split = partitionMessageGuestsForKosherService({
    enabled: input.kosherEnabled === true,
    scheduleType: type,
    guests: selected,
    prefixes: input.kosherPrefixes || [],
  });

  const visibility = getEventReminderTableVisibility({
    hideTableNumberForAll: input.hideTableNumberForAll,
    hiddenTableIds: input.hiddenTableIds,
  });
  const skipped: AudienceSkip[] = [];
  const recipients: PlannedRecipient[] = [];

  for (const guest of split.messageGuests) {
    const phone = toWhatsappDigits(guest.phone);
    if (!phone) {
      skipped.push({
        guestId: String(guest._id),
        reason: String(guest.phone || "").trim() ? "INVALID_PHONE" : "MISSING_PHONE",
      });
      continue;
    }
    const includeTableNumber =
      type === "reminder" || type === "table"
        ? shouldIncludeTableNumber({
            hideTableNumberForAll: visibility.hideTableNumberForAll,
            hiddenTableIds: visibility.hiddenTableIds,
            guestTableId: guest.tableId,
            guestHasTable: guestHasAssignedTable(guest),
          })
        : guestHasAssignedTable(guest);
    const templateName = String(input.templateName || input.schedule.templateName || "");
    const message = buildEngineTemplateMessage({
      to: phone,
      type,
      templateName,
      guestName: String(guest.name || ""),
      shareId: input.shareId,
      token: String(guest.token || ""),
      rsvpSiteMode: input.rsvpSiteMode,
      eventTitle: input.eventTitle,
      eventDate: input.eventDate,
      eventLocation: input.eventLocation,
      header: input.header,
      includeTableNumber,
      tableName: includeTableNumber ? getGuestTableDisplayName(guest) : "",
      passthroughComponents: input.passthroughComponents,
    });
    recipients.push({
      guestId: String(guest._id),
      phone,
      idempotencyKey: whatsappIdempotencyKey({
        type,
        invitationId: input.invitationId,
        round,
        guestId: String(guest._id),
        scheduleId: input.scheduleId,
        templateName: message.templateName,
      }),
      includeTableNumber,
      message,
    });
  }

  if (
    typeof input.quotaRemaining === "number" &&
    recipients.length > input.quotaRemaining
  ) {
    return empty("QUOTA_EXHAUSTED", query);
  }

  return {
    blockedReason: null,
    expectedCount: recipients.length,
    recipients,
    skipped,
    kosherGuestIds: split.kosherGuests.map((guest) => String(guest._id)),
    query,
  };
}

export function compareRecipientIds(legacyIds: string[], engineIds: string[]) {
  const legacy = new Set(legacyIds);
  const engine = new Set(engineIds);
  return {
    same: legacyIds.length === engineIds.length && legacyIds.every((id) => engine.has(id)),
    onlyLegacy: legacyIds.filter((id) => !engine.has(id)),
    onlyEngine: engineIds.filter((id) => !legacy.has(id)),
  };
}
