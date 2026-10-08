import SystemSettings from "@/models/SystemSettings";
import { REMINDER_WITH_TABLE_SERVER_TEMPLATE } from "@/lib/messages/resolveReminderSmsTemplate";

const GLOBAL_KEY = "global";

/** Classic reminder event-details link placeholder — must stay in every reminder body. */
export const REMINDER_NAVIGATION_LINK_BLOCK =
  "לכל פרטי האירוע והניווט:\n{{navigationLink}}";

/**
 * If a saved/custom body lost {{navigationLink}}, put the classic link block back.
 * Does not rewrite bodies that already include the placeholder.
 */
export function ensureReminderNavigationPlaceholder(body: string): string {
  const raw = String(body || "").trim();
  if (!raw) return REMINDER_WITH_TABLE_SERVER_TEMPLATE;
  if (raw.includes("{{navigationLink}}")) return raw;

  return `${raw}\n\n${REMINDER_NAVIGATION_LINK_BLOCK}\n\nנשמח לראותכם ❤️`
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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
  return ensureReminderNavigationPlaceholder(
    body || REMINDER_WITH_TABLE_SERVER_TEMPLATE
  );
}

export async function saveReminderSmsBody(body: string): Promise<string> {
  const next = ensureReminderNavigationPlaceholder(String(body ?? ""));

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

  return next;
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
