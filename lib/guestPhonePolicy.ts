import mongoose from "mongoose";
import GuestPhoneClaim from "@/models/GuestPhoneClaim";
import InvitationGuest from "@/models/InvitationGuest";
import {
  PHONE_DUPLICATE_MESSAGE,
  PHONE_SKIP_EXISTING,
  classifyPhoneImportRows,
  displayPhone,
  isIsraeliMobileLengthInvalid,
  normalizePhoneKey,
  phoneFieldsForStorage,
  phoneNeedsReview,
  type PhoneImportDuplicate,
} from "@/lib/guestPhone";

export class PhoneDuplicateError extends Error {
  readonly code = "PHONE_DUPLICATE";

  constructor() {
    super(PHONE_DUPLICATE_MESSAGE);
    this.name = "PhoneDuplicateError";
  }
}

export function isPhoneDuplicateError(error: unknown) {
  if (error instanceof PhoneDuplicateError) return true;
  return (
    !!error &&
    typeof error === "object" &&
    (error as { code?: string }).code === "PHONE_DUPLICATE"
  );
}

const ensuredInvitations = new Set<string>();
const legacyDuplicateCounts = new Map<string, number>();
let claimIndexReady: Promise<void> | null = null;

export function resetPhoneClaimCache() {
  ensuredInvitations.clear();
  legacyDuplicateCounts.clear();
  claimIndexReady = null;
}

function asObjectId(value: unknown) {
  const text = String(value ?? "").trim();
  if (text && mongoose.Types.ObjectId.isValid(text)) {
    return new mongoose.Types.ObjectId(text);
  }
  return null;
}

function idVariants(value: unknown) {
  const text = String(value ?? "").trim();
  const variants: unknown[] = [];
  if (text) variants.push(text);
  const objectId = asObjectId(text);
  if (objectId) variants.push(objectId);
  return variants;
}

function invitationKey(value: unknown) {
  return String(asObjectId(value) || value || "");
}

async function ensureClaimIndex() {
  if (!claimIndexReady) {
    claimIndexReady = GuestPhoneClaim.createIndexes()
      .then(() => undefined)
      .catch((error) => {
        claimIndexReady = null;
        throw error;
      });
  }
  return claimIndexReady;
}

function isDuplicateKeyError(error: unknown) {
  const code = (error as { code?: number })?.code;
  if (code === 11000) return true;
  const writeErrors = (error as { writeErrors?: Array<{ code?: number }> })
    ?.writeErrors;
  return (
    Array.isArray(writeErrors) &&
    writeErrors.length > 0 &&
    writeErrors.every((item) => item?.code === 11000)
  );
}

/**
 * Backfill normalized phones and one claim per number.
 * Extra guests that already share a number stay untouched.
 */
export async function ensureInvitationPhoneClaims(invitationId: unknown) {
  const cacheKey = invitationKey(invitationId);
  if (!cacheKey || ensuredInvitations.has(cacheKey)) return;

  await ensureClaimIndex();

  const variants = idVariants(invitationId);
  const storedInvitationId = asObjectId(invitationId);
  if (!storedInvitationId) return;

  const guests = await InvitationGuest.find({
    invitationId: { $in: variants },
    phone: { $regex: "\\d" },
  })
    .select("_id phone phoneNormalized phoneLengthApproved requiresPhoneReview createdAt")
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  const normalizeOps: Array<Record<string, unknown>> = [];
  const firstByKey = new Map<string, { _id: unknown }>();
  const duplicateKeys = new Set<string>();

  for (const guest of guests) {
    const row = guest as {
      _id: unknown;
      phone?: unknown;
      phoneNormalized?: unknown;
      phoneLengthApproved?: unknown;
      requiresPhoneReview?: unknown;
    };
    const key = normalizePhoneKey(row.phoneNormalized || row.phone);
    if (!key) continue;
    const approved = row.phoneLengthApproved === true;
    const requiresPhoneReview = isIsraeliMobileLengthInvalid(key) && !approved;
    const patch: Record<string, unknown> = {};
    if (row.phoneNormalized !== key) patch.phoneNormalized = key;
    if (row.requiresPhoneReview !== requiresPhoneReview) {
      patch.requiresPhoneReview = requiresPhoneReview;
    }
    if (Object.keys(patch).length) {
      normalizeOps.push({
        updateOne: {
          filter: { _id: row._id },
          update: { $set: patch },
        },
      });
    }
    if (firstByKey.has(key)) duplicateKeys.add(key);
    else firstByKey.set(key, guest as { _id: unknown });
  }

  if (normalizeOps.length) {
    await InvitationGuest.collection.bulkWrite(normalizeOps as never, {
      ordered: false,
    });
  }

  if (firstByKey.size) {
    const claimOps = [...firstByKey.entries()].map(([key, guest]) => ({
      updateOne: {
        filter: {
          invitationId: storedInvitationId,
          phoneNormalized: key,
        },
        update: {
          $setOnInsert: {
            invitationId: storedInvitationId,
            phoneNormalized: key,
            guestId: guest._id,
          },
        },
        upsert: true,
      },
    }));

    try {
      await GuestPhoneClaim.collection.bulkWrite(claimOps as never, {
        ordered: false,
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  }

  ensuredInvitations.add(cacheKey);
  legacyDuplicateCounts.set(cacheKey, duplicateKeys.size);
}

export function legacyPhoneDuplicateCount(invitationId: unknown) {
  return legacyDuplicateCounts.get(invitationKey(invitationId)) || 0;
}

async function findClaim(invitationId: unknown, phoneNormalized: string) {
  return GuestPhoneClaim.findOne({
    invitationId: { $in: idVariants(invitationId) },
    phoneNormalized,
  });
}

/**
 * If a claim points at a guest who no longer has that number, move it to a
 * remaining guest or drop it. Existing duplicate rows are never deleted.
 */
async function repairClaim(invitationId: unknown, phoneNormalized: string) {
  const claim = await findClaim(invitationId, phoneNormalized);
  if (!claim) return null;

  const owner = await InvitationGuest.findById(claim.guestId)
    .select("phone phoneNormalized")
    .lean();

  // The guest row is inserted after the claim. A missing guest is an in-flight
  // reservation (or a crash window) and must keep blocking the number.
  if (!owner) return claim;

  const ownerKey = normalizePhoneKey(
    (owner as { phoneNormalized?: unknown; phone?: unknown }).phoneNormalized ||
      (owner as { phone?: unknown }).phone
  );

  if (ownerKey === phoneNormalized) return claim;

  const other = await InvitationGuest.findOne({
    invitationId: { $in: idVariants(invitationId) },
    phoneNormalized,
    _id: { $ne: claim.guestId },
  })
    .sort({ createdAt: 1, _id: 1 })
    .select("_id");

  if (other) {
    claim.guestId = other._id;
    await claim.save();
    return claim;
  }

  await GuestPhoneClaim.deleteOne({ _id: claim._id });
  return null;
}

export async function reservePhoneClaim(input: {
  invitationId: unknown;
  phoneNormalized: string;
  guestId: unknown;
}): Promise<"reserved" | "owned" | "duplicate"> {
  const invitationId = asObjectId(input.invitationId);
  const phoneNormalized = normalizePhoneKey(input.phoneNormalized);
  const guestId = asObjectId(input.guestId) || input.guestId;
  if (!invitationId || !phoneNormalized || !guestId) return "reserved";

  const createClaim = () =>
    GuestPhoneClaim.create({
      invitationId,
      phoneNormalized,
      guestId,
    });

  try {
    await createClaim();
    return "reserved";
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
  }

  let claim = await repairClaim(invitationId, phoneNormalized);
  if (claim && !(await InvitationGuest.exists({ _id: claim.guestId }))) {
    const createdAt = new Date(
      (claim as { createdAt?: Date }).createdAt || 0
    ).getTime();
    if (Date.now() - createdAt > 30_000) {
      const removed = await GuestPhoneClaim.deleteOne({
        _id: claim._id,
        guestId: claim.guestId,
      });
      if (removed.deletedCount) claim = null;
    }
  }
  if (!claim) {
    try {
      await createClaim();
      return "reserved";
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      claim = await findClaim(invitationId, phoneNormalized);
    }
  }

  if (claim && String(claim.guestId) === String(guestId)) return "owned";
  return "duplicate";
}

export async function releasePhoneClaim(input: {
  invitationId: unknown;
  phoneNormalized: string;
  guestId: unknown;
}) {
  const phoneNormalized = normalizePhoneKey(input.phoneNormalized);
  if (!phoneNormalized) return;

  const claim = await repairClaim(input.invitationId, phoneNormalized);
  if (!claim) return;
  if (String(claim.guestId) !== String(input.guestId)) return;

  const other = await InvitationGuest.findOne({
    invitationId: { $in: idVariants(input.invitationId) },
    phoneNormalized,
    _id: { $ne: input.guestId },
  })
    .sort({ createdAt: 1, _id: 1 })
    .select("_id");

  if (other) {
    await GuestPhoneClaim.updateOne(
      { _id: claim._id, guestId: claim.guestId },
      { $set: { guestId: other._id } }
    );
    return;
  }

  await GuestPhoneClaim.deleteOne({
    _id: claim._id,
    guestId: claim.guestId,
  });
}

export async function releaseClaimForGuest(guest: {
  _id?: unknown;
  invitationId?: unknown;
  phone?: unknown;
  phoneNormalized?: unknown;
}) {
  const key = normalizePhoneKey(guest?.phoneNormalized || guest?.phone);
  if (!key || !guest?._id) return;
  await releasePhoneClaim({
    invitationId: guest.invitationId,
    phoneNormalized: key,
    guestId: guest._id,
  });
}

export async function deleteClaimsForGuestIds(guestIds: unknown[]) {
  const ids = guestIds
    .map((id) => asObjectId(id) || id)
    .filter((id) => id !== null && id !== undefined && String(id) !== "");
  if (!ids.length) return;
  await GuestPhoneClaim.deleteMany({ guestId: { $in: ids } });
}

export async function deleteClaimsForInvitation(invitationId: unknown) {
  const variants = idVariants(invitationId);
  if (!variants.length) return;
  await GuestPhoneClaim.deleteMany({ invitationId: { $in: variants } });
  ensuredInvitations.delete(invitationKey(invitationId));
}

export async function reserveNewGuestPhone(
  invitationId: unknown,
  rawPhone: unknown
) {
  await ensureInvitationPhoneClaims(invitationId);
  const fields = phoneFieldsForStorage(rawPhone);
  const guestId = new mongoose.Types.ObjectId();
  const phoneNormalized = fields.phoneNormalized || "";

  if (!phoneNormalized) {
    return {
      guestId,
      fields,
      rollback: async () => {},
    };
  }

  const result = await reservePhoneClaim({
    invitationId,
    phoneNormalized,
    guestId,
  });

  if (result === "duplicate") throw new PhoneDuplicateError();

  return {
    guestId,
    fields,
    rollback: async () => {
      if (result !== "reserved") return;
      await GuestPhoneClaim.deleteOne({
        invitationId: { $in: idVariants(invitationId) },
        phoneNormalized,
        guestId,
      });
    },
  };
}

export async function planPhoneChange(input: {
  invitationId: unknown;
  guestId: unknown;
  currentPhone: unknown;
  currentPhoneNormalized?: unknown;
  currentApproved?: unknown;
  nextPhone: unknown;
}) {
  await ensureInvitationPhoneClaims(input.invitationId);

  const prevKey = normalizePhoneKey(
    input.currentPhoneNormalized || input.currentPhone
  );
  const fields = phoneFieldsForStorage(input.nextPhone, {
    keepApproval:
      normalizePhoneKey(input.nextPhone) === prevKey &&
      input.currentApproved === true,
  });
  const nextKey = fields.phoneNormalized || "";
  const same = prevKey === nextKey;
  let reserved = false;

  if (!same && nextKey) {
    const result = await reservePhoneClaim({
      invitationId: input.invitationId,
      phoneNormalized: nextKey,
      guestId: input.guestId,
    });
    if (result === "duplicate") throw new PhoneDuplicateError();
    reserved = result === "reserved";
  }

  return {
    fields,
    finalize: async () => {
      if (!same && prevKey) {
        await releasePhoneClaim({
          invitationId: input.invitationId,
          phoneNormalized: prevKey,
          guestId: input.guestId,
        });
      }
    },
    rollback: async () => {
      if (!reserved || !nextKey) return;
      await GuestPhoneClaim.deleteOne({
        invitationId: { $in: idVariants(input.invitationId) },
        phoneNormalized: nextKey,
        guestId: input.guestId,
      });
    },
  };
}

export async function inspectPhoneAvailability(input: {
  invitationId: unknown;
  phone: unknown;
  excludeGuestId?: unknown;
}) {
  const normalized = normalizePhoneKey(input.phone);
  const needsReview = Boolean(normalized) && isLengthInvalid(normalized);
  if (!normalized) {
    return { duplicate: false, needsReview: false, normalized: "" };
  }

  await ensureInvitationPhoneClaims(input.invitationId);
  const claim = await repairClaim(input.invitationId, normalized);
  const duplicate = Boolean(
    claim && String(claim.guestId) !== String(input.excludeGuestId || "")
  );

  return { duplicate, needsReview, normalized };
}

function isLengthInvalid(key: string) {
  return key.startsWith("05") && key.length !== 10;
}

export async function loadExistingPhoneKeys(invitationId: unknown) {
  await ensureInvitationPhoneClaims(invitationId);
  const variants = idVariants(invitationId);
  const [claims, guests] = await Promise.all([
    GuestPhoneClaim.find({ invitationId: { $in: variants } })
      .select("phoneNormalized")
      .lean(),
    InvitationGuest.find({
      invitationId: { $in: variants },
      phoneNormalized: { $nin: [null, ""] },
    })
      .select("phoneNormalized")
      .lean(),
  ]);

  const keys = new Set<string>();
  for (const claim of claims) {
    const key = normalizePhoneKey(
      (claim as { phoneNormalized?: unknown }).phoneNormalized
    );
    if (key) keys.add(key);
  }
  for (const guest of guests) {
    const key = normalizePhoneKey(
      (guest as { phoneNormalized?: unknown }).phoneNormalized
    );
    if (key) keys.add(key);
  }
  return keys;
}

export type PreparedGuestImportRow = {
  name: string;
  phone?: unknown;
  payload: Record<string, unknown>;
};

export async function planGuestPhoneImport(
  invitationId: unknown,
  rows: PreparedGuestImportRow[]
) {
  const existingKeys = await loadExistingPhoneKeys(invitationId);
  return classifyPhoneImportRows(rows, existingKeys);
}

export async function commitGuestPhoneImport(
  invitationId: unknown,
  rows: PreparedGuestImportRow[]
) {
  const prepared: Array<{
    doc: Record<string, unknown>;
    rollback: () => Promise<void>;
  }> = [];
  const racedDuplicates: PhoneImportDuplicate[] = [];

  for (const row of rows) {
    try {
      const reserved = await reserveNewGuestPhone(invitationId, row.phone);
      prepared.push({
        doc: {
          ...row.payload,
          _id: reserved.guestId,
          invitationId: row.payload.invitationId ?? invitationId,
          name: row.name,
          phone: reserved.fields.phone,
          phoneNormalized: reserved.fields.phoneNormalized,
          phoneLengthApproved: reserved.fields.phoneLengthApproved,
          requiresPhoneReview: reserved.fields.requiresPhoneReview,
        },
        rollback: reserved.rollback,
      });
    } catch (error) {
      if (!isPhoneDuplicateError(error)) {
        await Promise.all(prepared.map((item) => item.rollback()));
        throw error;
      }
      racedDuplicates.push({
        name: row.name,
        phone: displayPhone(row.phone),
        reason: PHONE_SKIP_EXISTING,
      });
    }
  }

  if (!prepared.length) {
    return { inserted: [] as Array<Record<string, unknown>>, racedDuplicates };
  }

  let insertedDocs: Array<Record<string, unknown>> = [];
  try {
    insertedDocs = await InvitationGuest.insertMany(
      prepared.map((item) => item.doc),
      { ordered: false }
    );
  } catch (error) {
    const ids = prepared.map((item) => item.doc._id);
    const stored = await InvitationGuest.find({ _id: { $in: ids } })
      .select("_id")
      .lean();
    const storedIds = new Set(stored.map((guest) => String(guest._id)));
    await Promise.all(
      prepared
        .filter((item) => !storedIds.has(String(item.doc._id)))
        .map((item) => item.rollback())
    );
    insertedDocs = prepared
      .filter((item) => storedIds.has(String(item.doc._id)))
      .map((item) => item.doc);

    if (!insertedDocs.length) throw error;
  }

  return { inserted: insertedDocs, racedDuplicates };
}

export function countImportedPhoneReviews(
  guests: Array<{
    phone?: unknown;
    phoneNormalized?: unknown;
    phoneLengthApproved?: unknown;
  }>
) {
  return guests.filter((guest) => phoneNeedsReview(guest)).length;
}
