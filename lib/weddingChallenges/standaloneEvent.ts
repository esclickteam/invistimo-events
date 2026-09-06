import { nanoid } from "nanoid";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import { defaultWeddingChallengeSettings } from "./settings";
import { gameWindowState, isEventDatePast } from "./gameWindow";
import { getOrCreateChallengeConfig } from "./service";
import { linkEntitlementToEvent } from "./purchase";
import { WEDDING_CHALLENGES_MAX_GUESTS } from "./constants";
import {
  wouldExceedWeddingChallengesGuestLimit,
  weddingChallengesGuestLimitPayload,
} from "./guestLimit";
import { attendingGuestMongoFilter } from "./sourceType";
import type { WeddingChallengeSettings } from "./types";

function clean(value: unknown) {
  return String(value || "").trim();
}

function eventTimeFromIso(value?: string | null) {
  if (!value) return "20:00";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "20:00";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export async function createStandaloneWeddingChallengesEvent(params: {
  ownerUserId: string;
  coupleNames: string;
  eventDate: string;
  startAt?: string | null;
  endAt?: string | null;
}) {
  const coupleNames = clean(params.coupleNames);
  const eventDate = clean(params.eventDate);
  if (!coupleNames) {
    throw new Error("COUPLE_NAMES_REQUIRED");
  }
  if (!eventDate) {
    throw new Error("EVENT_DATE_REQUIRED");
  }

  const owner = await User.findById(params.ownerUserId)
    .select("email maxGuests guests createdByProducer")
    .lean();
  if (!owner) {
    throw new Error("USER_NOT_FOUND");
  }

  const maxGuests = WEDDING_CHALLENGES_MAX_GUESTS;
  const eventTime = eventTimeFromIso(params.startAt);

  const event = await Event.create({
    userId: params.ownerUserId,
    producerId: owner.createdByProducer || undefined,
    email: owner.email || "noemail@placeholder.com",
    eventType: "wedding",
    title: coupleNames,
    date: eventDate,
    time: eventTime,
    maxGuests,
    estimatedGuests: maxGuests,
    estimatedGuestCount: maxGuests,
    productType: "wedding_challenges",
    paymentStatus: "paid",
    status: "active",
  });

  const invitation = await Invitation.create({
    ownerId: params.ownerUserId,
    producerId: owner.createdByProducer || null,
    eventId: event._id,
    title: coupleNames,
    eventType: "wedding",
    eventDate,
    eventTime,
    canvasData: {},
    shareId: nanoid(10),
    guests: [],
    maxGuests,
    maxMessages: maxGuests * 3,
    standaloneGame: true,
    publicEventPage: { enabled: false },
  });

  const settings = defaultWeddingChallengeSettings({
    enabled: true,
    startAt: params.startAt || null,
    endAt: params.endAt || null,
  } as Partial<WeddingChallengeSettings>);

  const config = await getOrCreateChallengeConfig({
    eventId: String(event._id),
    invitationId: String(invitation._id),
    ownerUserId: params.ownerUserId,
    sourceType: "STANDALONE_GAME",
  });
  config.settings = settings;
  config.sourceType = "STANDALONE_GAME";
  await config.save();

  await linkEntitlementToEvent({
    userId: params.ownerUserId,
    eventId: String(event._id),
    sourceType: "STANDALONE_GAME",
  });

  return { event, invitation, config, sourceType: "STANDALONE_GAME" as const };
}

export async function activateExistingEventForWeddingChallenges(params: {
  eventId: string;
  ownerUserId: string;
  startAt?: string | null;
  endAt?: string | null;
  confirmPastEvent?: boolean;
  timezone?: string;
}) {
  const event = await Event.findById(params.eventId);
  if (!event || event.status === "archived") {
    throw new Error("EVENT_NOT_FOUND");
  }

  const invitation = await Invitation.findOne({ eventId: event._id });
  if (!invitation) {
    throw new Error("INVITATION_NOT_FOUND");
  }

  if (isEventDatePast(event.date) && !params.confirmPastEvent) {
    throw new Error("EVENT_DATE_PAST");
  }

  const eligibleCount = await InvitationGuest.countDocuments({
    invitationId: invitation._id,
    ...attendingGuestMongoFilter("EXISTING_EVENT"),
  });
  if (wouldExceedWeddingChallengesGuestLimit(eligibleCount, 0)) {
    const limit = weddingChallengesGuestLimitPayload();
    throw new Error(limit.message);
  }

  const config = await getOrCreateChallengeConfig({
    eventId: String(event._id),
    invitationId: String(invitation._id),
    ownerUserId: String(event.userId),
    sourceType: "EXISTING_EVENT",
  });

  const explicitStart = params.startAt !== undefined ? params.startAt : undefined;
  const explicitEnd = params.endAt !== undefined ? params.endAt : undefined;
  const inheritedWindow = gameWindowState(config.settings || {});
  if (explicitStart !== undefined || explicitEnd !== undefined) {
    if (explicitStart !== undefined) config.settings.startAt = explicitStart;
    if (explicitEnd !== undefined) config.settings.endAt = explicitEnd;
  } else if (inheritedWindow === "ended" || inheritedWindow === "unconfigured") {
    // Never silently keep a past/empty window from Event.date or a previous save.
    config.settings.startAt = null;
    config.settings.endAt = null;
  }
  config.settings.enabled = true;
  config.sourceType = "EXISTING_EVENT";
  await config.save();

  await linkEntitlementToEvent({
    userId: params.ownerUserId,
    eventId: String(event._id),
    sourceType: "EXISTING_EVENT",
  });

  return { event, invitation, config, sourceType: "EXISTING_EVENT" as const };
}
