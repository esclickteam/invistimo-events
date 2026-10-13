export type DirectoryRoleFilter = "all" | "clients" | "staff" | "producer";

const STAFF_TYPE_LABELS: Record<string, string> = {
  general_staff: "עובד מערכת",
  seating_staff: "עובד הושבה",
  usher_staff: "דייל",
  producer_staff: "עובד של מפיק",
};

export function isClientRole(role?: string | null) {
  return role === "user" || role === "client";
}

/** Role chips on the admin users page. Event fields stay on the clients chip only. */
export function matchesDirectoryRole(role: string | undefined | null, filter: string) {
  if (filter === "all") return true;
  if (filter === "clients") return isClientRole(role);
  return role === filter;
}

export function eventFilterApplies(roleFilter: string) {
  return roleFilter === "clients";
}

export function employeeRoleLabel(user: {
  staffType?: string | null;
  employeeScope?: string | null;
}) {
  const staffType = String(user.staffType || "").trim();
  if (staffType && STAFF_TYPE_LABELS[staffType]) return STAFF_TYPE_LABELS[staffType];
  if (user.employeeScope === "venue") return "עובד אולם";
  if (user.employeeScope === "producer") return "עובד של מפיק";
  if (user.employeeScope === "system") return "עובד מערכת";
  return "עובד";
}

export function accountStatusLabel(isActive?: boolean | null) {
  return isActive === false ? "לא פעיל" : "פעיל";
}

export function accountStatusActive(isActive?: boolean | null) {
  return isActive !== false;
}

/** Display formatting for an open collection balance already computed by producer billing. */
export function formatOpenBalance(value: number) {
  const amount = Math.round((Number(value) || 0) * 100) / 100;
  const [whole, fraction] = Math.abs(amount).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const text = fraction === "00" ? grouped : `${grouped}.${fraction}`;
  return `${text} ₪`;
}

type AssignedProducerSource = {
  assignedProducerId?: string | null;
  assignedProducerIds?: Array<string | null | undefined> | null;
};

/** Same assignment the clients table already shows under "מפיקים". */
export function assignedProducerIdsOf(user: AssignedProducerSource) {
  if (Array.isArray(user.assignedProducerIds) && user.assignedProducerIds.length > 0) {
    return Array.from(
      new Set(user.assignedProducerIds.map((id) => String(id || "")).filter(Boolean))
    );
  }

  if (user.assignedProducerId) return [String(user.assignedProducerId)];
  return [];
}

export function countAssociatedClients<T extends AssignedProducerSource & { _id?: string; role?: string | null }>(
  users: T[],
  hiddenIds: string[] = []
) {
  const hidden = new Set(hiddenIds);
  const counts: Record<string, number> = {};

  for (const user of users) {
    if (user._id && hidden.has(String(user._id))) continue;
    if (!isClientRole(user.role)) continue;

    for (const producerId of assignedProducerIdsOf(user)) {
      counts[producerId] = (counts[producerId] || 0) + 1;
    }
  }

  return counts;
}

export function associatedClientsForProducer<
  T extends AssignedProducerSource & { _id?: string; role?: string | null },
>(users: T[], producerId: string, hiddenIds: string[] = []) {
  const hidden = new Set(hiddenIds);
  return users.filter((user) => {
    if (user._id && hidden.has(String(user._id))) return false;
    if (!isClientRole(user.role)) return false;
    return assignedProducerIdsOf(user).includes(producerId);
  });
}
