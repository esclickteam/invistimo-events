import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { listVenueSeatingNotificationsForEvent } from "@/lib/customerNotifications/service";
import {
  classifyEventAccess,
  completionStatusLabel,
} from "@/lib/venueSeatingContacts/logic";
import {
  hoursUntilEvent,
  loadCustomer,
  reminderHistory,
  serializeContact,
} from "@/lib/venueSeatingContacts/service";
import HallSeatingContact from "@/models/HallSeatingContact";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getUserIdFromRequest(request);
  if (!auth || (auth.role !== "admin" && !auth.impersonatedByAdmin)) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  await dbConnect();
  const now = new Date();
  const user = await loadCustomer(id);
  if (!user) return NextResponse.json({ success: false }, { status: 404 });

  const events = await Event.find({ userId: id })
    .select("_id title date time receptionTime status paymentStatus")
    .lean();

  const visible = [];
  for (const event of events) {
    const access = classifyEventAccess({ user, event, now });
    if (!access.showTab) continue;
    const doc = await HallSeatingContact.findOne({
      eventId: event._id,
      userId: id,
    }).lean();
    const contact = serializeContact(doc, event, now);
    const [notifications, reminders] = await Promise.all([
      listVenueSeatingNotificationsForEvent({
        userId: id,
        eventId: String(event._id),
      }),
      reminderHistory(String(event._id)),
    ]);
    visible.push({
      eventId: String(event._id),
      title: event.title || "",
      date: event.date || "",
      time: event.time || "",
      hoursUntil: hoursUntilEvent(event, now),
      status: contact.status,
      statusLabel: completionStatusLabel(contact.status),
      missingSoon: contact.missingSoon,
      contact,
      notifications,
      reminders,
    });
  }

  return NextResponse.json({ success: true, events: visible });
}
