import mongoose from "mongoose";
import User from "@/models/User";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import { isInProducerCollection, resolveProducerBill, roundMoney } from "@/lib/producerBilling/calc";
import { openDebtAmount } from "@/lib/producerBilling/notices";

function eventTitle(event: {
  title?: string;
  eventTitle?: string;
  eventName?: string;
  name?: string;
  invitationTitle?: string;
} | null) {
  return (
    event?.title ||
    event?.eventTitle ||
    event?.eventName ||
    event?.name ||
    event?.invitationTitle ||
    "טרם נפתח אירוע"
  );
}

export function collectionProducerId(user: {
  billingSource?: string | null;
  assignedProducerId?: unknown;
  producerBilling?: { payerProducerId?: unknown } | null;
}) {
  const payer = user.producerBilling?.payerProducerId;
  if (payer) return String(payer);
  if (String(user.billingSource || "") === "producer" && user.assignedProducerId) {
    return String(user.assignedProducerId);
  }
  return "";
}

type LeanClient = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email?: string;
  billingSource?: string | null;
  assignedProducerId?: unknown;
  eventDate?: Date | string | null;
  createdAt?: Date | string | null;
  guests?: number | null;
  maxGuests?: number | null;
  producerBilling?: Record<string, any> | null;
};

export type TrackedCollectionClient = {
  client: LeanClient;
  producerId: string;
  producerName: string;
  eventId: string | null;
  eventName: string;
  eventDate: Date | string | null;
  actualRecords: number;
};

async function loadActualCounts(eventIds: mongoose.Types.ObjectId[]) {
  if (eventIds.length === 0) return new Map<string, number>();
  const invitations = await Invitation.find({ eventId: { $in: eventIds } })
    .select("_id eventId")
    .lean();
  const invitationIds = invitations.map((invitation) => invitation._id);
  const guestCounts = invitationIds.length
    ? await InvitationGuest.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
        { $match: { invitationId: { $in: invitationIds } } },
        { $group: { _id: "$invitationId", count: { $sum: 1 } } },
      ])
    : [];
  const countByInvitation = new Map(guestCounts.map((row) => [String(row._id), row.count]));
  const byEvent = new Map<string, number>();
  for (const invitation of invitations) {
    const key = String(invitation.eventId);
    byEvent.set(key, (byEvent.get(key) || 0) + (countByInvitation.get(String(invitation._id)) || 0));
  }
  return byEvent;
}

export async function loadTrackedCollectionClients(): Promise<TrackedCollectionClient[]> {
  const clients = (await User.find({
    role: { $in: ["client", "user"] },
    $or: [
      { "producerBilling.payerProducerId": { $ne: null } },
      { billingSource: "producer", assignedProducerId: { $ne: null } },
    ],
  })
    .select(
      "name email billingSource assignedProducerId eventDate createdAt guests maxGuests producerBilling",
    )
    .lean()) as LeanClient[];

  const tracked = clients.filter((client) => {
    const producerId = collectionProducerId(client);
    return Boolean(producerId) && isInProducerCollection(client as any, producerId);
  });
  if (tracked.length === 0) return [];

  const producerIds = [...new Set(tracked.map((client) => collectionProducerId(client)))];
  const producers = await User.find({ _id: { $in: producerIds } }).select("name").lean();
  const producerNames = new Map(producers.map((producer) => [String(producer._id), producer.name || "מפיק"]));

  const events = (await Event.find({ userId: { $in: tracked.map((client) => client._id) } })
    .select("_id userId title eventTitle eventName name invitationTitle date eventDate createdAt")
    .lean()) as any[];
  const eventsByUser = new Map<string, any[]>();
  for (const event of events) {
    const key = String(event.userId);
    const list = eventsByUser.get(key) || [];
    list.push(event);
    eventsByUser.set(key, list);
  }
  const counts = await loadActualCounts(events.map((event) => event._id));

  return tracked.map((client) => {
    const userEvents = eventsByUser.get(String(client._id)) || [];
    const primary =
      [...userEvents].sort((a, b) => {
        const aTime = new Date(a.date || a.eventDate || a.createdAt || 0).getTime();
        const bTime = new Date(b.date || b.eventDate || b.createdAt || 0).getTime();
        return bTime - aTime;
      })[0] || null;
    let actualRecords = 0;
    for (const event of userEvents) {
      actualRecords += counts.get(String(event._id)) || 0;
    }
    const producerId = collectionProducerId(client);
    const extra = Math.max(0, userEvents.length - 1);
    const name = eventTitle(primary);
    return {
      client,
      producerId,
      producerName: producerNames.get(producerId) || "מפיק",
      eventId: primary ? String(primary._id) : null,
      eventName: primary ? (extra ? `${name} (+${extra})` : name) : "טרם נפתח אירוע",
      eventDate: primary?.date || primary?.eventDate || client.eventDate || null,
      actualRecords,
    };
  });
}

export async function describeClientEvent(userId: string, fallbackDate?: Date | string | null) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return {
      eventId: null,
      eventName: "טרם נפתח אירוע",
      eventDate: fallbackDate || null,
      actualRecords: 0,
    };
  }
  const events = (await Event.find({ userId })
    .select("_id title eventTitle eventName name invitationTitle date eventDate createdAt")
    .lean()) as any[];
  const primary =
    [...events].sort((a, b) => {
      const aTime = new Date(a.date || a.eventDate || a.createdAt || 0).getTime();
      const bTime = new Date(b.date || b.eventDate || b.createdAt || 0).getTime();
      return bTime - aTime;
    })[0] || null;
  const counts = await loadActualCounts(events.map((event) => event._id));
  let actualRecords = 0;
  for (const event of events) actualRecords += counts.get(String(event._id)) || 0;
  const extra = Math.max(0, events.length - 1);
  const name = eventTitle(primary);
  return {
    eventId: primary ? String(primary._id) : null,
    eventName: primary ? (extra ? `${name} (+${extra})` : name) : "טרם נפתח אירוע",
    eventDate: primary?.date || primary?.eventDate || fallbackDate || null,
    actualRecords,
  };
}

export async function loadTrackedCollectionClient(clientId: string) {
  if (!mongoose.Types.ObjectId.isValid(clientId)) return null;
  const client = (await User.findById(clientId)
    .select(
      "name email role billingSource assignedProducerId eventDate createdAt guests maxGuests producerBilling",
    )
    .lean()) as LeanClient | null;
  if (!client) return null;
  const producerId = collectionProducerId(client);
  if (!producerId || !isInProducerCollection(client as any, producerId)) return null;
  const producer = await User.findById(producerId).select("name").lean();
  const event = await describeClientEvent(clientId, client.eventDate || null);
  return {
    client,
    producerId,
    producerName: producer?.name || "מפיק",
    eventId: event.eventId,
    eventName: event.eventName,
    eventDate: event.eventDate,
    actualRecords: event.actualRecords,
  } as TrackedCollectionClient;
}

export type OpenCollectionRow = {
  clientId: string;
  clientName: string;
  producerId: string;
  producerName: string;
  eventName: string;
  eventDate: Date | string | null;
  balance: number;
  amountDue: number;
  note: string;
  snoozeUntil: Date | string | null;
};

export async function loadOpenProducerCollection() {
  const producers = await User.find({ role: "producer" }).select("_id name").lean();
  const balances: Record<string, number> = {};
  for (const producer of producers) balances[String(producer._id)] = 0;

  const tracked = await loadTrackedCollectionClients();
  const openRows: OpenCollectionRow[] = [];
  for (const row of tracked) {
    const bill = resolveProducerBill(row.client as any);
    const debt = openDebtAmount({
      confirmed: bill.confirmed,
      amountDue: bill.amountDue,
      balance: bill.balance,
    });
    if (balances[row.producerId] == null) balances[row.producerId] = 0;
    if (debt <= 0) continue;
    balances[row.producerId] = roundMoney(balances[row.producerId] + debt);
    const follow = row.client.producerBilling?.collectionFollowUp || {};
    openRows.push({
      clientId: String(row.client._id),
      clientName: row.client.name || "לקוח ללא שם",
      producerId: row.producerId,
      producerName: row.producerName,
      eventName: row.eventName,
      eventDate: row.eventDate,
      balance: debt,
      amountDue: Number(bill.amountDue || 0),
      note: String(follow.note || ""),
      snoozeUntil: follow.snoozeUntil || null,
    });
  }
  openRows.sort((a, b) => String(a.eventDate || "9999").localeCompare(String(b.eventDate || "9999")));
  return { balances, openRows };
}
