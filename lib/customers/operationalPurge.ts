import mongoose, { type ClientSession } from "mongoose";

import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import VenueEvent from "@/models/VenueEvent";
import WeddingEventUpload from "@/models/WeddingEventUpload";
import CallRecording from "@/models/CallRecording";
import CustomerFile from "@/models/CustomerFile";
import CustomerLeadMessage from "@/models/CustomerLeadMessage";
import SalesDocument from "@/models/SalesDocument";
import CustomerQuote from "@/models/CustomerQuote";
import CustomerAgreement from "@/models/CustomerAgreement";
import Payment from "@/models/Payment";
import SalesClient from "@/models/SalesClient";
import ShortLink from "@/models/ShortLink";
import User from "@/models/User";
import DeletedCustomerTombstone from "@/models/DeletedCustomerTombstone";

type AnyRecord = Record<string, any>;

const PROTECTED_COLLECTIONS = new Set([
  "salesdocuments",
  "customerquotes",
  "customeragreements",
  "customerfiles",
  "payments",
  "retainedcustomerfinancials",
  "deletedcustomertombstones",
  "users",
  "employeesales",
  "employeeagreements",
  "employeeagreementtemplates",
  "employeeform101s",
  "form101templates",
  "salesclients",
  "clientcontracts",
  "systemsettings",
  "kosherphoneprefixes",
  "ivrcapacitylocks",
  "ivrsystemaudios",
  "ivrsystemvoiceconfigs",
  "admins",
]);

export type OperationalMediaPlan = {
  cloudinaryPublicIds: string[];
  r2Keys: string[];
};

function sessionOptions(session: ClientSession | null) {
  return session ? { session } : {};
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isTransformSegment(segment: string) {
  const parts = segment.split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return false;
  return parts.every((part) =>
    /^(a|ar|b|bo|c|co|dpr|e|f|fl|g|h|l|o|q|r|t|u|w|x|y|z)_[^/]+$/.test(part)
  );
}

export function cloudinaryPublicIdFromUrl(value: unknown) {
  const url = String(value ?? "").trim();
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return "";
  const after = url.split("/upload/")[1]?.split("?")[0]?.split("#")[0] || "";
  const parts = after.split("/").filter(Boolean);
  while (parts.length && (/^v\d+$/.test(parts[0]) || isTransformSegment(parts[0]))) {
    parts.shift();
  }
  if (!parts.length) return "";
  parts[parts.length - 1] = parts[parts.length - 1].replace(/\.[a-z0-9]+$/i, "");
  return parts.join("/");
}

function collectStrings(value: unknown, out: string[], depth = 0) {
  if (depth > 10 || value == null) return;
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out, depth + 1);
    return;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value as AnyRecord)) {
      collectStrings(item, out, depth + 1);
    }
  }
}

function collectCustomerR2Keys(value: unknown, userId: string, out: Set<string>, depth = 0) {
  if (depth > 12 || value == null) return;
  if (typeof value === "string") {
    const key = value.trim();
    const customerAudio =
      key.startsWith(`ivr/intro/${userId}/`) ||
      key.startsWith(`ivr/event-name/${userId}/`) ||
      key.startsWith(`ivr/composed-intro/${userId}/`) ||
      key.startsWith(`ivr/composed-inbound/${userId}/`) ||
      (key.startsWith("ivr/") &&
        key.includes(`/${userId}/`) &&
        !key.startsWith("ivr/system/"));
    if (customerAudio) out.add(key);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectCustomerR2Keys(item, userId, out, depth + 1);
    return;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value as AnyRecord)) {
      collectCustomerR2Keys(item, userId, out, depth + 1);
    }
  }
}

async function loadKeptMediaValues(user: AnyRecord, session: ClientSession | null) {
  const userId = user._id;
  const email = String(user.email || "").trim().toLowerCase();
  const [docs, quotes, agreements, payments] = await Promise.all([
    SalesDocument.find({
      $or: [{ convertedUserId: userId }, { originalUserId: userId }],
    })
      .session(session)
      .lean(),
    CustomerQuote.find({
      $or: [{ userId }, { originalUserId: userId }],
    })
      .session(session)
      .lean(),
    CustomerAgreement.find({
      $or: [{ userId }, { originalUserId: userId }],
    })
      .session(session)
      .lean(),
    email ? Payment.find({ email }).session(session).lean() : Promise.resolve([]),
  ]);
  const strings: string[] = [];
  for (const doc of [...docs, ...quotes, ...agreements, ...payments]) {
    collectStrings(doc, strings);
  }
  return strings;
}

export async function purgeOperationalCustomerData(
  user: AnyRecord,
  session: ClientSession | null
): Promise<OperationalMediaPlan> {
  const userId = user._id as mongoose.Types.ObjectId;
  const userIdString = String(userId);
  const options = sessionOptions(session);
  const events = await Event.find({ userId })
    .select("_id venueOwnerId venueHallId")
    .session(session)
    .lean();
  const eventIds = events.map((event) => event._id);
  const venueLinks = eventIds.length
    ? await VenueEvent.find({ linkedEventId: { $in: eventIds } })
        .select("linkedEventId")
        .session(session)
        .lean()
    : [];
  const linkedIds = new Set(venueLinks.map((row) => String(row.linkedEventId)));
  const keptEvents = events.filter(
    (event) => event.venueOwnerId || event.venueHallId || linkedIds.has(String(event._id))
  );
  const deletableEvents = events.filter(
    (event) => !event.venueOwnerId && !event.venueHallId && !linkedIds.has(String(event._id))
  );
  const keptEventIds = keptEvents.map((event) => event._id);
  const deletableEventIds = deletableEvents.map((event) => event._id);
  const keptEventSet = new Set(keptEventIds.map((id) => String(id)));

  const invitations = await Invitation.find({
    $or: [
      { ownerId: userId },
      ...(deletableEventIds.length ? [{ eventId: { $in: deletableEventIds } }] : []),
      ...(keptEventIds.length ? [{ eventId: { $in: keptEventIds } }] : []),
    ],
  })
    .select("_id eventId")
    .session(session)
    .lean();

  const keptInvitationIds = invitations
    .filter((invitation) => keptEventSet.has(String(invitation.eventId)))
    .map((invitation) => invitation._id);
  const deletableInvitationIds = invitations
    .filter((invitation) => !keptEventSet.has(String(invitation.eventId)))
    .map((invitation) => invitation._id);

  const keptStrings = await loadKeptMediaValues(user, session);
  const keptPublicIds = new Set(
    keptStrings.map((value) => cloudinaryPublicIdFromUrl(value)).filter(Boolean)
  );
  const operationalDocs = [
    ...(deletableInvitationIds.length
      ? await Invitation.find({ _id: { $in: deletableInvitationIds } }).session(session).lean()
      : []),
    ...(deletableEventIds.length
      ? await Event.find({ _id: { $in: deletableEventIds } }).session(session).lean()
      : []),
    ...(deletableInvitationIds.length
      ? await WeddingEventUpload.find({ invitationId: { $in: deletableInvitationIds } })
          .session(session)
          .lean()
      : []),
  ];
  const cloudinaryPublicIds = new Set<string>();
  for (const doc of operationalDocs) {
    if (doc && typeof doc === "object" && "publicId" in doc) {
      const explicit = String((doc as AnyRecord).publicId || "").trim();
      if (explicit && !keptPublicIds.has(explicit)) cloudinaryPublicIds.add(explicit);
    }
    const strings: string[] = [];
    collectStrings(doc, strings);
    for (const value of strings) {
      const publicId = cloudinaryPublicIdFromUrl(value);
      if (publicId && !keptPublicIds.has(publicId)) cloudinaryPublicIds.add(publicId);
    }
  }

  const r2Keys = new Set<string>();
  collectCustomerR2Keys(user, userIdString, r2Keys);
  if (deletableInvitationIds.length || userId) {
    const recordingOr: AnyRecord[] = [
      { customerId: userIdString },
      { customerId: userId },
      { "clientState.userId": userIdString },
    ];
    if (deletableInvitationIds.length) {
      recordingOr.push(
        { "clientState.invitationId": { $in: deletableInvitationIds } },
        {
          "clientState.invitationId": {
            $in: deletableInvitationIds.map((id) => String(id)),
          },
        }
      );
    }
    const recordings = await CallRecording.find({ $or: recordingOr })
      .select("recordingKey")
      .session(session)
      .lean();
    for (const recording of recordings) {
      const key = String(recording.recordingKey || "").trim();
      if (key && !key.startsWith("ivr/system/")) r2Keys.add(key);
    }
  }

  const guestTokens = deletableInvitationIds.length
    ? await InvitationGuest.find({ invitationId: { $in: deletableInvitationIds } })
        .select("token checkInToken")
        .session(session)
        .lean()
    : [];
  const needles = Array.from(
    new Set(
      [
        ...deletableInvitationIds.map((id) => String(id)),
        ...deletableEventIds.map((id) => String(id)),
        ...guestTokens.flatMap((guest) => [guest.token, (guest as AnyRecord).checkInToken]),
      ]
        .map((value) => String(value || "").trim())
        .filter((value) => value.length >= 12)
    )
  );

  await User.updateMany(
    { _id: { $ne: userId }, assignedClientIds: userId },
    { $pull: { assignedClientIds: userId } },
    options
  );

  if (deletableInvitationIds.length) {
    await SalesClient.updateMany(
      {
        $or: [{ userId }, { invitationId: { $in: deletableInvitationIds } }],
      },
      { $unset: { invitationId: "" } },
      options
    );
  }

  const files = await CustomerFile.find({
    $or: [{ userId }, { originalUserId: userId }],
  })
    .select("_id")
    .session(session)
    .lean();
  const fileIds = files.map((file) => file._id);
  if (fileIds.length) {
    await CustomerLeadMessage.deleteMany({ customerFileId: { $in: fileIds } }, options);
  }

  const db = mongoose.connection.db;
  if (!db) throw new Error("DATABASE_NOT_READY");
  const collections = await db.listCollections().toArray();
  const userMatch = {
    $or: [
      { userId },
      { ownerId: userId },
      { customerId: userId },
      { customerId: userIdString },
      { clientUserId: userId },
    ],
  };
  const keptExclusion =
    keptEventIds.length || keptInvitationIds.length
      ? {
          $nor: [
            ...(keptEventIds.length ? [{ eventId: { $in: keptEventIds } }] : []),
            ...(keptInvitationIds.length
              ? [{ invitationId: { $in: keptInvitationIds } }]
              : []),
          ],
        }
      : null;

  for (const listed of collections) {
    const name = String(listed.name || "");
    if (!name || name.startsWith("system.")) continue;
    if (listed.type === "view") continue;
    if (name.startsWith("venue")) continue;
    if (PROTECTED_COLLECTIONS.has(name)) continue;

    const collection = db.collection(name);
    if (name === "events") {
      if (deletableEventIds.length) {
        await collection.deleteMany({ _id: { $in: deletableEventIds } }, options);
      }
      continue;
    }
    if (name === "invitations") {
      if (deletableInvitationIds.length) {
        await collection.deleteMany({ _id: { $in: deletableInvitationIds } }, options);
      }
      continue;
    }

    const or: AnyRecord[] = [];
    if (deletableEventIds.length) or.push({ eventId: { $in: deletableEventIds } });
    if (deletableInvitationIds.length) {
      or.push({ invitationId: { $in: deletableInvitationIds } });
      or.push({
        "clientState.invitationId": {
          $in: deletableInvitationIds.map((id) => String(id)),
        },
      });
    }
    or.push(keptExclusion ? { $and: [userMatch, keptExclusion] } : userMatch);
    await collection.deleteMany({ $or: or }, options);
  }

  for (let index = 0; index < needles.length; index += 40) {
    const chunk = needles.slice(index, index + 40);
    await ShortLink.deleteMany(
      {
        $or: chunk.map((needle) => ({
          targetUrl: { $regex: escapeRegex(needle) },
        })),
      },
      options
    );
  }

  await DeletedCustomerTombstone.findOneAndUpdate(
    { originalUserId: userId },
    {
      $set: {
        originalUserId: userId,
        name: String(user.fullName || user.name || "").trim(),
        email: String(user.email || "").trim().toLowerCase(),
        phone: String(user.phone || "").trim(),
        eventIds: deletableEventIds,
        invitationIds: deletableInvitationIds,
        deletedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, ...options }
  );

  return {
    cloudinaryPublicIds: Array.from(cloudinaryPublicIds),
    r2Keys: Array.from(r2Keys),
  };
}

export async function destroyOperationalMedia(plan: OperationalMediaPlan) {
  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
  if (cloudName && apiKey && apiSecret && plan.cloudinaryPublicIds.length) {
    const { default: cloudinary } = await import("@/lib/cloudinary");
    for (const publicId of plan.cloudinaryPublicIds) {
      for (const resourceType of ["image", "video", "raw"] as const) {
        try {
          await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
            invalidate: true,
          });
        } catch (error) {
          console.error("OPERATIONAL MEDIA DELETE FAILED:", publicId, error);
        }
      }
    }
  }

  const endpoint = String(
    process.env.R2_ENDPOINT ||
      (process.env.R2_ACCOUNT_ID
        ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : "")
  )
    .trim()
    .replace(/\/+$/, "");
  const bucket = String(process.env.R2_BUCKET_NAME || "").trim();
  const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || "").trim();
  if (endpoint && bucket && accessKeyId && secretAccessKey && plan.r2Keys.length) {
    const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
    for (const key of plan.r2Keys) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      } catch (error) {
        console.error("OPERATIONAL RECORDING DELETE FAILED:", key, error);
      }
    }
  }
}
