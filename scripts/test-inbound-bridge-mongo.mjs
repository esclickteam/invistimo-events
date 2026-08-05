/**
 * Real Mongo integration regression for inbound-bridge Mongoose updates.
 *
 * Exercises the same atomic $set update shapes used by:
 *   - markBridgeDialing
 *   - markBridgeOutboundCreated
 *   - claimInboundBridgeAttempt (lock/reclaim)
 *   - pendingPeerHangup mapping
 *   - status transitions
 *
 * Also proves bare pipeline arrays still throw the original Mongoose error,
 * while our production shapes do not.
 *
 * Usage:
 *   npx vercel env run -e production -- npm run test:inbound-bridge-mongo
 */
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STATE_FILE = path.join(ROOT, "lib/telnyx/inboundBridgeState.ts");

function getMongoUri() {
  const raw = String(process.env.MONGO_URI || process.env.MONGODB_URI || "").trim();
  if (!raw || raw.includes("SENSITIVE") || raw.startsWith("[")) return "";
  return raw;
}

function toTestDbUri(uri) {
  const marker = `invistimo_inbound_bridge_it_${Date.now()}`;
  if (uri.includes("mongodb+srv://")) {
    const q = uri.indexOf("?");
    const base = q >= 0 ? uri.slice(0, q) : uri;
    const qs = q >= 0 ? uri.slice(q) : "";
    const slash = base.lastIndexOf("/");
    const hostPart = base.slice(0, slash + 1);
    return `${hostPart}${marker}${qs || "?retryWrites=true&w=majority"}`;
  }
  const u = new URL(uri);
  u.pathname = `/${marker}`;
  return u.toString();
}

/** Mirrors production markBridgeDialing (regular $set, no pipeline array). */
async function markBridgeDialing(Model, params) {
  const now = new Date();
  const id = String(params.inboundCallControlId || "").trim();
  const idFilter = {
    $or: [{ rootInboundCallControlId: id }, { inboundCallControlId: id }],
  };
  const meta = {
    userId: params.userId,
    credentialId: params.credentialId,
    sipDestination: params.sipDestination,
    dialConnectionId: params.dialConnectionId,
    lastEventAt: now,
  };

  let updated = await Model.findOneAndUpdate(
    { ...idFilter, status: "claimed" },
    { $set: { ...meta, status: "dialing", dialStartedAt: now } },
    { new: true }
  ).lean();
  if (updated) return updated;

  updated = await Model.findOneAndUpdate(
    {
      ...idFilter,
      status: { $in: ["dialing", "ringing", "answered", "bridged"] },
      $or: [{ dialStartedAt: null }, { dialStartedAt: { $exists: false } }],
    },
    { $set: { ...meta, dialStartedAt: now } },
    { new: true }
  ).lean();
  if (updated) return updated;

  return Model.findOneAndUpdate(
    {
      ...idFilter,
      status: { $in: ["dialing", "ringing", "answered", "bridged"] },
    },
    { $set: meta },
    { new: true }
  ).lean();
}

/** Mirrors production markBridgeOutboundCreated (regular $set, no pipeline array). */
async function markBridgeOutboundCreated(Model, params) {
  const now = new Date();
  const rootId = String(params.inboundCallControlId || "").trim();
  const outboundId = String(params.outboundCallControlId || "").trim();
  const outboundLegId = String(params.outboundCallLegId || "").trim() || null;
  if (!rootId || !outboundId) return null;

  const existing = await Model.findOne({
    $or: [
      { rootInboundCallControlId: rootId },
      { inboundCallControlId: rootId },
    ],
  }).lean();
  if (!existing) return null;

  const outboundUnsetFilter = {
    _id: existing._id,
    $or: [
      { outboundCallControlId: null },
      { outboundCallControlId: { $exists: false } },
      { outboundCallControlId: "" },
      { outboundCallControlId: outboundId },
    ],
  };
  const outboundFields = {
    outboundCallControlId: outboundId,
    lastEventAt: now,
  };
  if (outboundLegId) outboundFields.outboundCallLegId = outboundLegId;

  let updated = await Model.findOneAndUpdate(
    { ...outboundUnsetFilter, status: { $in: ["claimed", "dialing"] } },
    { $set: { ...outboundFields, status: "ringing" } },
    { new: true }
  ).lean();

  if (!updated) {
    updated = await Model.findOneAndUpdate(
      outboundUnsetFilter,
      { $set: outboundFields },
      { new: true }
    ).lean();
  }

  const row = updated || existing;
  if (row.pendingPeerHangup) {
    // Production would Telnyx-hangup peer; here we only clear the flag atomically.
    await Model.updateOne(
      { _id: row._id },
      { $set: { pendingPeerHangup: false, lastEventAt: now } }
    );
    return Model.findById(row._id).lean();
  }

  return updated;
}

/** Mirrors claim reclaim rules used in production. */
async function claimInboundBridgeAttempt(Model, params) {
  const inboundCallControlId = String(params.inboundCallControlId || "").trim();
  const now = new Date();
  const lockExpiresAt = new Date(now.getTime() + 30_000);

  try {
    const created = await Model.create({
      bridgeAttemptId: randomUUID(),
      bridgeSessionId: params.inboundCallSessionId || randomUUID(),
      rootInboundCallControlId: inboundCallControlId,
      inboundCallControlId,
      status: "claimed",
      attemptNumber: 1,
      maxAttempts: 2,
      busyCredentialIds: [],
      pendingPeerHangup: false,
      lockOwner: params.lockOwner,
      lockExpiresAt,
      startedAt: now,
      lastEventAt: now,
    });
    return { ok: true, mode: "created", attempt: created.toObject() };
  } catch (error) {
    const isDup =
      error?.code === 11000 ||
      String(error?.message || "").includes("duplicate key");
    if (!isDup) throw error;
  }

  const reclaimed = await Model.findOneAndUpdate(
    {
      rootInboundCallControlId: inboundCallControlId,
      status: "claimed",
      outboundCallControlId: null,
      endedAt: null,
      $or: [{ lockExpiresAt: null }, { lockExpiresAt: { $lte: now } }],
    },
    {
      $set: {
        lockOwner: params.lockOwner,
        lockExpiresAt,
        status: "claimed",
        lastEventAt: now,
      },
    },
    { new: true }
  ).lean();

  if (reclaimed) {
    return { ok: true, mode: "reclaimed_lock", attempt: reclaimed };
  }

  const existing = await Model.findOne({
    rootInboundCallControlId: inboundCallControlId,
  }).lean();

  if (
    existing &&
    (["claimed", "dialing", "ringing", "answered", "bridged"].includes(
      existing.status
    ) ||
      existing.outboundCallControlId)
  ) {
    return { ok: false, reason: "ACTIVE_BRIDGE_EXISTS", attempt: existing };
  }

  return { ok: false, reason: "LOCK_HELD", attempt: existing };
}

test("source has no bare pipeline-array updates in inboundBridgeState", async () => {
  const src = await fs.readFile(STATE_FILE, "utf8");
  assert.equal(
    /findOneAndUpdate\s*\(\s*\{[\s\S]*?\}\s*,\s*\[\s*\{/.test(src),
    false,
    "findOneAndUpdate must not receive a pipeline array"
  );
  assert.equal(
    /updateOne\s*\(\s*\{[\s\S]*?\}\s*,\s*\[\s*\{/.test(src),
    false,
    "updateOne must not receive a pipeline array"
  );
  assert.equal(
    /findByIdAndUpdate\s*\([^,]+,\s*\[/.test(src),
    false,
    "findByIdAndUpdate must not receive a pipeline array"
  );
  // Confirm the fixed functions use $set objects, not arrays.
  assert.match(src, /export async function markBridgeDialing/);
  assert.match(src, /export async function markBridgeOutboundCreated/);
  assert.match(src, /\$set:\s*\{\s*\.\.\.meta,\s*status:\s*"dialing"/);
});

test(
  "Mongo IT: dialing, outbound race, pendingPeerHangup, lock/reclaim, status",
  { skip: !getMongoUri() ? "MONGO_URI unavailable" : false },
  async () => {
    const testUri = toTestDbUri(getMongoUri());
    await mongoose.connect(testUri, { bufferCommands: false });

    const schema = new mongoose.Schema(
      {
        bridgeAttemptId: { type: String, unique: true },
        bridgeSessionId: String,
        rootInboundCallControlId: { type: String, unique: true },
        inboundCallControlId: { type: String, unique: true },
        outboundCallControlId: { type: String, default: null },
        outboundCallLegId: { type: String, default: null },
        status: String,
        attemptNumber: Number,
        maxAttempts: Number,
        busyCredentialIds: [String],
        lockOwner: String,
        lockExpiresAt: Date,
        pendingPeerHangup: { type: Boolean, default: false },
        pendingHangupCause: String,
        userId: String,
        credentialId: String,
        sipDestination: String,
        dialConnectionId: String,
        dialStartedAt: Date,
        answeredAt: Date,
        endedAt: Date,
        lastEventAt: Date,
        startedAt: Date,
        hangupCause: String,
      },
      { timestamps: true }
    );

    const Model =
      mongoose.models.InboundBridgeMongoIT ||
      mongoose.model("InboundBridgeMongoIT", schema);

    const report = {};

    try {
      // A) markBridgeDialing
      const rootDial = `v3:it-dial-${randomUUID()}`;
      const lockDial = `lock-${randomUUID().slice(0, 8)}`;
      await Model.create({
        bridgeAttemptId: randomUUID(),
        bridgeSessionId: randomUUID(),
        rootInboundCallControlId: rootDial,
        inboundCallControlId: rootDial,
        status: "claimed",
        attemptNumber: 1,
        maxAttempts: 2,
        busyCredentialIds: [],
        pendingPeerHangup: false,
        lockOwner: lockDial,
        lockExpiresAt: new Date(Date.now() + 30_000),
        startedAt: new Date(),
        lastEventAt: new Date(),
      });

      const dialing = await markBridgeDialing(Model, {
        inboundCallControlId: rootDial,
        userId: "user-1",
        credentialId: "cred-1",
        sipDestination: "sip:gencredIT@sip.telnyx.com",
        dialConnectionId: "2972009098091955745",
      });
      assert.ok(dialing);
      assert.equal(dialing.status, "dialing");
      assert.equal(dialing.lockOwner, lockDial);
      assert.ok(dialing.lockExpiresAt);
      assert.equal(dialing.attemptNumber, 1);
      assert.ok(dialing.dialStartedAt);
      report.markBridgeDialing = { ok: true, status: dialing.status };

      // B) markBridgeOutboundCreated after answered race
      await Model.updateOne(
        { rootInboundCallControlId: rootDial },
        { $set: { status: "answered", answeredAt: new Date() } }
      );
      const outboundId = `v3:out-${randomUUID()}`;
      const mapped = await markBridgeOutboundCreated(Model, {
        inboundCallControlId: rootDial,
        outboundCallControlId: outboundId,
        outboundCallLegId: "leg-1",
      });
      assert.ok(mapped);
      assert.equal(mapped.outboundCallControlId, outboundId);
      assert.equal(mapped.status, "answered");
      assert.equal(mapped.pendingPeerHangup, false);
      assert.equal(mapped.attemptNumber, 1);
      assert.equal(mapped.lockOwner, lockDial);
      report.markBridgeOutboundCreated = {
        ok: true,
        status: mapped.status,
        outboundCallControlId: mapped.outboundCallControlId,
      };

      // C) pendingPeerHangup cleared after outbound mapping
      const rootPending = `v3:it-pending-${randomUUID()}`;
      await Model.create({
        bridgeAttemptId: randomUUID(),
        bridgeSessionId: randomUUID(),
        rootInboundCallControlId: rootPending,
        inboundCallControlId: rootPending,
        status: "dialing",
        attemptNumber: 1,
        maxAttempts: 2,
        busyCredentialIds: [],
        pendingPeerHangup: true,
        pendingHangupCause: "normal_clearing",
        lockOwner: "pending-owner",
        lockExpiresAt: new Date(Date.now() + 30_000),
        dialStartedAt: new Date(),
        startedAt: new Date(),
        lastEventAt: new Date(),
      });
      const outPending = `v3:out-pending-${randomUUID()}`;
      const mappedPending = await markBridgeOutboundCreated(Model, {
        inboundCallControlId: rootPending,
        outboundCallControlId: outPending,
      });
      assert.ok(mappedPending);
      assert.equal(mappedPending.outboundCallControlId, outPending);
      assert.equal(mappedPending.pendingPeerHangup, false);
      report.pendingPeerHangup = {
        ok: true,
        outboundCallControlId: mappedPending.outboundCallControlId,
        pendingPeerHangupAfterMap: mappedPending.pendingPeerHangup,
      };

      // D) lock / reclaim
      const rootLock = `v3:it-lock-${randomUUID()}`;
      const c1 = await claimInboundBridgeAttempt(Model, {
        inboundCallControlId: rootLock,
        inboundCallSessionId: randomUUID(),
        lockOwner: "owner-A",
      });
      assert.equal(c1.ok, true);
      assert.equal(c1.mode, "created");

      const cDup = await claimInboundBridgeAttempt(Model, {
        inboundCallControlId: rootLock,
        lockOwner: "owner-B",
      });
      assert.equal(cDup.ok, false);
      assert.equal(cDup.reason, "ACTIVE_BRIDGE_EXISTS");

      await Model.updateOne(
        { rootInboundCallControlId: rootLock },
        {
          $set: {
            status: "claimed",
            outboundCallControlId: null,
            lockExpiresAt: new Date(Date.now() - 1000),
            endedAt: null,
          },
        }
      );
      const cReclaim = await claimInboundBridgeAttempt(Model, {
        inboundCallControlId: rootLock,
        lockOwner: "owner-C",
      });
      assert.equal(cReclaim.ok, true);
      assert.equal(cReclaim.mode, "reclaimed_lock");
      assert.equal(cReclaim.attempt.lockOwner, "owner-C");

      await Model.updateOne(
        { rootInboundCallControlId: rootLock },
        {
          $set: {
            status: "dialing",
            outboundCallControlId: `v3:out-lock-${randomUUID()}`,
            lockExpiresAt: new Date(Date.now() - 1000),
            endedAt: null,
          },
        }
      );
      const cDialing = await claimInboundBridgeAttempt(Model, {
        inboundCallControlId: rootLock,
        lockOwner: "owner-D",
      });
      assert.equal(cDialing.ok, false);
      assert.equal(cDialing.reason, "ACTIVE_BRIDGE_EXISTS");
      report.lockReclaim = {
        ok: true,
        created: c1.ok,
        duplicateBlocked: !cDup.ok,
        reclaimed: cReclaim.mode === "reclaimed_lock",
        dialingNotReclaimed: !cDialing.ok,
      };

      // E) status transitions claimed→dialing→answered keep outbound
      const rootStatus = `v3:it-status-${randomUUID()}`;
      await Model.create({
        bridgeAttemptId: randomUUID(),
        bridgeSessionId: randomUUID(),
        rootInboundCallControlId: rootStatus,
        inboundCallControlId: rootStatus,
        status: "claimed",
        attemptNumber: 1,
        maxAttempts: 2,
        busyCredentialIds: [],
        pendingPeerHangup: false,
        lockOwner: "status-owner",
        lockExpiresAt: new Date(Date.now() + 30_000),
        startedAt: new Date(),
        lastEventAt: new Date(),
      });
      const d2 = await markBridgeDialing(Model, {
        inboundCallControlId: rootStatus,
        userId: "u2",
        credentialId: "c2",
        sipDestination: "sip:x@sip.telnyx.com",
        dialConnectionId: "2972009098091955745",
      });
      assert.equal(d2.status, "dialing");
      await Model.updateOne(
        { rootInboundCallControlId: rootStatus },
        { $set: { status: "answered", answeredAt: new Date() } }
      );
      const outStatus = `v3:out-status-${randomUUID()}`;
      const m2 = await markBridgeOutboundCreated(Model, {
        inboundCallControlId: rootStatus,
        outboundCallControlId: outStatus,
      });
      assert.equal(m2.status, "answered");
      assert.equal(m2.outboundCallControlId, outStatus);
      await Model.updateOne(
        { rootInboundCallControlId: rootStatus },
        {
          $set: {
            status: "completed",
            endedAt: new Date(),
            hangupCause: "normal_clearing",
            pendingPeerHangup: false,
          },
        }
      );
      const finalRow = await Model.findOne({
        rootInboundCallControlId: rootStatus,
      }).lean();
      assert.equal(finalRow.status, "completed");
      assert.ok(finalRow.endedAt);
      assert.equal(finalRow.outboundCallControlId, outStatus);
      report.statusTransitions = {
        ok: true,
        path: "claimed→dialing→answered→completed",
        outboundPreserved: finalRow.outboundCallControlId === outStatus,
      };

      // F) Bare pipeline array still throws the original error
      let threw = false;
      let message = "";
      try {
        await Model.findOneAndUpdate(
          { rootInboundCallControlId: rootDial },
          [{ $set: { lastEventAt: new Date() } }],
          { new: true }
        );
      } catch (err) {
        threw = true;
        message = String(err?.message || err);
      }
      assert.equal(threw, true);
      assert.match(message, /updatePipeline|array to query updates/i);
      assert.match(
        message,
        /Cannot pass an array to query updates unless the `updatePipeline` option is set/
      );
      report.pipelineArrayStillRejected = {
        ok: true,
        messageSample: message.slice(0, 140),
      };
      report.productionShapesNoPipelineError = {
        markBridgeDialing: true,
        markBridgeOutboundCreated: true,
        claimReclaim: true,
        pendingPeerHangup: true,
      };

      console.log(JSON.stringify({ tag: "MONGO_IT_OK", ...report }, null, 2));
    } finally {
      await mongoose.connection.dropDatabase().catch(() => null);
      await mongoose.disconnect().catch(() => null);
    }
  }
);
