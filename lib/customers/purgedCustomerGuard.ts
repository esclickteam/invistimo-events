import mongoose, { type Schema } from "mongoose";

import DeletedCustomerTombstone from "@/models/DeletedCustomerTombstone";

type AnyRecord = Record<string, unknown>;

function asObjectId(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
}

export async function isPurgedOperationalTarget(input: {
  userId?: unknown;
  invitationId?: unknown;
  eventId?: unknown;
}) {
  try {
    const or: AnyRecord[] = [];
    const userId = asObjectId(input.userId);
    const invitationId = asObjectId(input.invitationId);
    const eventId = asObjectId(input.eventId);
    if (userId) or.push({ originalUserId: userId });
    if (invitationId) or.push({ invitationIds: invitationId });
    if (eventId) or.push({ eventIds: eventId });
    if (!or.length) return false;
    const hit = await DeletedCustomerTombstone.exists({ $or: or });
    return Boolean(hit);
  } catch (error) {
    console.error("PURGED CUSTOMER LOOKUP FAILED:", error);
    return false;
  }
}

async function assertNotPurged(doc: AnyRecord | null | undefined) {
  if (!doc) return;
  const set = (doc.$set || {}) as AnyRecord;
  const blocked = await isPurgedOperationalTarget({
    userId: doc.userId || doc.ownerId || set.userId || set.ownerId,
    invitationId: doc.invitationId || set.invitationId,
    eventId: doc.eventId || set.eventId,
  });
  if (blocked) {
    throw new Error("CUSTOMER_PURGED");
  }
}

function readInsertDocs(args: unknown[]) {
  for (const arg of args) {
    if (Array.isArray(arg)) return arg as AnyRecord[];
  }
  return [];
}

/**
 * Blocks new operational rows for a customer who was already deleted.
 * Registered before the model is compiled. Lookups fail open.
 */
export function guardPurgedCustomerWrites(schema: Schema) {
  schema.pre("save", async function purgeGuardSave() {
    if (!this.isNew) return;
    await assertNotPurged(this.toObject() as AnyRecord);
  });
  schema.pre("insertMany", async function purgeGuardInsertMany(...args: unknown[]) {
    for (const doc of readInsertDocs(args)) {
      await assertNotPurged(doc);
    }
  });
  schema.pre("findOneAndUpdate", async function purgeGuardUpsert() {
    const options = this.getOptions?.() || {};
    if (!options.upsert) return;
    const query = (this.getQuery?.() || {}) as AnyRecord;
    const update = (this.getUpdate?.() || {}) as AnyRecord;
    await assertNotPurged({
      ...query,
      ...((update.$set || {}) as AnyRecord),
    });
  });
}
