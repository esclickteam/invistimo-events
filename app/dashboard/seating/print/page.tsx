"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Guest = {
  id?: string;
  _id?: string;
  name: string;
  phone?: string;
  guestsCount?: number;
  arrivedCount?: number;
};

type SeatedGuest = {
  guestId: string;
};

type Table = {
  id?: string;
  _id?: string;
  name: string;
  seats?: number;
  seatedGuests?: SeatedGuest[];
};

type TableRow = {
  guestId: string;
  name: string;
  count: number;
};

function getId(value: unknown) {
  return String(value || "").trim();
}

function getTableId(table: Table) {
  return getId(table.id || table._id || table.name);
}

function getGuestId(guest: Guest) {
  return getId(guest.id || guest._id);
}

function buildTableRows(table: Table, guestMap: Map<string, Guest>) {
  const seatedGuests = Array.isArray(table.seatedGuests)
    ? table.seatedGuests
    : [];

  const rowsMap = new Map<string, TableRow>();

  seatedGuests.forEach((seat) => {
    const guestId = getId(seat.guestId);
    if (!guestId) return;

    const guest = guestMap.get(guestId);
    if (!guest) return;

    const existing = rowsMap.get(guestId);

    if (existing) {
      rowsMap.set(guestId, {
        ...existing,
        count: existing.count + 1,
      });
      return;
    }

    rowsMap.set(guestId, {
      guestId,
      name: guest.name || "ללא שם",
      count: 1,
    });
  });

  return Array.from(rowsMap.values());
}

function SeatingPrintPageInner() {
  const params = useSearchParams();

  const eventId = params.get("eventId");
  const includeGuests = params.get("includeGuests") !== "0";

  const didAutoPrintRef = useRef(false);

  const [tables, setTables] = useState<Table[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [mapImage, setMapImage] = useState("");
  const [mapImageReady, setMapImageReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedImage = sessionStorage.getItem("seatingMapImage");

      if (savedImage) {
        setMapImage(savedImage);
        return;
      }

      setMapImageReady(true);
    } catch (error) {
      console.error("Failed reading seating map image:", error);
      setMapImageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    if (!includeGuests) {
      setLoading(false);
      return;
    }

    let active = true;

    async function load() {
      try {
        setLoading(true);

        const [tablesResponse, guestsResponse] = await Promise.all([
          fetch(`/api/seating/tables/${eventId}`, { cache: "no-store" }),
          fetch(`/api/seating/guests/${eventId}`, { cache: "no-store" }),
        ]);

        const tablesData = await tablesResponse.json();
        const guestsData = await guestsResponse.json();

        if (!active) return;

        setTables(Array.isArray(tablesData.tables) ? tablesData.tables : []);
        setGuests(Array.isArray(guestsData.guests) ? guestsData.guests : []);
      } catch (error) {
        console.error("Failed loading seating print data:", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [eventId, includeGuests]);

  const guestMap = useMemo(() => {
    const map = new Map<string, Guest>();

    guests.forEach((guest) => {
      const guestId = getGuestId(guest);

      if (guestId) {
        map.set(guestId, guest);
      }
    });

    return map;
  }, [guests]);

  const tablesWithRows = useMemo(() => {
    return tables.map((table) => {
      const rows = buildTableRows(table, guestMap);
      const seatedTotal = rows.reduce((sum, row) => sum + row.count, 0);
      const capacity = Number(table.seats || seatedTotal || 0);

      return {
        ...table,
        rows,
        seatedTotal,
        capacity,
      };
    });
  }, [tables, guestMap]);

  useEffect(() => {
    if (loading) return;
    if (mapImage && !mapImageReady) return;
    if (didAutoPrintRef.current) return;

    didAutoPrintRef.current = true;

    const timer = window.setTimeout(() => {
      window.print();
    }, 650);

    return () => window.clearTimeout(timer);
  }, [loading, mapImage, mapImageReady]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white text-lg font-bold text-gray-500">
        טוען סידור הושבה…
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white text-lg font-bold text-red-600">
        חסר eventId לייצוא
      </div>
    );
  }

  if (!mapImage) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white px-6 text-center text-lg font-bold text-red-600">
        לא נמצאה תמונת מפה. צריך לפתוח את הייצוא מתוך עמוד ההושבה.
      </div>
    );
  }

  if (!includeGuests) {
    return (
      <main className="min-h-screen bg-white print:min-h-0">
        <div className="print:hidden flex items-center justify-between border-b border-[#E8DDD0] bg-[#F7F3EC] px-6 py-4">
          <div>
            <h1 className="text-lg font-black text-[#2F241C]">
              PDF — רק מפת שולחנות
            </h1>
            <p className="mt-1 text-sm font-bold text-[#8A7A68]">
              בחלון ההדפסה לבחור Save as PDF
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-2xl bg-[#2F241C] px-4 py-2 text-sm font-black text-white"
          >
            הדפסה / PDF
          </button>
        </div>

        <section className="map-only-page">
          <img
            src={mapImage}
            alt="מפת שולחנות"
            onLoad={() => setMapImageReady(true)}
            onError={() => setMapImageReady(true)}
            className="map-only-image"
          />
        </section>

        <style>{`
          @media print {
            @page {
              size: A4 landscape;
              margin: 6mm;
            }

            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }

            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .map-only-page {
              width: 100%;
              height: calc(100vh - 12mm);
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              page-break-after: avoid;
              page-break-before: avoid;
              page-break-inside: avoid;
            }

            .map-only-image {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
              display: block;
            }
          }

          @media screen {
            .map-only-page {
              min-height: calc(100vh - 90px);
              display: flex;
              align-items: center;
              justify-content: center;
              background: white;
              padding: 24px;
            }

            .map-only-image {
              max-width: 100%;
              max-height: calc(100vh - 140px);
              object-fit: contain;
              display: block;
              border-radius: 18px;
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F3EC] px-4 py-6 text-right print:bg-white print:px-0 print:py-0">
      <div className="mx-auto mb-5 flex max-w-6xl items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-black text-[#2F241C]">
            PDF — מפה + רשימת אורחים
          </h1>

          <p className="mt-1 text-sm font-bold text-[#8A7A68]">
            בחלון ההדפסה לבחור Save as PDF
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-2xl bg-[#2F241C] px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-black"
        >
          הדפסה / PDF
        </button>
      </div>

      <div
        dir="rtl"
        className="mx-auto max-w-6xl bg-white p-8 shadow-xl print:max-w-none print:p-6 print:shadow-none"
      >
        <header className="mb-8 border-b border-[#E8DDD0] pb-5 text-center">
          <div className="text-sm font-black text-[#A58A67]">INVISTIMO</div>

          <h1 className="mt-2 text-3xl font-black text-[#2F241C]">
            סידור הושבה
          </h1>

          <p className="mt-2 text-sm font-bold text-[#7A6A5A]">
            מפת שולחנות + רשימת אורחים לפי שולחנות
          </p>
        </header>

        <section className="mb-10 break-inside-avoid">
          <div className="mb-4 flex items-center justify-between border-b border-[#EFE3D4] pb-3">
            <h2 className="text-xl font-black text-[#2F241C]">
              מפת שולחנות
            </h2>

            <span className="text-sm font-bold text-[#8A7A68]">
              תצוגה אמיתית של המפה מהמערכת
            </span>
          </div>

          <img
            src={mapImage}
            alt="מפת שולחנות"
            onLoad={() => setMapImageReady(true)}
            onError={() => setMapImageReady(true)}
            className="w-full rounded-[28px] border border-[#E6D7C4] bg-[#FBF7F0] shadow-sm"
          />
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between border-b border-[#EFE3D4] pb-3">
            <h2 className="text-xl font-black text-[#2F241C]">
              רשימת אורחים לפי שולחנות
            </h2>

            <span className="text-sm font-bold text-[#8A7A68]">
              פירוט מלא לפי שולחן
            </span>
          </div>

          <div className="grid grid-cols-2 gap-5 max-[900px]:grid-cols-1 print:grid-cols-2">
            {tablesWithRows.map((table) => {
              const isEmpty = table.seatedTotal === 0;
              const isPartial =
                table.seatedTotal > 0 && table.seatedTotal < table.capacity;

              const titleColor = isEmpty
                ? "text-emerald-700"
                : isPartial
                  ? "text-amber-700"
                  : "text-[#2F241C]";

              return (
                <div
                  key={getTableId(table)}
                  className="break-inside-avoid overflow-hidden rounded-2xl border border-[#2F241C] bg-white"
                >
                  <div className="border-b border-[#2F241C] bg-[#F6F1EA] px-4 py-3 text-center">
                    <div className={`text-base font-black ${titleColor}`}>
                      {table.name}
                    </div>

                    <div className="mt-1 text-xs font-black text-[#6F6257]">
                      {table.seatedTotal}/{table.capacity} מקומות
                    </div>
                  </div>

                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#F2EEE8]">
                        <th className="border-b border-[#2F241C] px-3 py-2 text-right font-black">
                          שם
                        </th>

                        <th className="w-20 border-b border-r border-[#2F241C] px-3 py-2 text-center font-black">
                          כמות
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {table.rows.length ? (
                        table.rows.map((row) => (
                          <tr key={row.guestId}>
                            <td className="border-b border-[#D8CFC4] px-3 py-2 font-bold text-[#2F241C]">
                              {row.name}
                            </td>

                            <td className="border-b border-r border-[#D8CFC4] px-3 py-2 text-center font-black text-[#2F241C]">
                              {row.count}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={2}
                            className="px-3 py-4 text-center text-sm font-bold text-[#9A8B7D]"
                          >
                            אין אורחים בשולחן זה
                          </td>
                        </tr>
                      )}
                    </tbody>

                    <tfoot>
                      <tr className="bg-[#FBF7F0] font-black">
                        <td className="px-3 py-2 text-[#2F241C]">סה״כ</td>

                        <td className="border-r border-[#2F241C] px-3 py-2 text-center text-[#2F241C]">
                          {table.seatedTotal}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          html,
          body {
            background: white !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </main>
  );
}

export default function SeatingPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-white text-lg font-bold text-gray-500">
          טוען סידור הושבה…
        </div>
      }
    >
      <SeatingPrintPageInner />
    </Suspense>
  );
}