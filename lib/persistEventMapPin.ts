import mongoose from "mongoose";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import {
  hasExactCoordinates,
  resolveEventLocation,
} from "@/lib/navigationLinks";
import { resolveMapPin, type MapPin } from "@/lib/resolveMapPin";

function asId(value: unknown) {
  const id = String(value || "").trim();
  return mongoose.Types.ObjectId.isValid(id) ? id : "";
}

export async function persistEventLocationPin(options: {
  invitationId?: unknown;
  eventId?: unknown;
  pin: MapPin;
}) {
  const invitationId = asId(options.invitationId);
  const eventId = asId(options.eventId);
  const now = new Date();
  const { lat, lng } = options.pin;

  const writes: Promise<unknown>[] = [];

  if (invitationId) {
    writes.push(
      Invitation.updateOne(
        { _id: invitationId },
        [
          {
            $set: {
              "location.lat": { $ifNull: ["$location.lat", lat] },
              "location.lng": { $ifNull: ["$location.lng", lng] },
              updatedAt: now,
            },
          },
        ]
      )
    );
    writes.push(
      Invitation.updateOne(
        { _id: invitationId, "weddingWebsite.content": { $exists: true } },
        [
          {
            $set: {
              "weddingWebsite.content.venueLat": {
                $ifNull: ["$weddingWebsite.content.venueLat", lat],
              },
              "weddingWebsite.content.venueLng": {
                $ifNull: ["$weddingWebsite.content.venueLng", lng],
              },
            },
          },
        ]
      )
    );
  }

  if (eventId) {
    writes.push(
      Event.updateOne(
        { _id: eventId },
        [
          {
            $set: {
              "location.lat": { $ifNull: ["$location.lat", lat] },
              "location.lng": { $ifNull: ["$location.lng", lng] },
              updatedAt: now,
            },
          },
        ]
      )
    );
  }

  if (writes.length) await Promise.all(writes);
}

export async function persistParkingPin(options: {
  invitationId?: unknown;
  pin: MapPin;
}) {
  const invitationId = asId(options.invitationId);
  if (!invitationId) return;

  const { lat, lng } = options.pin;
  await Invitation.updateOne(
    { _id: invitationId },
    [
      {
        $set: {
          "publicEventPage.parking.lat": {
            $ifNull: ["$publicEventPage.parking.lat", lat],
          },
          "publicEventPage.parking.lng": {
            $ifNull: ["$publicEventPage.parking.lng", lng],
          },
        },
      },
    ]
  );
}

export async function resolveAndPersistEventLocation(
  invitation?: any,
  event?: any
) {
  const resolved = resolveEventLocation(invitation, event);
  if (hasExactCoordinates(resolved)) return resolved;

  const pin = await resolveMapPin(resolved);
  if (!pin) return resolved;

  await persistEventLocationPin({
    invitationId: invitation?._id,
    eventId: event?._id || invitation?.eventId,
    pin,
  });

  return {
    ...resolved,
    lat: pin.lat,
    lng: pin.lng,
  };
}
