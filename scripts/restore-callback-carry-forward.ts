/**
 * Restore guests who asked to be called in the next round, when that
 * request is still open and they were never placed on a later dial list.
 *
 * Dry-run by default. Pass --write to insert the missing tasks.
 */
import fs from "fs";
import mongoose from "mongoose";
import {
  extractGuestId,
  getGuestRsvpValue,
  isCallbackCarryForwardTask,
  resolveMaxCallRounds,
} from "../lib/calls/callRoundEligibility.ts";

const WRITE = process.argv.includes("--write");
const FINAL = new Set(["yes", "no"]);
const OPEN = new Set(["pending", "in_progress", "open", "assigned", "active"]);
const FINAL_TASK = new Set(["confirmed", "declined", "yes", "no"]);

function loadEnv(path: string) {
  if (!fs.existsSync(path)) return;
  const raw = fs.readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k] || path.includes("production")) process.env[k] = v;
  }
}

function toDirect(input: string) {
  const m = String(input).match(
    /^mongodb\+srv:\/\/([^@]+)@([^/]+)\/([^?]*)(\?.*)?$/i
  );
  if (!m) return input;
  const [, creds, , dbName, qs = ""] = m;
  const hosts = [
    "cluster0-shard-00-00.iit5n.mongodb.net:27017",
    "cluster0-shard-00-01.iit5n.mongodb.net:27017",
    "cluster0-shard-00-02.iit5n.mongodb.net:27017",
  ].join(",");
  const params = new URLSearchParams(qs.startsWith("?") ? qs.slice(1) : qs);
  params.set("ssl", "true");
  params.set("authSource", "admin");
  params.set("replicaSet", "atlas-3i3h0q-shard-0");
  params.delete("appName");
  return `mongodb://${creds}@${hosts}/${dbName}?${params.toString()}`;
}

function roundOf(task: any) {
  return Number(task?.round || task?.callRound || 0);
}

function taskTime(task: any) {
  return new Date(task?.updatedAt || task?.createdAt || 0).getTime();
}

loadEnv(".env.local");
loadEnv(".env.production.local");

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI missing");
  process.exit(1);
}

async function main() {
await mongoose.connect(toDirect(process.env.MONGO_URI!));
const db = mongoose.connection.db;
if (!db) throw new Error("No database");

const tasks = db.collection("calltasks");
const guests = db.collection("invitationguests");
const workOrders = db.collection("callworkorders");
const users = db.collection("users");

const callbackTasks = await tasks
  .find({
    $or: [
      { status: "callback" },
      { result: "callback" },
      { answeredResult: "callback" },
      { nextRoundReason: "callback_next_round" },
      { nextRoundReason: "callback_manual" },
    ],
  })
  .toArray();

const byGuest = new Map<string, any[]>();
for (const task of callbackTasks) {
  if (!isCallbackCarryForwardTask(task)) continue;
  const guestId = extractGuestId(task.guestId || task.invitationGuestId);
  if (!guestId) continue;
  const list = byGuest.get(guestId) || [];
  list.push(task);
  byGuest.set(guestId, list);
}

const summary = {
  write: WRITE,
  scannedCallbackTasks: callbackTasks.length,
  guests: byGuest.size,
  restoredToRound: 0,
  markedManual: 0,
  skippedFinalRsvp: 0,
  skippedAlreadyQueued: 0,
  skippedDuplicate: 0,
  skippedWaitingForFutureRound: 0,
  skippedNoWorkOrder: 0,
  actions: [] as any[],
};

for (const [guestId, guestCallbackTasks] of byGuest) {
  const guest = await guests.findOne({
    _id: new mongoose.Types.ObjectId(guestId),
  });
  if (!guest) continue;

  const rsvp = getGuestRsvpValue(guest);
  if (FINAL.has(rsvp)) {
    summary.skippedFinalRsvp += 1;
    continue;
  }

  const invitationId = guestCallbackTasks[0]?.invitationId;
  const allGuestTasks = await tasks
    .find({
      $or: [
        { guestId: new mongoose.Types.ObjectId(guestId) },
        { invitationGuestId: new mongoose.Types.ObjectId(guestId) },
      ],
    })
    .toArray();

  const latestByRound = new Map<number, any>();
  for (const task of allGuestTasks) {
    const round = roundOf(task);
    if (![1, 2, 3].includes(round)) continue;
    const current = latestByRound.get(round);
    if (!current || taskTime(task) >= taskTime(current)) {
      latestByRound.set(round, task);
    }
  }

  const callbackRounds = [...latestByRound.entries()]
    .filter(([, task]) => isCallbackCarryForwardTask(task))
    .map(([round]) => round)
    .sort((a, b) => a - b);

  if (!callbackRounds.length) continue;

  const sourceRound = callbackRounds[callbackRounds.length - 1];
  const sourceTask = latestByRound.get(sourceRound);
  const ownerId = sourceTask?.userId || sourceTask?.clientUserId;
  const owner = ownerId
    ? await users.findOne(
        { _id: ownerId },
        { projection: { callsRounds: 1 } }
      )
    : null;
  const maxRounds = resolveMaxCallRounds(owner);

  const laterTasks = allGuestTasks.filter((task) => roundOf(task) > sourceRound);

  if (laterTasks.some((task) => OPEN.has(String(task.status || "")))) {
    summary.skippedAlreadyQueued += 1;
    continue;
  }

  if (
    laterTasks.some((task) =>
      FINAL_TASK.has(String(task.status || task.result || ""))
    )
  ) {
    summary.skippedFinalRsvp += 1;
    continue;
  }

  if (sourceRound >= maxRounds) {
    if (sourceTask?.manualHandlingRequired === true && sourceTask?.status === "callback") {
      summary.skippedDuplicate += 1;
      continue;
    }

    summary.actions.push({
      guestId,
      name: guest.fullName || guest.name || sourceTask?.guestName || "",
      action: "manual",
      sourceRound,
      workOrderId: String(sourceTask.workOrderId || ""),
    });

    if (WRITE) {
      await tasks.updateOne(
        { _id: sourceTask._id },
        {
          $set: {
            manualHandlingRequired: true,
            inclusionReason: "callback_manual_handling",
            isCompleted: false,
            completed: false,
            updatedAt: new Date(),
          },
          $unset: { completedAt: "" },
        }
      );
      if (sourceTask.workOrderId) {
        await workOrders.updateOne(
          { _id: sourceTask.workOrderId, status: "completed" },
          {
            $set: { status: "in_progress", completedAt: null, updatedAt: new Date() },
          }
        );
      }
    }

    summary.markedManual += 1;
    continue;
  }

  const laterOrders = await workOrders
    .find({
      invitationId,
      type: "rsvp_calls",
      round: { $gt: sourceRound, $lte: maxRounds },
      status: { $nin: ["cancelled", "canceled"] },
    })
    .sort({ round: -1, workDate: -1 })
    .toArray();

  if (!laterOrders.length) {
    summary.skippedWaitingForFutureRound += 1;
    summary.actions.push({
      guestId,
      name: guest.fullName || guest.name || sourceTask?.guestName || "",
      action: "wait_for_next_round",
      sourceRound,
    });
    continue;
  }

  const targetOrder = laterOrders[0];
  const targetRound = Number(targetOrder.round || 0);
  const alreadyThere = allGuestTasks.some(
    (task) =>
      roundOf(task) === targetRound &&
      String(task.workOrderId || "") === String(targetOrder._id)
  );

  if (alreadyThere) {
    summary.skippedDuplicate += 1;
    continue;
  }

  const template = await tasks.findOne({ workOrderId: targetOrder._id });
  if (!template) {
    summary.skippedNoWorkOrder += 1;
    continue;
  }

  const assignedEmployeeId =
    sourceTask.assignedToEmployeeId ||
    sourceTask.employeeId ||
    template.assignedToEmployeeId ||
    template.employeeId ||
    null;

  summary.actions.push({
    guestId,
    name: guest.fullName || guest.name || sourceTask?.guestName || "",
    action: "add_to_round",
    sourceRound,
    targetRound,
    workOrderId: String(targetOrder._id),
  });

  if (WRITE) {
    const now = new Date();
    try {
      await tasks.insertOne({
        ...template,
        _id: new mongoose.Types.ObjectId(),
        guestId: new mongoose.Types.ObjectId(guestId),
        invitationGuestId: new mongoose.Types.ObjectId(guestId),
        workOrderId: targetOrder._id,
        invitationId: targetOrder.invitationId || invitationId,
        round: targetRound,
        callRound: targetRound,
        sourceAudience: template.sourceAudience,
        workDate: targetOrder.workDate || template.workDate,
        status: "pending",
        result: null,
        callResult: null,
        priority: 1,
        sortOrder: -1,
        callbackFromRound: sourceRound,
        movedFromRound: sourceRound,
        inclusionReason: "callback_next_round",
        manualHandlingRequired: false,
        isCompleted: false,
        completed: false,
        completedAt: null,
        startedAt: null,
        lastAttemptAt: null,
        attemptsCount: 0,
        note: "",
        adminNote: `שוחזר לרשימת החיוג: ביקש חזרה בסבב ${sourceRound}`,
        assignedToEmployeeId: assignedEmployeeId,
        assignedEmployeeId: assignedEmployeeId,
        employeeId: assignedEmployeeId,
        employeeName: sourceTask.employeeName || template.employeeName || "",
        employeeEmail: sourceTask.employeeEmail || template.employeeEmail || "",
        guestName:
          guest.fullName || guest.name || sourceTask.guestName || "",
        guestPhone: guest.phone || guest.mobile || guest.phoneNumber || sourceTask.guestPhone || "",
        guestEmail: guest.email || "",
        guestGroup: guest.groupName || guest.group || guest.relation || "",
        guestSide: guest.side || "",
        guestTable: guest.tableName || guest.tableNumber || guest.table || "",
        guestNotes: guest.notes || guest.note || "",
        rsvpStatus: "pending",
        createdAt: now,
        updatedAt: now,
        source: "restore_callback_carry_forward",
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        summary.skippedDuplicate += 1;
        continue;
      }
      throw error;
    }

    await guests.updateOne(
      { _id: new mongoose.Types.ObjectId(guestId) },
      {
        $set: {
          callbackRequested: true,
          needsFollowUp: true,
          moveToNextRound: true,
          nextRound: targetRound,
          nextCallRound: targetRound,
          movedToNextRoundReason: "callback_next_round",
          callCompleted: false,
          manualHandlingRequired: false,
        },
        $addToSet: {
          callbackTransfers: {
            requestedOnRound: sourceRound,
            transferredToRound: targetRound,
            transferredToWorkOrderId: String(targetOrder._id),
            reason: "callback_restored",
            at: new Date(),
          },
        },
      }
    );

    await workOrders.updateOne(
      { _id: targetOrder._id },
      {
        $set: {
          status: "in_progress",
          completedAt: null,
          updatedAt: new Date(),
        },
        $inc: { totalTasks: 1, pendingTasks: 1 },
      }
    );
  }

  summary.restoredToRound += 1;
}

console.log(JSON.stringify(summary, null, 2));
await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
