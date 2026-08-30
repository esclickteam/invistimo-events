import mongoose from "mongoose";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import {
  hasExactCoordinates,
  resolveEventLocation,
} from "@/lib/navigationLinks";
import {
  enrichPlaceMetaNearPin,
  resolveMapPin,
  type MapPin,
} from "@/lib/resolveMapPin";

function asId(value: unknown) {
  const id = String(value || "").trim();
  return mongoose.Types.ObjectId.isValid(id) ? id : "";
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function emptyStringOrMissing(fieldPath: string) {
  return {
    $or: [
      { $eq: [{ $ifNull: [fieldPath, ""] }, ""] },
      { $eq: [{ $ifNull: [fieldPath, null] }, null] },
    ],
  };
}

/**
 * Fill missing coordinates and place labels only. Uses the native collection
 * API so a pipeline `$ifNull` update cannot be mangled by Mongoose document
 * casting. Never throws to callers — a failed pin write must not 500 the
 * invite page.
 *
 * When attaching a placeId for the first time, also refresh placeName /
 * formattedAddress from Google so Maps can show the venue card.
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
    const placeId = cleanText(options.pin.placeId);
    const placeName = cleanText(options.pin.placeName);
    const formattedAddress = cleanText(options.pin.formattedAddress);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const locationSet: Record<string, unknown> = {
      "location.lat": { $ifNull: ["$location.lat", lat] },
      "location.lng": { $ifNull: ["$location.lng", lng] },
      updatedAt: now,
    };

    if (placeId) {
      const placeIdMissing = emptyStringOrMissing("$location.placeId");
      locationSet["location.placeId"] = {
        $cond: [placeIdMissing, placeId, "$location.placeId"],
      };

      // First time we discover the Google place card, prefer its labels over
      // whatever typed address string was stored as a temporary placeName.
      if (placeName) {
        locationSet["location.placeName"] = {
          $cond: [
            placeIdMissing,
            placeName,
            {
              $cond: [
                emptyStringOrMissing("$location.placeName"),
                placeName,
                "$location.placeName",
              ],
            },
          ],
        };
      }
      if (formattedAddress) {
        locationSet["location.formattedAddress"] = {
          $cond: [
            placeIdMissing,
            formattedAddress,
            {
              $cond: [
                emptyStringOrMissing("$location.formattedAddress"),
                formattedAddress,
                "$location.formattedAddress",
              ],
            },
          ],
        };
      }
    } else {
      if (placeName) {
        locationSet["location.placeName"] = {
          $cond: [
            emptyStringOrMissing("$location.placeName"),
            placeName,
            "$location.placeName",
          ],
        };
      }
      if (formattedAddress) {
        locationSet["location.formattedAddress"] = {
          $cond: [
            emptyStringOrMissing("$location.formattedAddress"),
            formattedAddress,
            "$location.formattedAddress",
          ],
        };
      }
    }

    const writes: Promise<unknown>[] = [];

    if (invitationId) {
      const invitationObjectId = new mongoose.Types.ObjectId(invitationId);
      writes.push(
        Invitation.collection.updateOne({ _id: invitationObjectId }, [
          { $set: locationSet },
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
          [{ $set: locationSet }]
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

  if (hasExactCoordinates(resolved)) {
    if (resolved.placeId) return resolved;

    // Existing events may have a pin without a Google place card. Look up the
    // placeId near the saved coordinates so Maps can show the venue name.
    try {
      const enriched = await enrichPlaceMetaNearPin(resolved);
      if (!enriched.pin?.placeId) return resolved;

      await persistEventLocationPin({
        invitationId: invitation?._id,
        eventId: event?._id || invitation?.eventId,
        pin: {
          lat: resolved.lat as number,
          lng: resolved.lng as number,
          placeId: enriched.pin.placeId,
          placeName: enriched.pin.placeName,
          formattedAddress: enriched.pin.formattedAddress,
        },
      });

      return {
        ...resolved,
        placeId: enriched.pin.placeId,
        placeName: enriched.pin.placeName || resolved.placeName,
        formattedAddress:
          enriched.pin.formattedAddress || resolved.formattedAddress,
      };
    } catch (error) {
      console.error("❌ placeId backfill failed:", error);
      return resolved;
    }
  }

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
      placeId: pin.placeId || resolved.placeId,
      placeName: pin.placeName || resolved.placeName,
      formattedAddress: pin.formattedAddress || resolved.formattedAddress,
    };
  } catch (error) {
    // Never let map resolution take down /invite or /e for guests.
    console.error("❌ resolveAndPersistEventLocation failed:", error);
    return resolved;
  }
}
