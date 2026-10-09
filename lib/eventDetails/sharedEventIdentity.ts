/**
 * Central shared-identity layer for guest-facing event details.
 *
 * Invitation is the source of truth for what guests see:
 * title, date, time, event type, location/navigation, gifts.
 *
 * Event stays the source of truth for production: budget, seating,
 * check-in, transportation, venue link.
 *
 * This module never creates an Invitation, never picks a "primary"
 * invitation, and never overwrites a real value with a placeholder
 * or with a conflicting real value from the other document.
 */

import {
  type CentralGiftOptions,
  isPlaceholderEventTitle,
  normalizeEventDateValue,
} from "@/lib/eventDetails/centralEventDetails";

export type SharedIdentitySource = "invitation" | "event";

export type SharedLocation = {
  name?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  placeId?: string;
  placeName?: string;
  formattedAddress?: string;
  wazeLat?: number | null;
  wazeLng?: number | null;
  wazeUrl?: string;
};

export type SharedIdentityPatch = {
  title?: string;
  eventType?: string;
  date?: string;
  time?: string;
  location?: SharedLocation | null;
  hostsNames?: string;
  city?: string;
  googleMapsUrl?: string;
  gifts?: CentralGiftOptions | null;
};

export type SharedIdentityConflict = {
  field: string;
  invitationId: string;
  eventValue: string;
  invitationValue: string;
  incomingValue: string;
};

export type SharedIdentityWritePlan = {
  eventSet: Record<string, unknown>;
  invitationUpdates: { id: string; set: Record<string, unknown> }[];
  conflicts: SharedIdentityConflict[];
};

export type SharedIdentityWriteResult = SharedIdentityWritePlan & {
  eventUpdated: boolean;
  invitationsUpdated: number;
};

export type SharedIdentityClass =
  | "match"
  | "event-shell-invitation-real"
  | "invitation-shell-event-real"
  | "real-conflict"
  | "event-only-production"
  | "invitation-only";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function idString(value: unknown) {
  return value ? String(value) : "";
}

export function isRealTitle(value: unknown) {
  return Boolean(clean(value)) && !isPlaceholderEventTitle(value);
}

export function isEmptyTime(value: unknown) {
  return !clean(value);
}

export function isMidnightTime(value: unknown) {
  const raw = clean(value).replace(/[^\d:]/g, "");
  return /^0{1,2}:0{2}(?::0{2})?$/.test(raw);
}

/**
 * A document is a creation shell when its title is still a placeholder.
 * Midnight (00:00) alone is never enough to call a record fake.
 */
export function isIdentityShell(record?: any) {
  if (!record) return true;
  const title = record.title || record.eventTitle || record.eventName;
  return !isRealTitle(title);
}

export function isRealTimeOn(record: any, value: unknown) {
  const time = clean(value);
  if (!time) return false;
  if (isMidnightTime(time) && isIdentityShell(record)) return false;
  return true;
}

export function isDefaultEventType(value: unknown) {
  const type = clean(value);
  return !type || type === "wedding";
}

export function isRealEventTypeOn(record: any, value: unknown) {
  const type = clean(value);
  if (!type) return false;
  if (type === "wedding" && isIdentityShell(record)) return false;
  return true;
}

export function extractInvitationIdentity(invitation?: any): SharedIdentityPatch {
  if (!invitation) return {};
  const loc = invitation.location || {};
  return {
    title: clean(invitation.title || invitation.eventTitle),
    eventType: clean(invitation.eventType),
    date: normalizeEventDateValue(invitation.eventDate || invitation.date),
    time: clean(invitation.eventTime || invitation.time),
    location: loc,
    hostsNames:
      invitation.hostsNames !== undefined ? clean(invitation.hostsNames) : undefined,
    city: invitation.city !== undefined ? clean(invitation.city) : undefined,
    googleMapsUrl:
      invitation.googleMapsUrl !== undefined
        ? clean(invitation.googleMapsUrl)
        : undefined,
  };
}

export function extractEventIdentity(event?: any): SharedIdentityPatch {
  if (!event) return {};
  const loc = event.location || {};
  return {
    title: clean(event.title),
    eventType: clean(event.eventType),
    date: normalizeEventDateValue(event.date || event.eventDate),
    time: clean(event.time || event.eventTime),
    location: loc,
    hostsNames: event.hostsNames !== undefined ? clean(event.hostsNames) : undefined,
    city: event.city !== undefined ? clean(event.city) : undefined,
    googleMapsUrl:
      event.googleMapsUrl !== undefined ? clean(event.googleMapsUrl) : undefined,
  };
}

function locationFingerprint(loc?: SharedLocation | null) {
  if (!loc) return "";
  return [
    clean(loc.name),
    clean(loc.address || loc.formattedAddress),
    loc.lat ?? "",
    loc.lng ?? "",
    clean(loc.wazeUrl),
  ].join("|");
}

function hasLocationData(loc?: SharedLocation | null) {
  if (!loc) return false;
  return Boolean(
    clean(loc.name) ||
      clean(loc.address) ||
      clean(loc.formattedAddress) ||
      loc.lat != null ||
      loc.lng != null ||
      clean(loc.wazeUrl)
  );
}

function optionalCoord(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function locationSet(prefix: "event" | "invitation", loc: SharedLocation) {
  if (prefix === "event") {
    const set: Record<string, unknown> = {
      "location.name": clean(loc.name),
      "location.address": clean(loc.address),
      "location.placeId": clean(loc.placeId),
      "location.placeName": clean(loc.placeName),
      "location.formattedAddress": clean(loc.formattedAddress),
      "location.wazeUrl": clean(loc.wazeUrl),
    };
    const lat = optionalCoord(loc.lat);
    const lng = optionalCoord(loc.lng);
    const wazeLat = optionalCoord(loc.wazeLat);
    const wazeLng = optionalCoord(loc.wazeLng);
    if (lat !== undefined) set["location.lat"] = lat;
    if (lng !== undefined) set["location.lng"] = lng;
    if (wazeLat !== undefined) set["location.wazeLat"] = wazeLat;
    if (wazeLng !== undefined) set["location.wazeLng"] = wazeLng;
    return set;
  }
  const location: SharedLocation = {
    name: clean(loc.name),
    address: clean(loc.address),
    placeId: clean(loc.placeId),
    placeName: clean(loc.placeName),
    formattedAddress: clean(loc.formattedAddress),
    wazeUrl: clean(loc.wazeUrl),
  };
  const lat = optionalCoord(loc.lat);
  const lng = optionalCoord(loc.lng);
  const wazeLat = optionalCoord(loc.wazeLat);
  const wazeLng = optionalCoord(loc.wazeLng);
  if (lat !== undefined) location.lat = lat;
  if (lng !== undefined) location.lng = lng;
  if (wazeLat !== undefined) location.wazeLat = wazeLat;
  if (wazeLng !== undefined) location.wazeLng = wazeLng;
  return { location };
}

function shouldWriteScalar(args: {
  incoming: string;
  existing: string;
  incomingIsReal: boolean;
  existingIsReal: boolean;
  allowOverwriteReal: boolean;
}): "write" | "skip" | "conflict" {
  if (!args.incomingIsReal) return "skip";
  if (!args.existing || !args.existingIsReal) return "write";
  if (args.existing === args.incoming) return "skip";
  if (args.allowOverwriteReal) return "write";
  return "conflict";
}

/**
 * Plan mirror writes. Never creates invitations. Never picks a primary.
 * Invitation-sourced real values update Event (guest identity mirrors).
 * Event-sourced real values update an invitation only when that invitation
 * field is empty/placeholder or already equal. Real conflicts are reported.
 */
export function planSharedIdentityMirror(input: {
  source: SharedIdentitySource;
  incoming: SharedIdentityPatch;
  event?: any | null;
  invitations?: any[];
  sourceInvitationId?: string;
}): SharedIdentityWritePlan {
  const invitations = Array.isArray(input.invitations) ? input.invitations : [];
  const eventSet: Record<string, unknown> = {};
  const invitationUpdates: { id: string; set: Record<string, unknown> }[] = [];
  const conflicts: SharedIdentityConflict[] = [];
  const allowOverwriteEvent = input.source === "invitation";

  const incomingTitle = clean(input.incoming.title);
  const incomingType = clean(input.incoming.eventType);
  const incomingDate = normalizeEventDateValue(input.incoming.date);
  const incomingTime = clean(input.incoming.time);
  const incomingLoc = input.incoming.location || null;
  const incomingHasLocation = hasLocationData(incomingLoc);

  const incomingRecord = {
    title: incomingTitle,
    eventType: incomingType,
  };

  if (input.event) {
    const current = extractEventIdentity(input.event);
    const titleDecision = shouldWriteScalar({
      incoming: incomingTitle,
      existing: clean(current.title),
      incomingIsReal: isRealTitle(incomingTitle),
      existingIsReal: isRealTitle(current.title),
      allowOverwriteReal: allowOverwriteEvent,
    });
    if (titleDecision === "write") eventSet.title = incomingTitle;
    if (titleDecision === "conflict") {
      conflicts.push({
        field: "title",
        invitationId: input.sourceInvitationId || "",
        eventValue: clean(current.title),
        invitationValue: incomingTitle,
        incomingValue: incomingTitle,
      });
    }

    const typeDecision = shouldWriteScalar({
      incoming: incomingType,
      existing: clean(current.eventType),
      incomingIsReal: isRealEventTypeOn(incomingRecord, incomingType),
      existingIsReal: isRealEventTypeOn(input.event, current.eventType),
      allowOverwriteReal: allowOverwriteEvent,
    });
    if (typeDecision === "write") eventSet.eventType = incomingType;

    const dateDecision = shouldWriteScalar({
      incoming: incomingDate,
      existing: clean(current.date),
      incomingIsReal: Boolean(incomingDate),
      existingIsReal: Boolean(current.date) && !isIdentityShell(input.event),
      allowOverwriteReal: allowOverwriteEvent,
    });
    if (dateDecision === "write") eventSet.date = incomingDate;
    if (dateDecision === "conflict") {
      conflicts.push({
        field: "date",
        invitationId: input.sourceInvitationId || "",
        eventValue: clean(current.date),
        invitationValue: incomingDate,
        incomingValue: incomingDate,
      });
    }

    const timeDecision = shouldWriteScalar({
      incoming: incomingTime,
      existing: clean(current.time),
      incomingIsReal: isRealTimeOn(incomingRecord, incomingTime),
      existingIsReal: isRealTimeOn(input.event, current.time),
      allowOverwriteReal: allowOverwriteEvent,
    });
    if (timeDecision === "write") eventSet.time = incomingTime;

    if (incomingHasLocation && incomingLoc) {
      const existingFp = locationFingerprint(current.location || null);
      const incomingFp = locationFingerprint(incomingLoc);
      const existingReal =
        hasLocationData(current.location || null) && !isIdentityShell(input.event);
      if (!existingReal || existingFp === incomingFp || allowOverwriteEvent) {
        Object.assign(eventSet, locationSet("event", incomingLoc));
      } else if (existingFp !== incomingFp) {
        conflicts.push({
          field: "location",
          invitationId: input.sourceInvitationId || "",
          eventValue: existingFp,
          invitationValue: incomingFp,
          incomingValue: incomingFp,
        });
      }
    }

    if (input.incoming.hostsNames !== undefined && clean(input.incoming.hostsNames)) {
      eventSet.hostsNames = clean(input.incoming.hostsNames);
    }
    if (input.incoming.city !== undefined) {
      eventSet.city = clean(input.incoming.city);
    }
    if (input.incoming.googleMapsUrl !== undefined) {
      eventSet.googleMapsUrl = clean(input.incoming.googleMapsUrl);
    }
    if (input.incoming.gifts) {
      eventSet.gifts = input.incoming.gifts;
      eventSet.giftCreditUrl = input.incoming.gifts.creditEnabled
        ? input.incoming.gifts.creditUrl
        : "";
    }
  }

  if (input.source === "event") {
    for (const invitation of invitations) {
      const invitationId = idString(invitation?._id);
      if (!invitationId) continue;
      const current = extractInvitationIdentity(invitation);
      const set: Record<string, unknown> = {};

      const titleDecision = shouldWriteScalar({
        incoming: incomingTitle,
        existing: clean(current.title),
        incomingIsReal: isRealTitle(incomingTitle),
        existingIsReal: isRealTitle(current.title),
        allowOverwriteReal: false,
      });
      if (titleDecision === "write") {
        set.title = incomingTitle;
        set.eventTitle = incomingTitle;
      }
      if (titleDecision === "conflict") {
        conflicts.push({
          field: "title",
          invitationId,
          eventValue: incomingTitle,
          invitationValue: clean(current.title),
          incomingValue: incomingTitle,
        });
      }

      const typeDecision = shouldWriteScalar({
        incoming: incomingType,
        existing: clean(current.eventType),
        incomingIsReal: isRealEventTypeOn(incomingRecord, incomingType),
        existingIsReal: isRealEventTypeOn(invitation, current.eventType),
        allowOverwriteReal: false,
      });
      if (typeDecision === "write") set.eventType = incomingType;

      const dateDecision = shouldWriteScalar({
        incoming: incomingDate,
        existing: clean(current.date),
        incomingIsReal: Boolean(incomingDate),
        existingIsReal: Boolean(current.date) && !isIdentityShell(invitation),
        allowOverwriteReal: false,
      });
      if (dateDecision === "write") {
        set.eventDate = incomingDate;
      }
      if (dateDecision === "conflict") {
        conflicts.push({
          field: "date",
          invitationId,
          eventValue: incomingDate,
          invitationValue: clean(current.date),
          incomingValue: incomingDate,
        });
      }

      const timeDecision = shouldWriteScalar({
        incoming: incomingTime,
        existing: clean(current.time),
        incomingIsReal: isRealTimeOn(incomingRecord, incomingTime),
        existingIsReal: isRealTimeOn(invitation, current.time),
        allowOverwriteReal: false,
      });
      if (timeDecision === "write") set.eventTime = incomingTime;
      if (timeDecision === "conflict") {
        conflicts.push({
          field: "time",
          invitationId,
          eventValue: incomingTime,
          invitationValue: clean(current.time),
          incomingValue: incomingTime,
        });
      }

      if (incomingHasLocation && incomingLoc) {
        const existingFp = locationFingerprint(current.location || null);
        const incomingFp = locationFingerprint(incomingLoc);
        const existingReal =
          hasLocationData(current.location || null) &&
          !isIdentityShell(invitation);
        if (!existingReal || existingFp === incomingFp) {
          Object.assign(set, locationSet("invitation", incomingLoc));
        } else if (existingFp !== incomingFp) {
          conflicts.push({
            field: "location",
            invitationId,
            eventValue: incomingFp,
            invitationValue: existingFp,
            incomingValue: incomingFp,
          });
        }
      }

      if (Object.keys(set).length) {
        set.updatedAt = new Date();
        invitationUpdates.push({ id: invitationId, set });
      }
    }
  }

  if (Object.keys(eventSet).length) {
    eventSet.updatedAt = new Date();
  }

  return { eventSet, invitationUpdates, conflicts };
}

export function classifySharedIdentity(
  event?: any | null,
  invitation?: any | null
): SharedIdentityClass {
  if (event && !invitation) return "event-only-production";
  if (!event && invitation) return "invitation-only";
  if (!event && !invitation) return "match";

  const eventReal = !isIdentityShell(event);
  const invitationReal = !isIdentityShell(invitation);
  const eventDate = normalizeEventDateValue(event?.date || event?.eventDate);
  const invitationDate = normalizeEventDateValue(
    invitation?.eventDate || invitation?.date
  );
  const eventTime = clean(event?.time || event?.eventTime);
  const invitationTime = clean(invitation?.eventTime || invitation?.time);
  const titleConflict =
    eventReal &&
    invitationReal &&
    clean(event?.title) !== clean(invitation?.title);
  const dateConflict =
    eventReal &&
    invitationReal &&
    eventDate &&
    invitationDate &&
    eventDate !== invitationDate;
  const timeConflict =
    isRealTimeOn(event, eventTime) &&
    isRealTimeOn(invitation, invitationTime) &&
    eventTime !== invitationTime;

  if (titleConflict || dateConflict || timeConflict) return "real-conflict";
  if (!eventReal && invitationReal) return "event-shell-invitation-real";
  if (eventReal && !invitationReal) return "invitation-shell-event-real";
  return "match";
}

export function sanitizeCreatedTitle(value: unknown) {
  const title = clean(value);
  return isRealTitle(title) ? title : "";
}

/** Invitation.title is required. Empty string fails mongoose validation. */
export const INVITATION_SCHEMA_TITLE_FALLBACK = "הזמנה חדשה";

export function invitationCreateTitle(value: unknown) {
  return sanitizeCreatedTitle(value) || INVITATION_SCHEMA_TITLE_FALLBACK;
}

export function sanitizeCreatedTime(value: unknown, title?: unknown) {
  const time = clean(value);
  if (!time) return "";
  if (isMidnightTime(time) && !isRealTitle(title)) return "";
  return time;
}
