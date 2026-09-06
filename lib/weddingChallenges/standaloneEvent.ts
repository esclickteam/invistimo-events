import { nanoid } from "nanoid";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import { defaultWeddingChallengeSettings } from "./settings";
import { getOrCreateChallengeConfig } from "./service";
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

  const maxGuests = Math.max(Number(owner.maxGuests || owner.guests || 0), 300);
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

  return { event, invitation, config, sourceType: "STANDALONE_GAME" as const };
}

export async function activateExistingEventForWeddingChallenges(params: {
  eventId: string;
  ownerUserId: string;
  startAt?: string | null;
  endAt?: string | null;
}) {
  const event = await Event.findById(params.eventId);
  if (!event || event.status === "archived") {
    throw new Error("EVENT_NOT_FOUND");
  }

  const invitation = await Invitation.findOne({ eventId: event._id });
  if (!invitation) {
    throw new Error("INVITATION_NOT_FOUND");
  }

  const config = await getOrCreateChallengeConfig({
    eventId: String(event._id),
    invitationId: String(invitation._id),
    ownerUserId: String(event.userId),
    sourceType: "EXISTING_EVENT",
  });

  if (params.startAt !== undefined || params.endAt !== undefined) {
    if (params.startAt !== undefined) config.settings.startAt = params.startAt;
    if (params.endAt !== undefined) config.settings.endAt = params.endAt;
  }
  config.sourceType = "EXISTING_EVENT";
  await config.save();

  return { event, invitation, config, sourceType: "EXISTING_EVENT" as const };
}
