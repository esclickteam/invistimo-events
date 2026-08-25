import VenueAlert, {
  type VenueAlertTone,
  type VenueAlertType,
} from "@/models/VenueAlert";
import type { VenuePermission } from "@/lib/venues/permissions";

type CreateVenueAlertInput = {
  ownerId: string;
  hallId?: string;
  title: string;
  description?: string;
  tone?: VenueAlertTone;
  type?: VenueAlertType;
  linkHref?: string;
  /** When set, skip creating a second unread alert with the same key (anti-flood). */
  dedupeKey?: string;
  meta?: Record<string, unknown>;
};

/** Which permission a role needs to see a given alert type. */
export const ALERT_TYPE_PERMISSION: Record<VenueAlertType, VenuePermission> = {
  leads: "leads.view",
  tasks: "events.view",
  events: "events.view",
  clients: "events.view",
  files: "files.view",
  day_of: "guests.view",
  menu: "settings.view",
  payments: "finance.view",
  staff: "staff.view",
  maintenance: "settings.view",
};

export function alertVisibleToPermissions(
  type: VenueAlertType | string,
  permissions: VenuePermission[]
) {
  const needed =
    ALERT_TYPE_PERMISSION[type as VenueAlertType] || "dashboard.view";
  return permissions.includes(needed) || permissions.includes("dashboard.view");
}

export function filterAlertsForPermissions<T extends { type?: string }>(
  alerts: T[],
  permissions: VenuePermission[]
) {
  // OWNER / full dashboard: still filter by type map so SALES doesn't see staff
  return alerts.filter((a) =>
    alertVisibleToPermissions(String(a.type || "maintenance"), permissions)
  );
}

export async function createVenueAlert(input: CreateVenueAlertInput) {
  const title = String(input.title || "").trim();
  if (!title) return null;

  const dedupeKey = String(input.dedupeKey || "").trim();
  if (dedupeKey) {
    const existing = await VenueAlert.findOne({
      ownerId: input.ownerId,
      dedupeKey,
      read: false,
    })
      .select("_id")
      .lean();
    if (existing) return existing;
  }

  return VenueAlert.create({
    ownerId: input.ownerId,
    hallId: input.hallId || undefined,
    title,
    description: String(input.description || "").trim(),
    tone: input.tone || "amber",
    type: input.type || "maintenance",
    linkHref: String(input.linkHref || "").trim(),
    dedupeKey: dedupeKey || undefined,
    meta: input.meta || {},
    read: false,
  });
}

/**
 * Lightweight proactive alerts (approaching events / open tasks due).
 * Called from alerts GET — idempotent via dedupeKey.
 */
export async function refreshProactiveVenueAlerts(params: {
  ownerId: string;
  hallId: string;
}) {
  try {
    const VenueEvent = (await import("@/models/VenueEvent")).default;
    const VenueTask = (await import("@/models/VenueTask")).default;

    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);
    const in3 = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const upcoming = await VenueEvent.find({
      hallId: params.hallId,
      ownerId: params.ownerId,
      date: { $gte: todayISO, $lte: in3 },
      status: { $nin: ["cancelled", "completed"] },
      linkedEventId: { $exists: true, $ne: null },
    })
      .select("_id title date clientName linkedEventId status")
      .limit(8)
      .lean();

    for (const ve of upcoming) {
      const date = String((ve as any).date || "");
      const isToday = date === todayISO;
      await createVenueAlert({
        ownerId: params.ownerId,
        hallId: params.hallId,
        title: isToday
          ? `יום אירוע היום: ${(ve as any).title || "אירוע"}`
          : `אירוע מתקרב: ${(ve as any).title || "אירוע"}`,
        description: `${(ve as any).clientName || "לקוח"} · ${date}`,
        tone: isToday ? "rose" : "amber",
        type: isToday ? "day_of" : "events",
        linkHref: (ve as any).linkedEventId
          ? `/venues/dashboard/events/${String((ve as any).linkedEventId)}`
          : `/venues/dashboard/halls/${encodeURIComponent(params.hallId)}/calendar`,
        dedupeKey: `approach:${params.hallId}:${String((ve as any)._id)}:${date}`,
      });
    }

    const openTasks = await VenueTask.find({
      ownerId: params.ownerId,
      done: false,
      $or: [
        { hallId: params.hallId },
        { hallId: "" },
        { hallId: { $exists: false } },
      ],
      due: { $exists: true, $nin: ["", null] },
    })
      .select("_id title due")
      .limit(10)
      .lean();

    for (const task of openTasks) {
      const due = String((task as any).due || "").trim();
      if (!due) continue;
      // Treat ISO dates / "היום" as due-ish
      const dueLower = due.toLowerCase();
      const isDueSoon =
        dueLower.includes("היום") ||
        dueLower.includes("מחר") ||
        ( /^\d{4}-\d{2}-\d{2}/.test(due) && due.slice(0, 10) <= in3);
      if (!isDueSoon) continue;

      await createVenueAlert({
        ownerId: params.ownerId,
        hallId: params.hallId,
        title: `משימה לטיפול: ${(task as any).title || "משימה"}`,
        description: `תאריך יעד: ${due}`,
        tone: "amber",
        type: "tasks",
        linkHref: `/venues/dashboard/halls/${encodeURIComponent(params.hallId)}`,
        dedupeKey: `task-due:${params.hallId}:${String((task as any)._id)}:${due}`,
      });
    }
  } catch (error) {
    console.error("refreshProactiveVenueAlerts failed:", error);
  }
}
