import SystemSettings from "@/models/SystemSettings";
import { REMINDER_WITH_TABLE_SERVER_TEMPLATE } from "@/lib/messages/resolveReminderSmsTemplate";

const GLOBAL_KEY = "global";

export function getInvitationEventId(invitation: any): string {
  const raw =
    invitation?.eventId ||
    invitation?.productionEventId ||
    invitation?.linkedEventId ||
    "";

  const id = typeof raw === "object" && raw?._id ? String(raw._id) : String(raw || "");
  return id.trim();
}

export async function getReminderSmsBody(): Promise<string> {
  const doc = await SystemSettings.findOne({ key: GLOBAL_KEY })
    .select("reminderSmsBody")
    .lean();

  const body = String((doc as any)?.reminderSmsBody || "").trim();
  return body || REMINDER_WITH_TABLE_SERVER_TEMPLATE;
}

export async function saveReminderSmsBody(body: string): Promise<string> {
  const next = String(body ?? "");

  await SystemSettings.findOneAndUpdate(
    { key: GLOBAL_KEY },
    {
      $set: {
        key: GLOBAL_KEY,
        reminderSmsBody: next,
      },
    },
    { upsert: true, new: true }
  );

  return next.trim() || REMINDER_WITH_TABLE_SERVER_TEMPLATE;
}

export async function pruneHiddenTableIdsForEvent({
  eventId,
  liveTableIds,
}: {
  eventId: any;
  liveTableIds: string[];
}) {
  const Event = (await import("@/models/Event")).default;
  const live = new Set(
    (liveTableIds || []).map((id) => String(id || "").trim()).filter(Boolean)
  );

  const event = await Event.findById(eventId).select("hiddenTableIds").lean();
  const current = Array.isArray((event as any)?.hiddenTableIds)
    ? (event as any).hiddenTableIds.map((id: unknown) => String(id || "").trim())
    : [];

  if (!current.length) return current;

  const next = current.filter((id: string) => live.has(id));

  if (next.length === current.length) {
    return current;
  }

  await Event.updateOne(
    { _id: eventId },
    { $set: { hiddenTableIds: next } }
  );

  return next;
}
