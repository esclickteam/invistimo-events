/**
 * Venue tenant RBAC — completely separate from Invistimo Staff roles.
 */

export const VENUE_ROLES = [
  "OWNER",
  "MANAGER",
  "EVENT_MANAGER",
  "RECEPTION",
  "SALES",
  "STAFF",
  "VIEWER",
] as const;

export type VenueRole = (typeof VENUE_ROLES)[number];

export const VENUE_PERMISSIONS = [
  "dashboard.view",

  "leads.view",
  "leads.create",
  "leads.edit",
  "leads.delete",
  "leads.convert",

  "events.view",
  "events.create",
  "events.edit",
  "events.delete",

  "guests.view",
  "guests.edit",

  "seating.view",
  "seating.edit",

  "staff.view",
  "staff.manage",

  "files.view",
  "files.upload",
  "files.delete",

  "reports.view",

  "settings.view",
  "settings.edit",

  "employees.view",
  "employees.manage",

  "finance.view",
  "finance.edit",
] as const;

export type VenuePermission = (typeof VENUE_PERMISSIONS)[number];

export const VENUE_PERMISSION_GROUPS: {
  id: string;
  label: string;
  permissions: { key: VenuePermission; label: string }[];
}[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    permissions: [{ key: "dashboard.view", label: "צפייה" }],
  },
  {
    id: "leads",
    label: "Leads",
    permissions: [
      { key: "leads.view", label: "צפייה" },
      { key: "leads.create", label: "יצירה" },
      { key: "leads.edit", label: "עריכה" },
      { key: "leads.delete", label: "מחיקה" },
      { key: "leads.convert", label: "המרה לאירוע" },
    ],
  },
  {
    id: "events",
    label: "Events",
    permissions: [
      { key: "events.view", label: "צפייה" },
      { key: "events.create", label: "יצירה" },
      { key: "events.edit", label: "עריכה" },
      { key: "events.delete", label: "מחיקה" },
    ],
  },
  {
    id: "guests",
    label: "Guests",
    permissions: [
      { key: "guests.view", label: "צפייה" },
      { key: "guests.edit", label: "עריכה" },
    ],
  },
  {
    id: "seating",
    label: "Seating",
    permissions: [
      { key: "seating.view", label: "צפייה" },
      { key: "seating.edit", label: "עריכה" },
    ],
  },
  {
    id: "staff",
    label: "Staff",
    permissions: [
      { key: "staff.view", label: "צפייה" },
      { key: "staff.manage", label: "ניהול" },
    ],
  },
  {
    id: "files",
    label: "Files",
    permissions: [
      { key: "files.view", label: "צפייה" },
      { key: "files.upload", label: "העלאה" },
      { key: "files.delete", label: "מחיקה" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    permissions: [{ key: "reports.view", label: "צפייה" }],
  },
  {
    id: "settings",
    label: "Settings",
    permissions: [
      { key: "settings.view", label: "צפייה" },
      { key: "settings.edit", label: "עריכה" },
    ],
  },
  {
    id: "employees",
    label: "Employees & Permissions",
    permissions: [
      { key: "employees.view", label: "צפייה" },
      { key: "employees.manage", label: "ניהול" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    permissions: [
      { key: "finance.view", label: "צפייה" },
      { key: "finance.edit", label: "עריכה" },
    ],
  },
];

const ALL = [...VENUE_PERMISSIONS];

const ROLE_DEFAULTS: Record<VenueRole, VenuePermission[]> = {
  OWNER: ALL,

  MANAGER: ALL.filter(
    (p) => p !== "employees.manage" && p !== "finance.edit"
  ),

  EVENT_MANAGER: [
    "dashboard.view",
    "events.view",
    "events.create",
    "events.edit",
    "guests.view",
    "guests.edit",
    "seating.view",
    "seating.edit",
    "staff.view",
    "files.view",
    "files.upload",
  ],

  RECEPTION: [
    "dashboard.view",
    "events.view",
    "guests.view",
    "guests.edit",
    "seating.view",
  ],

  SALES: [
    "dashboard.view",
    "leads.view",
    "leads.create",
    "leads.edit",
    "leads.delete",
    "leads.convert",
    "events.view",
    "events.create",
    "files.view",
    "files.upload",
    "reports.view",
  ],

  STAFF: ["dashboard.view", "events.view", "staff.view"],

  VIEWER: [
    "dashboard.view",
    "leads.view",
    "events.view",
    "guests.view",
    "seating.view",
    "files.view",
    "reports.view",
  ],
};

export function isVenueRole(value: unknown): value is VenueRole {
  return VENUE_ROLES.includes(String(value) as VenueRole);
}

export function isVenuePermission(value: unknown): value is VenuePermission {
  return VENUE_PERMISSIONS.includes(String(value) as VenuePermission);
}

export function getDefaultPermissionsForRole(role: VenueRole): VenuePermission[] {
  return [...(ROLE_DEFAULTS[role] || ROLE_DEFAULTS.VIEWER)];
}

/**
 * Effective permissions = role defaults ∪ custom grants.
 * Custom list is additive (owner can grant extras beyond role).
 * To restrict below role, owner should pick a lower role + custom grants.
 */
export function resolveVenuePermissions(
  role: VenueRole,
  customPermissions?: string[] | null
): VenuePermission[] {
  const base = getDefaultPermissionsForRole(role);
  const custom = (customPermissions || []).filter(isVenuePermission);
  return Array.from(new Set([...base, ...custom]));
}

export function hasVenuePermission(
  role: VenueRole,
  customPermissions: string[] | null | undefined,
  required: VenuePermission | VenuePermission[]
): boolean {
  const effective = resolveVenuePermissions(role, customPermissions);
  const needed = Array.isArray(required) ? required : [required];
  return needed.every((p) => effective.includes(p));
}

export const VENUE_ROLE_LABELS: Record<VenueRole, string> = {
  OWNER: "בעלים",
  MANAGER: "מנהל",
  EVENT_MANAGER: "מנהל אירועים",
  RECEPTION: "קבלה",
  SALES: "מכירות",
  STAFF: "צוות",
  VIEWER: "צפייה בלבד",
};
