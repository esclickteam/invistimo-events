import User from "@/models/User";
import CustomerNotification from "@/models/CustomerNotification";
import { publishAdminIncident } from "@/lib/customerNotifications/adminCenterLive";
import { resolveAdminIncident } from "@/lib/customerNotifications/service";
import { resolveProducerBill } from "@/lib/producerBilling/calc";
import {
  buildClearFollowUpScheduleUpdate,
  followUpHasSchedule,
  planDailySummary,
  planDebtSchedule,
  planFinalRecordsNotice,
  planPaymentNotice,
  planProducerOpenedClient,
  type CollectionNotice,
  type DebtScheduleInput,
  type DebtSchedulePlan,
} from "@/lib/producerBilling/notices";
import {
  loadTrackedCollectionClient,
  loadTrackedCollectionClients,
  type TrackedCollectionClient,
} from "@/lib/producerBilling/snapshot";

function toIncident(notice: CollectionNotice) {
  return {
    incidentKey: notice.incidentKey,
    type: notice.type,
    category: notice.category,
    severity: notice.severity,
    title: notice.title,
    body: notice.body,
    actionHref: notice.actionHref,
    eventId: notice.eventId || null,
    customerId: notice.customerId,
    eventTitle: notice.eventTitle,
    reopen: false as const,
  };
}

async function publishCollectionNotice(notice: CollectionNotice) {
  return publishAdminIncident(toIncident(notice), undefined, {
    collectionClientId: notice.customerId || "",
    collectionKind: notice.debt ? "debt" : "info",
  });
}

async function resolveProducerDebtNotices(clientId: string, reason: string, retainKeys: string[] = []) {
  const keep = new Set(retainKeys);
  const rows = await CustomerNotification.find({
    audience: "admin",
    status: "active",
    "meta.collectionKind": "debt",
    "meta.collectionClientId": clientId,
  })
    .select("meta.incidentKey")
    .limit(200)
    .lean<Array<{ meta?: { incidentKey?: string } }>>();
  const keys = new Set(
    rows.map((row) => String(row.meta?.incidentKey || "")).filter((key) => key && !keep.has(key)),
  );
  let updated = 0;
  for (const key of keys) {
    const result = await resolveAdminIncident(key, reason);
    updated += result.updated;
  }
  return updated;
}

function noticeInput(row: TrackedCollectionClient, now: Date): DebtScheduleInput {
  const bill = resolveProducerBill(row.client as any);
  const follow = row.client.producerBilling?.collectionFollowUp || {};
  return {
    clientId: String(row.client._id),
    producerId: row.producerId,
    producerName: row.producerName,
    clientName: row.client.name || "",
    eventName: row.eventName,
    eventId: row.eventId,
    eventDate: row.eventDate,
    finalRecordsUpdatedAt: row.client.producerBilling?.finalRecordsUpdatedAt || null,
    createdAt: row.client.createdAt || null,
    confirmed: bill.confirmed,
    finalRecords: bill.finalRecords,
    amountDue: bill.amountDue,
    balance: bill.balance,
    now,
    followUp: {
      snoozeUntil: follow.snoozeUntil || null,
      handledCycleKey: follow.handledCycleKey || "",
      firedSnoozeAt: follow.firedSnoozeAt || null,
      noticeBalance: follow.noticeBalance ?? null,
    },
  };
}

async function applyDebtPlan(clientId: string, plan: DebtSchedulePlan) {
  let created = 0;
  if (plan.resolveAllDebt) {
    const resolved = await resolveProducerDebtNotices(clientId, plan.clearSchedule ? "paid" : "cleared");
    if (plan.clearSchedule) {
      const client = await User.findById(clientId).select("producerBilling.collectionFollowUp").lean();
      if (followUpHasSchedule((client as any)?.producerBilling?.collectionFollowUp)) {
        await User.updateOne({ _id: clientId }, buildClearFollowUpScheduleUpdate() as any);
      }
    }
    return { created, resolved };
  }

  for (const item of plan.notices) {
    const result = await publishCollectionNotice(item);
    if (result.created) created += 1;
  }
  if (plan.markSnoozeFired && plan.firedSnoozeAt) {
    await User.updateOne(
      { _id: clientId },
      {
        $set: {
          "producerBilling.collectionFollowUp.firedSnoozeAt": plan.firedSnoozeAt,
          "producerBilling.collectionFollowUp.noticeBalance": plan.noticeBalance,
        },
      } as any,
    );
  }
  const resolved = await resolveProducerDebtNotices(clientId, "refreshed", plan.retainKeys);
  return { created, resolved };
}

export async function syncProducerCollectionClient(clientId: string, now = new Date()) {
  const row = await loadTrackedCollectionClient(clientId);
  if (!row) return { created: 0, resolved: 0 };
  return applyDebtPlan(clientId, planDebtSchedule(noticeInput(row, now)));
}

export async function notifyProducerOpenedClient(input: {
  clientId: string;
  producerId: string;
  producerName: string;
  clientName: string;
  eventDate?: Date | string | null;
}) {
  try {
    const notice = planProducerOpenedClient(input);
    return await publishCollectionNotice(notice);
  } catch (error) {
    console.error("producer opened-client notice failed", error);
    return { created: 0 };
  }
}

export async function notifyProducerFinalRecords(input: {
  clientId: string;
  producerId: string;
  producerName: string;
  eventName: string;
  eventId?: string | null;
  previous: number | null;
  next: number;
  amountDue: number | null;
  updatedAt: Date;
}) {
  try {
    const notice = planFinalRecordsNotice(input);
    if (!notice) return { created: 0 };
    return await publishCollectionNotice(notice);
  } catch (error) {
    console.error("producer final-records notice failed", error);
    return { created: 0 };
  }
}

export async function notifyProducerPayment(input: {
  clientId: string;
  producerId: string;
  eventName: string;
  eventId?: string | null;
  amount: number;
  balance: number | null;
  recordedAt: Date;
}) {
  try {
    return await publishCollectionNotice(planPaymentNotice(input));
  } catch (error) {
    console.error("producer payment notice failed", error);
    return { created: 0 };
  }
}

export async function processProducerCollectionNotices(now = new Date()) {
  const result = { created: 0, resolved: 0, daily: false };
  const tracked = await loadTrackedCollectionClients();
  const summaryRows: DebtScheduleInput[] = [];
  for (const row of tracked) {
    const bill = resolveProducerBill(row.client as any);
    if (!bill.confirmed) continue;
    const input = noticeInput(row, now);
    summaryRows.push(input);
    try {
      const applied = await applyDebtPlan(input.clientId, planDebtSchedule(input));
      result.created += applied.created;
      result.resolved += applied.resolved;
    } catch (error) {
      console.error("producer collection notice failed", input.clientId, error);
    }
  }

  const daily = planDailySummary({
    now,
    rows: summaryRows.map((row) => ({
      confirmed: row.confirmed,
      amountDue: row.amountDue,
      balance: row.balance,
      eventDate: row.eventDate,
    })),
  });
  if (daily) {
    try {
      const published = await publishCollectionNotice(daily);
      result.daily = published.created > 0;
      result.created += published.created;
    } catch (error) {
      console.error("producer daily summary failed", error);
    }
  }
  return result;
}
