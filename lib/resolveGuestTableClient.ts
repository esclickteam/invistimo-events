export function resolveGuestTableName(
  guest: {
    tableId?: string | null;
  },
  tables: {
    _id: string;
    name: string;
  }[]
) {
  if (!guest.tableId) return "";

  const table = tables.find(
    (t) => String(t._id) === String(guest.tableId)
  );

  if (!table) return "";

  return table.name || "";
}
