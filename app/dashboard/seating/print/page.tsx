"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

/* ===============================
   TYPES
=============================== */
type Guest = {
  id?: string;
  _id?: string;
  name: string;
  arrivedCount?: number;
  groupId?: string | { _id?: string } | null;
};

type SeatedGuest = {
  guestId: string;
};

type Table = {
  id: string;
  name: string;
  seats?: number;
  seatedGuests: SeatedGuest[];
};

type GroupType = {
  _id: string;
  name: string;
};

export default function SeatingPrintPage() {
  const params = useSearchParams();
  const eventId = params.get("eventId");

  const [tables, setTables] = useState<Table[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [loading, setLoading] = useState(true);

  /* ===============================
     LOAD DATA
  =============================== */
  useEffect(() => {
    if (!eventId) return;

    async function load() {
      try {
        const [tRes, gRes, groupsRes] = await Promise.all([
          fetch(`/api/seating/tables/${eventId}`),
          fetch(`/api/seating/guests/${eventId}`),
          fetch(`/api/seating/groups/${eventId}`),
        ]);

        const tData = await tRes.json();
        const gData = await gRes.json();
        const groupsData = await groupsRes.json();

        setTables(tData.tables || []);
        setGuests(gData.guests || []);
        setGroups(groupsData.groups || []);
      } catch (err) {
        console.error("Failed loading print seating data:", err);
      } finally {
        setLoading(false);
        setTimeout(() => window.print(), 400);
      }
    }

    load();
  }, [eventId]);

  /* ===============================
     MAPS
  =============================== */
  const guestMap = useMemo(() => {
    const map = new Map<string, Guest>();
    guests.forEach((g) => {
      map.set(String(g.id ?? g._id), g);
    });
    return map;
  }, [guests]);

  const groupMap = useMemo(() => {
    const map = new Map<string, GroupType>();
    groups.forEach((g) => {
      map.set(String(g._id), g);
    });
    return map;
  }, [groups]);

  const normalizeGroupId = (value: Guest["groupId"]) => {
    if (!value) return null;
    if (typeof value === "object") {
      return value._id ? String(value._id) : null;
    }
    return String(value);
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-gray-500">
        טוען סידור הושבה…
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white px-8 py-6 text-right">
      <h1 className="text-2xl font-bold text-center mb-8">סידור הושבה</h1>

      <div className="grid grid-cols-3 print:grid-cols-2 gap-6">
        {tables.map((table) => {
          const rows = table.seatedGuests
            .map((sg) => {
              const guest = guestMap.get(String(sg.guestId));
              if (!guest) return null;

              return {
                name: guest.name,
                arrived: 1,
                groupId: normalizeGroupId(guest.groupId),
              };
            })
            .filter(Boolean) as { name: string; arrived: number; groupId: string | null }[];

          const arrivedTotal = rows.length;
          const capacity = table.seats ?? arrivedTotal;

          const titleColor =
            arrivedTotal === 0
              ? "text-green-600"
              : arrivedTotal < capacity
              ? "text-red-600"
              : "text-black";

          const firstGroupId =
            rows.find((r) => r.groupId)?.groupId || null;

          const groupName = firstGroupId
            ? groupMap.get(firstGroupId)?.name || ""
            : "";

          return (
            <div
              key={table.id}
              className="border border-black p-3 break-inside-avoid"
            >
              {/* כותרת שולחן */}
              <div className={`text-center font-bold mb-2 ${titleColor}`}>
                {groupName ? (
                  <>
                    <div>{groupName}</div>
                    <div>{table.name}</div>
                    <div>
                      ({arrivedTotal}/{capacity})
                    </div>
                  </>
                ) : (
                  <div>
                    {table.name} ({arrivedTotal}/{capacity})
                  </div>
                )}
              </div>

              {/* טבלה */}
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black px-2 py-1">שם</th>
                    <th className="border border-black px-2 py-1 w-16">
                      הגיעו
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td className="border border-black px-2 py-1">{r.name}</td>
                      <td className="border border-black px-2 py-1 text-center">
                        {r.arrived}
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr className="font-bold">
                    <td className="border border-black px-2 py-1">סה״כ</td>
                    <td className="border border-black px-2 py-1 text-center">
                      {arrivedTotal}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}