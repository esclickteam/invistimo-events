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

/**
 * Fill missing coordinates only. Uses the native collection API so a
 * pipeline `$ifNull` update cannot be mangled by Mongoose document casting.
 * Never throws to callers — a failed pin write must not 500 the invite page.
 */
export async function persistEventLocationPin(options: {
  invitationId?: unknown;
  eventId?: unknown;
  pin: MapPin;
}) {
  try {
    const invitationId = asId(options.invitationId);
    const eventId = asId(options.eventId);
    const now = new Date();
    const lat = Number(options.pin.lat);
    const lng = Number(options.pin.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const writes: Promise<unknown>[] = [];

    if (invitationId) {
      const invitationObjectId = new mongoose.Types.ObjectId(invitationId);
      writes.push(
        Invitation.collection.updateOne({ _id: invitationObjectId }, [
          {
            $set: {
              "location.lat": { $ifNull: ["$location.lat", lat] },
              "location.lng": { $ifNull: ["$location.lng", lng] },
              updatedAt: now,
            },
          },
        ])
      );
      writes.push(
        Invitation.collection.updateOne(
          {
            _id: invitationObjectId,
            "weddingWebsite.content": { $exists: true },
          },
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
        Event.collection.updateOne(
          { _id: new mongoose.Types.ObjectId(eventId) },
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
  } catch (error) {
    console.error("❌ persistEventLocationPin failed:", error);
  }
}

export async function persistParkingPin(options: {
  invitationId?: unknown;
  pin: MapPin;
}) {
  try {
    const invitationId = asId(options.invitationId);
    if (!invitationId) return;

    const lat = Number(options.pin.lat);
    const lng = Number(options.pin.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    await Invitation.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(invitationId) },
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
  } catch (error) {
    console.error("❌ persistParkingPin failed:", error);
  }
}

export async function resolveAndPersistEventLocation(
  invitation?: any,
  event?: any
) {
  const resolved = resolveEventLocation(invitation, event);
  if (hasExactCoordinates(resolved)) return resolved;

  try {
    const pin = await resolveMapPin(resolved);
    if (!pin) {
      console.error(
        `❌ Guest page could not resolve a pin for "${
          resolved.address || resolved.name || "unknown location"
        }". Navigation will fall back to a text search.`
      );
      return resolved;
    }

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
  } catch (error) {
    // Never let map resolution take down /invite or /e for guests.
    console.error("❌ resolveAndPersistEventLocation failed:", error);
    return resolved;
  }
}
