export function resolveGuestTableName(
  guest: {
    tableId?: string | null;
  },
  tables: {
    _id: string;
    number?: number;
    displayName?: string;
  }[]
) {
  if (!guest.tableId) return "";

  const table = tables.find(
    t => String(t._id) === String(guest.tableId)
  );

  if (!table) return "";

  // אם יש displayName – הוא מנצח (אופציונלי)
  if (table.displayName) return table.displayName;

  if (typeof table.number === "number") {
    return `שולחן ${table.number}`;
  }

  return "";
}
