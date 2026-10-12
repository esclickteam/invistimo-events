import { phoneNeedsReview } from "@/lib/guestPhone";

export type NoticeSeverity = "info" | "important" | "urgent";

export type PlannedNotice = {
  dedupeKey: string;
  type: string;
  category: string;
  severity: NoticeSeverity;
  title: string;
  body: string;
  actionHref: string;
  audience: "customer" | "admin";
  notifyAdmins?: boolean;
  adminTitle?: string;
  adminBody?: string;
  adminCategory?: string;
  adminSeverity?: NoticeSeverity;
};

export type PushPreferenceToggles = {
  rsvp: boolean;
  failures: boolean;
  eventManagement: boolean;
  reminders: boolean;
};

export const DEFAULT_PUSH_PREFERENCES: PushPreferenceToggles = {
  rsvp: true,
  failures: true,
  eventManagement: true,
  reminders: true,
};

const MESSAGE_HREF = "/dashboard/messages/new";
const GUESTS_HREF = "/dashboard#guests";
const CALLS_HREF = "/dashboard/recorded-calls";

export function safeActionPath(value: unknown, fallback = "/dashboard") {
  const path = String(value || "").trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return fallback;
  }
  if (path.includes("://")) return fallback;
  return path.slice(0, 300);
}

export function pushToggleForCategory(
  category: string
): keyof PushPreferenceToggles | null {
  switch (category) {
    case "rsvp_rounds":
      return "rsvp";
    case "message_failures":
    case "call_failures":
    case "admin_failures":
    case "system_errors":
      return "failures";
    case "event_management":
    case "admin_actions":
      return "eventManagement";
    case "event_reminders":
    case "venue_seating_contacts":
      return "reminders";
    default:
      return null;
  }
}

export function shouldDeliverPush(input: {
  category: string;
  preferences: PushPreferenceToggles;
  configured: boolean;
  subscriptionCount: number;
}) {
  const toggle = pushToggleForCategory(input.category);
  return Boolean(
    input.configured &&
      input.subscriptionCount > 0 &&
      toggle &&
      input.preferences[toggle]
  );
}

export function customerNotificationQuery(userId: string) {
  return {
    userId,
    status: "active" as const,
    audience: { $ne: "admin" as const },
  };
}

export function countPhonesNeedingReview(
  guests: Array<Parameters<typeof phoneNeedsReview>[0]> | null | undefined
) {
  if (!Array.isArray(guests) || guests.length === 0) return 0;
  return guests.reduce((count, guest) => count + (phoneNeedsReview(guest) ? 1 : 0), 0);
}

function channelLabel(channel: "sms" | "whatsapp") {
  return channel === "sms" ? "SMS" : "WhatsApp";
}

function roundLabel(round: number | null) {
  return round ? `סבב ${round}` : "הסבב";
}

function messageKey(input: {
  scheduleId?: string | null;
  channel: string;
  invitationId: string;
  messageType: string;
  round: number | null;
  kind: string;
  salt: string;
}) {
  if (input.scheduleId) return `msg:${input.scheduleId}:${input.kind}`;
  return `msg:${input.channel}:${input.invitationId}:${input.messageType}:${input.round ?? "x"}:${input.kind}:${input.salt}`;
}

export function planMessageRoundNotifications(input: {
  scheduleId?: string | null;
  invitationId: string;
  channel: "sms" | "whatsapp";
  messageType: string;
  round: number | null;
  audienceCount: number;
  sentCount: number;
  outcome: "sent" | "failed";
  phonesNeedingReview: number;
  salt: string;
}): PlannedNotice[] {
  const notices: PlannedNotice[] = [];
  const audience = Math.max(0, Math.floor(input.audienceCount || 0));
  const sent = Math.max(0, Math.floor(input.sentCount || 0));
  const channel = channelLabel(input.channel);
  const roundText = roundLabel(input.round);
  const isRsvp = input.messageType === "rsvp";
  const keyBase = {
    scheduleId: input.scheduleId,
    channel: input.channel,
    invitationId: input.invitationId,
    messageType: input.messageType,
    round: input.round,
    salt: input.salt,
  };

  if (input.outcome === "failed") {
    notices.push({
      dedupeKey: messageKey({ ...keyBase, kind: "error" }),
      type: "rsvp.round.error",
      category: "message_failures",
      severity: "urgent",
      title: "שגיאה המחייבת טיפול",
      body: `שליחת ההודעות ב${channel} נעצרה בגלל תקלה. ${roundText} דורש בדיקה.`,
      actionHref: MESSAGE_HREF,
      audience: "customer",
      notifyAdmins: true,
      adminTitle: "כשל בשליחת הודעות",
      adminBody: `שליחת ${channel} אצל לקוח נעצרה ודורשת טיפול.`,
      adminCategory: "admin_failures",
      adminSeverity: "urgent",
    });
  } else if (audience > 0 && sent === 0) {
    notices.push({
      dedupeKey: messageKey({ ...keyBase, kind: "unsent" }),
      type: "rsvp.round.unsent",
      category: "message_failures",
      severity: "urgent",
      title: "הודעות שלא נשלחו",
      body: `${roundText} ב${channel} הסתיים בלי שנשלחה הודעה מתוך ${audience}. יש לבדוק את הסבב.`,
      actionHref: MESSAGE_HREF,
      audience: "customer",
      notifyAdmins: true,
      adminTitle: "הודעות שלא נשלחו",
      adminBody: `סבב ${channel} של לקוח הסתיים בלי הודעות שנשלחו.`,
      adminCategory: "admin_failures",
      adminSeverity: "urgent",
    });
  } else if (audience > 0 && sent < audience) {
    notices.push({
      dedupeKey: messageKey({ ...keyBase, kind: "partial" }),
      type: "rsvp.round.partial",
      category: "message_failures",
      severity: "important",
      title: "הודעות שלא נשלחו",
      body: `נשלחו ${sent} מתוך ${audience} הודעות ב${channel}. חלק מההודעות לא יצאו ויש לבדוק אותן.`,
      actionHref: MESSAGE_HREF,
      audience: "customer",
      notifyAdmins: true,
      adminTitle: "חלק מההודעות לא נשלחו",
      adminBody: `בסבב ${channel} של לקוח נשלחו ${sent} מתוך ${audience} הודעות.`,
      adminCategory: "admin_failures",
      adminSeverity: "important",
    });
  } else if (isRsvp) {
    notices.push({
      dedupeKey: messageKey({ ...keyBase, kind: "done" }),
      type: "rsvp.round.done",
      category: "rsvp_rounds",
      severity: "info",
      title: "סבב הודעות הסתיים",
      body:
        audience > 0
          ? `${roundText} ב${channel} הסתיים. נשלחו ${sent} הודעות.`
          : `${roundText} ב${channel} הסתיים. לא היו נמענים בסבב.`,
      actionHref: MESSAGE_HREF,
      audience: "customer",
    });
  }

  if (input.phonesNeedingReview > 0) {
    notices.push({
      dedupeKey: messageKey({ ...keyBase, kind: "phones" }),
      type: "rsvp.phones.review",
      category: "rsvp_rounds",
      severity: "important",
      title: "מספרי טלפון המחייבים בדיקה",
      body: `יש ${input.phonesNeedingReview} מספרי טלפון שכדאי לבדוק לפני המשך השליחה.`,
      actionHref: GUESTS_HREF,
      audience: "customer",
    });
  }

  return notices;
}

export function planCallRoundNotifications(input: {
  invitationId: string;
  round: number;
  runId: string;
  status: string;
  dialed: number;
}): PlannedNotice[] {
  const status = String(input.status || "").toLowerCase();
  if (status !== "done" && status !== "failed") return [];
  const runId = String(input.runId || "run").slice(0, 80);
  const round = input.round;
  if (status === "failed") {
    return [
      {
        dedupeKey: `call-round:failed:${input.invitationId}:${round}:${runId}`,
        type: "rsvp.calls.failed",
        category: "call_failures",
        severity: "urgent",
        title: "תקלה בסבב שיחות",
        body: `סבב השיחות ${round} לא הושלם ודורש בדיקה.`,
        actionHref: CALLS_HREF,
        audience: "customer",
        notifyAdmins: true,
        adminTitle: "תקלה בסבב שיחות",
        adminBody: `סבב שיחות ${round} של לקוח נכשל ודורש טיפול.`,
        adminCategory: "admin_failures",
        adminSeverity: "urgent",
      },
    ];
  }
  const dialed = Math.max(0, Math.floor(input.dialed || 0));
  return [
    {
      dedupeKey: `call-round:done:${input.invitationId}:${round}:${runId}`,
      type: "rsvp.calls.done",
      category: "rsvp_rounds",
      severity: "info",
      title: "סבב שיחות הסתיים",
      body:
        dialed > 0
          ? `סבב השיחות ${round} הסתיים. בוצעו ${dialed} חיוגים.`
          : `סבב השיחות ${round} הסתיים.`,
      actionHref: CALLS_HREF,
      audience: "customer",
    },
  ];
}

export function planQueuedFailureNotification(input: {
  invitationId: string;
  round: number | null;
  dateKey: string;
}): PlannedNotice {
  const round = input.round || 0;
  return {
    dedupeKey: `wa-unsent:${input.invitationId}:${round}:${input.dateKey}`,
    type: "rsvp.whatsapp.unsent",
    category: "message_failures",
    severity: "important",
    title: "הודעות שלא נשלחו",
    body: "חלק מהודעות הוואטסאפ בסבב לא נשלחו. אין התראה נפרדת על כל אורח.",
    actionHref: MESSAGE_HREF,
    audience: "customer",
    notifyAdmins: true,
    adminTitle: "הודעות וואטסאפ שלא נשלחו",
    adminBody: "יש הודעות וואטסאפ שלא נשלחו אצל לקוח ודורשות בדיקה.",
    adminCategory: "admin_failures",
    adminSeverity: "important",
  };
}

export function planSystemErrorNotification(input: {
  source: string;
  hourBucket: string;
}): PlannedNotice {
  return {
    dedupeKey: `system:${input.source}:${input.hourBucket}`,
    type: "system.error",
    category: "system_errors",
    severity: "urgent",
    title: "שגיאת מערכת",
    body: "תהליך רקע נכשל ודורש בדיקה של מנהל המערכת.",
    actionHref: "/admin",
    audience: "admin",
  };
}

export function planEventDigestNotifications(input: {
  now: Date;
  eventId: string;
  title: string;
  start: Date | null;
  dateKey: string;
  cancelled: boolean;
  missingLocation: boolean;
  missingTime: boolean;
  actionHref: string;
}): PlannedNotice[] {
  if (!input.start || input.cancelled) return [];
  if (input.start.getTime() <= input.now.getTime()) return [];
  const hours = (input.start.getTime() - input.now.getTime()) / (60 * 60 * 1000);
  if (hours <= 0) return [];
  const title = String(input.title || "").trim() || "האירוע";
  const href = safeActionPath(input.actionHref);
  const notices: PlannedNotice[] = [];

  if (hours <= 24) {
    notices.push({
      dedupeKey: `event-reminder:${input.eventId}:h24:${input.dateKey}`,
      type: "event.reminder.h24",
      category: "event_reminders",
      severity: "urgent",
      title: "האירוע מתחיל בקרוב",
      body: `${title} מתחיל בעוד פחות מיממה. כדאי לעבור על הפרטים שעדיין פתוחים.`,
      actionHref: href,
      audience: "customer",
    });
  } else if (hours <= 24 * 7) {
    notices.push({
      dedupeKey: `event-reminder:${input.eventId}:d7:${input.dateKey}`,
      type: "event.reminder.d7",
      category: "event_reminders",
      severity: "important",
      title: "תזכורת לפני האירוע",
      body: `${title} מתקרב. נותרו כשבוע, וכדאי לוודא שהפרטים והפעולות הושלמו.`,
      actionHref: href,
      audience: "customer",
    });
  }

  if (hours <= 24 * 14 && input.missingLocation) {
    notices.push({
      dedupeKey: `event-missing:${input.eventId}:location:${input.dateKey}`,
      type: "event.missing.location",
      category: "event_management",
      severity: "important",
      title: "חסר מיקום לאירוע",
      body: `לאירוע ${title} חסר מיקום, ויש להשלים אותו לפני האירוע.`,
      actionHref: href,
      audience: "customer",
    });
  }

  if (hours <= 24 * 14 && input.missingTime) {
    notices.push({
      dedupeKey: `event-missing:${input.eventId}:time:${input.dateKey}`,
      type: "event.missing.time",
      category: "event_management",
      severity: "important",
      title: "חסרה שעת האירוע",
      body: `לאירוע ${title} חסרה שעה, ויש להשלים אותה לפני האירוע.`,
      actionHref: href,
      audience: "customer",
    });
  }

  if (hours <= 48 && (input.missingLocation || input.missingTime)) {
    notices.push({
      dedupeKey: `event-missing-admin:${input.eventId}:${input.dateKey}`,
      type: "admin.event.missing",
      category: "admin_actions",
      severity: "important",
      title: "נתונים חסרים לפני אירוע",
      body: `ללקוח חסרים פרטים באירוע ${title} שמתחיל בקרוב.`,
      actionHref: "/admin/users",
      audience: "admin",
    });
  }

  return notices;
}

export type PanelPlacement = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

export function placeNotificationPanel(input: {
  anchorTop: number;
  anchorBottom: number;
  anchorLeft: number;
  anchorRight: number;
  viewportWidth: number;
  viewportHeight: number;
  preferredWidth?: number;
  preferredHeight?: number;
  gap?: number;
  margin?: number;
}): PanelPlacement {
  const margin = input.margin ?? 8;
  const gap = input.gap ?? 8;
  const preferredWidth = input.preferredWidth ?? 380;
  const preferredHeight = input.preferredHeight ?? 460;
  const availableWidth = Math.max(0, input.viewportWidth - margin * 2);
  const width = Math.min(preferredWidth, availableWidth);
  let left = input.anchorRight - width;
  const maxLeft = Math.max(margin, input.viewportWidth - margin - width);
  left = Math.min(Math.max(left, margin), maxLeft);

  const spaceBelow = input.viewportHeight - input.anchorBottom - gap - margin;
  const spaceAbove = input.anchorTop - gap - margin;
  const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;

  if (openAbove) {
    const maxHeight = Math.max(140, Math.min(preferredHeight, spaceAbove));
    return {
      left,
      width,
      maxHeight,
      bottom: Math.max(margin, input.viewportHeight - input.anchorTop + gap),
    };
  }

  const maxHeight = Math.max(140, Math.min(preferredHeight, Math.max(spaceBelow, 140)));
  const top = Math.min(
    input.anchorBottom + gap,
    Math.max(margin, input.viewportHeight - margin - 140)
  );
  return { left, width, maxHeight, top };
}

export function detectPushSupport(env: {
  hasNotification: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  userAgent: string;
  standalone: boolean;
  permission: "default" | "granted" | "denied" | "unsupported";
}) {
  const ua = env.userAgent || "";
  const iOS = /iPad|iPhone|iPod/i.test(ua);
  if (!env.hasNotification || !env.hasServiceWorker || !env.hasPushManager) {
    return {
      supported: false,
      reason: iOS && !env.standalone ? "ios-home-screen" : "unsupported",
      permission: "unsupported" as const,
      iOS,
      standalone: env.standalone,
    };
  }
  if (iOS && !env.standalone) {
    return {
      supported: false,
      reason: "ios-home-screen" as const,
      permission: env.permission,
      iOS: true,
      standalone: false,
    };
  }
  return {
    supported: true,
    reason: null,
    permission: env.permission,
    iOS,
    standalone: env.standalone,
  };
}

export function platformFromUserAgent(userAgent: string) {
  const ua = userAgent || "";
  if (/iPad|iPhone|iPod/i.test(ua)) return "ios" as const;
  if (/Android/i.test(ua)) return "android" as const;
  if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) return "desktop" as const;
  return "unknown" as const;
}

export function platformLabel(platform: string) {
  if (platform === "ios") return "iPhone";
  if (platform === "android") return "Android";
  if (platform === "desktop") return "מחשב";
  return "מכשיר";
}
