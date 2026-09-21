import type { Href } from "expo-router";
import type { MeUser } from "@/src/api";
import type { Invitation } from "@/src/api";
import {
  canOpenEventManagement,
  canOpenTransportationManagement,
  hasGuestMessagesFeature,
  hasWeddingWebsiteFeature,
  isUsherStaff,
  userCanAccessCheckIn,
  userHasWeddingChallengesEntitlement,
  userIsWeddingChallengesOnly,
  type AppExperience,
} from "@/src/roles";

export type NavItem = {
  id: string;
  label: string;
  href: Href;
  section?: string;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

export function adminNav(): NavSection[] {
  return [
    {
      items: [
        { id: "overview", label: "סקירה", href: "/(admin)" },
        { id: "customers", label: "לקוחות", href: "/(admin)/customers" },
        { id: "users", label: "משתמשים", href: "/(admin)/users" },
        { id: "wedding-challenges", label: "Wedding Challenges", href: "/(admin)/wedding-challenges" },
        { id: "employees", label: "עובדים", href: "/(admin)/employees" },
        { id: "shift-management", label: "ניהול משמרת", href: "/(admin)/shift-management" },
        { id: "shifts", label: "שיבוץ משמרות", href: "/(admin)/employees/shifts" },
        { id: "call-recordings", label: "הקלטות שיחות", href: "/(admin)/call-recordings" },
        { id: "reminder-sms", label: "הודעת תזכורת", href: "/(admin)/reminder-sms" },
        { id: "sales-new", label: "יצירת לקוח חדש ותשלום", href: "/(admin)/sales/new" },
      ],
    },
  ];
}

export function staffNav(user: MeUser | null): NavSection[] {
  const items: NavItem[] = [
    { id: "dashboard", label: "דשבורד עובדים", href: "/(staff)" },
    { id: "sales", label: "המכירות שלי", href: "/(staff)/sales" },
  ];
  if (!isUsherStaff(user)) {
    items.push(
      { id: "leads", label: "הלידים שלי", href: "/(staff)/leads" },
      { id: "work-orders", label: "הוראות עבודה", href: "/(staff)/work-orders" }
    );
  }
  items.push(
    { id: "file", label: "תיק עובד שלי", href: "/(staff)/file" },
    { id: "shifts", label: "השיבוצים שלי", href: "/(staff)/shifts" },
    { id: "agreement", label: "חתימת הסכם", href: "/(staff)/agreement" },
    { id: "form101", label: "טופס 101", href: "/(staff)/form101" }
  );
  return [{ items }];
}

export function producerNav(): NavSection[] {
  return [
    {
      items: [
        { id: "dashboard", label: "ראשי", href: "/(producer)" },
        { id: "clients", label: "לקוחות", href: "/(producer)/clients" },
        { id: "staff", label: "עובדים", href: "/(producer)/staff" },
      ],
    },
  ];
}

export function producerStaffNav(): NavSection[] {
  return [
    {
      items: [{ id: "dashboard", label: "לקוחות משויכים", href: "/(producer-staff)" }],
    },
  ];
}

export function venueNav(hallId?: string, permissions: string[] = []): NavSection[] {
  if (!hallId) {
    return [{ items: [{ id: "venues", label: "בחירת אולם", href: "/(venue)" }] }];
  }
  const base = `/(venue)/halls/${hallId}`;
  const all: Array<NavItem & { permission?: string }> = [
    { id: "overview", label: "סקירה", href: base as Href, permission: "dashboard.view" },
    { id: "crm", label: "לידים", href: `${base}/crm` as Href, permission: "leads.view" },
    { id: "calendar", label: "אירועים / יומן", href: `${base}/calendar` as Href, permission: "events.view" },
    { id: "day-of", label: "יום האירוע", href: `${base}/day-of` as Href, permission: "events.view" },
    { id: "customers", label: "לקוחות", href: `${base}/customers` as Href, permission: "guests.view" },
    { id: "menus", label: "תפריטים", href: `${base}/menus` as Href, permission: "settings.view" },
    { id: "seating", label: "הושבה", href: `${base}/seating-templates` as Href, permission: "seating.view" },
    { id: "staff", label: "צוות / משמרות", href: `${base}/staff` as Href, permission: "staff.view" },
    { id: "employees", label: "עובדים והרשאות", href: `${base}/employees` as Href, permission: "employees.view" },
    { id: "files", label: "קבצים / חוזים", href: `${base}/files` as Href, permission: "files.view" },
    { id: "equipment", label: "ציוד", href: `${base}/equipment` as Href, permission: "settings.view" },
    { id: "reports", label: "דוחות", href: `${base}/reports` as Href, permission: "reports.view" },
    { id: "settings", label: "הגדרות", href: `${base}/settings` as Href, permission: "settings.view" },
    { id: "activity", label: "יומן פעילות", href: `${base}/activity` as Href, permission: "dashboard.view" },
  ];
  const allowed = permissions.length
    ? all.filter((item) => !item.permission || permissions.includes(item.permission))
    : all;
  return [{ items: allowed.map(({ permission: _p, ...item }) => item) }];
}

export function customerNav(input: {
  user: MeUser | null;
  invitation?: Invitation | null;
  eventLive?: boolean;
  checkInEnabled?: boolean;
  unreadGuestMessages?: number;
}): NavSection[] {
  const { user, invitation } = input;
  const gameOnly = userIsWeddingChallengesOnly(user);
  const invitationId = invitation?._id || "";
  const canCheckIn =
    !gameOnly &&
    Boolean(input.eventLive) &&
    Boolean(input.checkInEnabled) &&
    userCanAccessCheckIn(user);
  const canCallRounds = !gameOnly && user?.includeCalls === true;
  const canWeddingWebsite = !gameOnly && hasWeddingWebsiteFeature(user, invitation);
  const canGuestMessages = !gameOnly && hasGuestMessagesFeature(user, invitation);
  const canCreditGifts = !gameOnly && user?.includeCreditGifts === true;
  const eventManagement = !gameOnly && canOpenEventManagement(user);
  const transport = !gameOnly && canOpenTransportationManagement(user);
  const challenges = userHasWeddingChallengesEntitlement(user) || gameOnly;

  const main: NavItem[] = [
    { id: "dashboard", label: "דשבורד", href: "/(app)" },
    {
      id: "invitation",
      label: invitationId ? "הזמנה" : "יצירת הזמנה",
      href: "/(app)/more/invitation",
    },
    { id: "event-details", label: "פרטי האירוע", href: "/(app)/more/event" },
    { id: "guests", label: "רשימת מוזמנים", href: "/(app)/guests" },
    { id: "messages", label: "שליחת הודעות", href: "/(app)/more/messages" },
    { id: "seating", label: "סידורי הושבה", href: "/(app)/seating" },
  ];
  if (canCallRounds) {
    main.push({ id: "call-rounds", label: "לו״ז אישורי הגעה", href: "/(app)/more/calls" });
  }
  if (canCheckIn) {
    main.push({ id: "checkin", label: "כניסה לאירוע", href: "/(app)/check-in" });
  }

  const services: NavItem[] = [];
  if (canWeddingWebsite) {
    services.push({ id: "wedding-website", label: "אתר חתונה", href: "/(app)/more/website" });
  }
  if (canGuestMessages) {
    services.push({
      id: "guest-messages",
      label: "הודעות מהאורחים",
      href: "/(app)/more/guest-messages",
    });
  }
  if (canCreditGifts) {
    services.push({ id: "credit-gifts", label: "קישור למתנות באשראי", href: "/(app)/more/credit-gifts" });
  }
  if (eventManagement) {
    services.push({ id: "event-management", label: "ניהול אירוע", href: "/(app)/production" });
  }
  if (transport) {
    services.push({ id: "transportation", label: "ניהול הסעות", href: "/(app)/more/transport" });
  }
  if (challenges) {
    services.push({
      id: "wedding-challenges",
      label: "ניהול Wedding Challenges",
      href: "/(app)/more/challenges",
    });
  }
  services.push({ id: "reports", label: "דוחות", href: "/(app)/more/reports" });

  if (gameOnly) {
    return [
      {
        items: [
          { id: "wedding-challenges", label: "ניהול Wedding Challenges", href: "/(app)/more/challenges" },
        ],
      },
    ];
  }

  const filteredMain = main.filter((item) => {
    if (!invitationId && item.id === "event-details") return false;
    return true;
  });

  return [
    { items: filteredMain },
    ...(services.length ? [{ title: "שירותים נוספים", items: services }] : []),
  ];
}

export function navForExperience(
  experience: AppExperience | "guest",
  user: MeUser | null,
  extra?: {
    invitation?: Invitation | null;
    eventLive?: boolean;
    checkInEnabled?: boolean;
    hallId?: string;
    venuePermissions?: string[];
  }
): NavSection[] {
  switch (experience) {
    case "admin":
      return adminNav();
    case "staff":
      return staffNav(user);
    case "producer":
      return producerNav();
    case "producer_staff":
      return producerStaffNav();
    case "venue":
      return venueNav(extra?.hallId, extra?.venuePermissions);
    case "customer":
    case "customer_production":
    case "customer_challenges":
      return customerNav({
        user,
        invitation: extra?.invitation,
        eventLive: extra?.eventLive,
        checkInEnabled: extra?.checkInEnabled,
      });
    default:
      return [];
  }
}

export function brandForExperience(experience: AppExperience | "guest") {
  switch (experience) {
    case "admin":
      return { kicker: "Admin Panel", title: "Invistimo Management", roleLabel: "מנהל מערכת" };
    case "staff":
      return { kicker: "INVISTIMO", title: "דשבורד עובדים", roleLabel: "עובד" };
    case "venue":
      return { kicker: "INVISTIMO", title: "ניהול אולם", roleLabel: "אולם" };
    case "producer":
      return { kicker: "INVISTIMO", title: "דשבורד מפיק", roleLabel: "מפיק" };
    case "producer_staff":
      return { kicker: "INVISTIMO", title: "לקוחות משויכים", roleLabel: "צוות מפיק" };
    default:
      return { kicker: "INVISTIMO", title: "האירוע שלי", roleLabel: "לקוח" };
  }
}
