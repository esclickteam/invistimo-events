"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  seats?: number;
  seatedGuests?: SeatedGuest[];
};

type TableRow = {
  guestId: string;
  name: string;
  count: number;
};

type ExportFormat = "pdf" | "png" | "jpg";

function getId(value: unknown) {
  return String(value || "").trim();
}

function getTableId(table: Table) {
  return getId(table.id || table._id || table.name);
}

function getGuestId(guest: Guest) {
  return getId(guest.id || guest._id);
}

function getTableSize(table: Table) {
  const type = String(table.type || "").toLowerCase();

  if (Number(table.width) > 0 && Number(table.height) > 0) {
    return {
      width: Number(table.width),
      height: Number(table.height),
    };
  }

  if (type === "banquet") {
    return {
      width: 260,
      height: 120,
    };
  }

  if (type === "square") {
    return {
      width: 170,
      height: 170,
    };
  }

  return {
    width: 180,
    height: 180,
  };
}

function buildTableRows(table: Table, guestMap: Map<string, Guest>) {
  const seatedGuests = Array.isArray(table.seatedGuests) ? table.seatedGuests : [];
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

export default function SeatingPrintPage() {
  const params = useSearchParams();

  const eventId = params.get("eventId");
  const format = (params.get("format") || "pdf") as ExportFormat;
  const mode = params.get("mode") || "standard";

  const exportRef = useRef<HTMLDivElement | null>(null);
  const didAutoExportRef = useRef(false);

  const [tables, setTables] = useState<Table[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingImage, setExportingImage] = useState(false);

  useEffect(() => {
    if (!eventId) {
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
  }, [eventId]);

  const guestMap = useMemo(() => {
    const map = new Map<string, Guest>();

    guests.forEach((guest) => {
      const guestId = getGuestId(guest);
      if (guestId) map.set(guestId, guest);
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

  const totalSeated = useMemo(() => {
    return tablesWithRows.reduce((sum, table) => sum + table.seatedTotal, 0);
  }, [tablesWithRows]);

  const totalCapacity = useMemo(() => {
    return tablesWithRows.reduce((sum, table) => sum + table.capacity, 0);
  }, [tablesWithRows]);

  const mapBounds = useMemo(() => {
    if (!tables.length) {
      return {
        minX: 0,
        minY: 0,
        width: 1000,
        height: 600,
      };
    }

    const padding = 140;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    tables.forEach((table) => {
      const x = Number(table.x || 0);
      const y = Number(table.y || 0);
      const size = getTableSize(table);

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + size.width);
      maxY = Math.max(maxY, y + size.height);
    });

    const safeMinX = Number.isFinite(minX) ? minX : 0;
    const safeMinY = Number.isFinite(minY) ? minY : 0;
    const safeMaxX = Number.isFinite(maxX) ? maxX : 1000;
    const safeMaxY = Number.isFinite(maxY) ? maxY : 600;

    return {
      minX: safeMinX - padding,
      minY: safeMinY - padding,
      width: Math.max(900, safeMaxX - safeMinX + padding * 2),
      height: Math.max(520, safeMaxY - safeMinY + padding * 2),
    };
  }, [tables]);

  const downloadAsImage = async (imageFormat: "png" | "jpg") => {
    if (!exportRef.current) return;

    try {
      setExportingImage(true);

      const importer = new Function("moduleName", "return import(moduleName)") as (
        moduleName: string
      ) => Promise<{ default: any }>;

      const html2canvasModule = await importer("html2canvas");
      const html2canvas = html2canvasModule.default;

      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#ffffff",
        scale: 3,
        useCORS: true,
        logging: false,
        windowWidth: exportRef.current.scrollWidth,
        windowHeight: exportRef.current.scrollHeight,
      });

      const mimeType = imageFormat === "jpg" ? "image/jpeg" : "image/png";
      const quality = imageFormat === "jpg" ? 0.95 : undefined;
      const dataUrl = canvas.toDataURL(mimeType, quality);

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `seating-map-${eventId || "event"}.${imageFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Image export failed:", error);
      alert("לא הצלחתי לייצא תמונה. צריך להתקין html2canvas: npm install html2canvas");
    } finally {
      setExportingImage(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (didAutoExportRef.current) return;

    didAutoExportRef.current = true;

    const timer = window.setTimeout(() => {
      if (format === "png" || format === "jpg") {
        downloadAsImage(format);
        return;
      }

      window.print();
    }, 700);

    return () => window.clearTimeout(timer);
  }, [loading, format]);

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

  return (
    <div className="min-h-screen bg-[#F7F3EC] px-4 py-6 text-right print:bg-white print:px-0 print:py-0">
      <div className="mx-auto mb-5 flex max-w-6xl items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-black text-[#2F241C]">ייצוא סידור הושבה</h1>
          <p className="mt-1 text-sm font-bold text-[#8A7A68]">מפה + רשימת אורחים לפי שולחנות</p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => window.print()} className="rounded-2xl bg-[#2F241C] px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-black">
            הדפסה / PDF
          </button>

          <button type="button" onClick={() => downloadAsImage("png")} disabled={exportingImage} className="rounded-2xl border border-[#E4D4BE] bg-white px-4 py-2 text-sm font-black text-[#3B2A1D] shadow-sm hover:bg-[#FFF8EF] disabled:opacity-50">
            PNG
          </button>

          <button type="button" onClick={() => downloadAsImage("jpg")} disabled={exportingImage} className="rounded-2xl border border-[#E4D4BE] bg-white px-4 py-2 text-sm font-black text-[#3B2A1D] shadow-sm hover:bg-[#FFF8EF] disabled:opacity-50">
            JPG
          </button>
        </div>
      </div>

      <div ref={exportRef} dir="rtl" className="mx-auto max-w-6xl bg-white p-8 shadow-xl print:max-w-none print:p-6 print:shadow-none">
        <header className="mb-8 border-b border-[#E8DDD0] pb-5 text-center">
          <div className="text-sm font-black text-[#A58A67]">INVISTIMO</div>
          <h1 className="mt-2 text-3xl font-black text-[#2F241C]">סידור הושבה</h1>
          <p className="mt-2 text-sm font-bold text-[#7A6A5A]">מפת שולחנות + רשימת אורחים לפי שולחנות</p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm font-black text-[#3F2F1F]">
            <span className="rounded-full bg-[#F6F1EA] px-4 py-2">שולחנות: {tablesWithRows.length}</span>
            <span className="rounded-full bg-[#F6F1EA] px-4 py-2">הושבו: {totalSeated}</span>
            <span className="rounded-full bg-[#F6F1EA] px-4 py-2">מקומות: {totalCapacity}</span>
            <span className="rounded-full bg-[#F6F1EA] px-4 py-2">מצב: {mode === "print" ? "הדפסה" : "רגיל"}</span>
          </div>
        </header>

        <section className="mb-10 break-inside-avoid">
          <div className="mb-4 flex items-center justify-between border-b border-[#EFE3D4] pb-3">
            <h2 className="text-xl font-black text-[#2F241C]">מפת שולחנות</h2>
            <span className="text-sm font-bold text-[#8A7A68]">תצוגה כללית של האולם</span>
          </div>

          <div className="relative w-full overflow-hidden rounded-[28px] border border-[#E6D7C4] bg-[#FBF7F0] shadow-sm" style={{ aspectRatio: `${mapBounds.width} / ${mapBounds.height}`, minHeight: 420 }}>
            {tablesWithRows.map((table) => {
              const size = getTableSize(table);
              const x = Number(table.x || 0);
              const y = Number(table.y || 0);

              const left = ((x - mapBounds.minX) / mapBounds.width) * 100;
              const top = ((y - mapBounds.minY) / mapBounds.height) * 100;
              const width = (size.width / mapBounds.width) * 100;
              const height = (size.height / mapBounds.height) * 100;

              const isBanquet = String(table.type || "").toLowerCase() === "banquet";
              const isEmpty = table.seatedTotal === 0;
              const isPartial = table.seatedTotal > 0 && table.seatedTotal < table.capacity;
              const isFull = table.capacity > 0 && table.seatedTotal >= table.capacity;

              const statusClass = isEmpty ? "border-emerald-500 bg-emerald-50 text-emerald-800" : isPartial ? "border-amber-500 bg-amber-50 text-amber-800" : isFull ? "border-[#2F241C] bg-white text-[#2F241C]" : "border-[#2F241C] bg-white text-[#2F241C]";
              const shapeClass = isBanquet ? "rounded-[24px]" : "rounded-full";

              return (
                <div key={getTableId(table)} className={`absolute flex flex-col items-center justify-center border-2 shadow-sm ${statusClass} ${shapeClass}`} style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`, minWidth: isBanquet ? 92 : 72, minHeight: isBanquet ? 48 : 72 }}>
                  <div className="max-w-full truncate px-2 text-center text-xs font-black md:text-sm">{table.name}</div>
                  <div className="mt-1 text-[11px] font-black md:text-xs">{table.seatedTotal}/{table.capacity}</div>
                </div>
              );
            })}

            {!tablesWithRows.length && (
              <div className="flex h-full items-center justify-center text-lg font-black text-[#8A7A68]">
                אין שולחנות להצגה
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between border-b border-[#EFE3D4] pb-3">
            <h2 className="text-xl font-black text-[#2F241C]">רשימת אורחים לפי שולחנות</h2>
            <span className="text-sm font-bold text-[#8A7A68]">פירוט מלא לפי שולחן</span>
          </div>

          <div className="grid grid-cols-3 gap-5 print:grid-cols-2">
            {tablesWithRows.map((table) => {
              const isEmpty = table.seatedTotal === 0;
              const isPartial = table.seatedTotal > 0 && table.seatedTotal < table.capacity;
              const titleColor = isEmpty ? "text-emerald-700" : isPartial ? "text-amber-700" : "text-[#2F241C]";

              return (
                <div key={getTableId(table)} className="break-inside-avoid overflow-hidden rounded-2xl border border-[#2F241C] bg-white">
                  <div className="border-b border-[#2F241C] bg-[#F6F1EA] px-4 py-3 text-center">
                    <div className={`text-base font-black ${titleColor}`}>{table.name}</div>
                    <div className="mt-1 text-xs font-black text-[#6F6257]">{table.seatedTotal}/{table.capacity} מקומות</div>
                  </div>

                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#F2EEE8]">
                        <th className="border-b border-[#2F241C] px-3 py-2 text-right font-black">שם</th>
                        <th className="w-20 border-b border-r border-[#2F241C] px-3 py-2 text-center font-black">כמות</th>
                      </tr>
                    </thead>

                    <tbody>
                      {table.rows.length ? (
                        table.rows.map((row) => (
                          <tr key={row.guestId}>
                            <td className="border-b border-[#D8CFC4] px-3 py-2 font-bold text-[#2F241C]">{row.name}</td>
                            <td className="border-b border-r border-[#D8CFC4] px-3 py-2 text-center font-black text-[#2F241C]">{row.count}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="px-3 py-4 text-center text-sm font-bold text-[#9A8B7D]">אין אורחים בשולחן זה</td>
                        </tr>
                      )}
                    </tbody>

                    <tfoot>
                      <tr className="bg-[#FBF7F0] font-black">
                        <td className="px-3 py-2 text-[#2F241C]">סה״כ</td>
                        <td className="border-r border-[#2F241C] px-3 py-2 text-center text-[#2F241C]">{table.seatedTotal}</td>
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
            margin: 10mm;
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
    </div>
  );
}