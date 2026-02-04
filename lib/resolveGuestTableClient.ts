export function resolveGuestTableName(
  guest: {
    tableId?: string;
    tableName?: string;
    tableNumber?: number;
  },
  tables: {
    _id: string;
    number?: number;
  }[]
) {
  // 🔹 מקור אמת – טבלת ההושבה
  const table = tables.find(
    t => String(t._id) === String(guest.tableId)
  );

  if (table?.number) {
    return `שולחן ${table.number}`;
  }

  // 🔹 תאימות לאחור
  if (guest.tableName) return guest.tableName;

  if (typeof guest.tableNumber === "number") {
    return `שולחן ${guest.tableNumber}`;
  }

  return "";
}
