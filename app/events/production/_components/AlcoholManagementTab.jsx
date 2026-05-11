"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  BottleWine,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Download,
  GlassWater,
  History,
  MapPin,
  Minus,
  PackagePlus,
  Plus,
  RefreshCcw,
  Sparkles,
  Trash2,
  Wine,
} from "lucide-react";

/* ======================================================
   CONFIG
====================================================== */

const MODES = [
  {
    key: "planning",
    label: "תכנון מלאי",
    description: "הגדרת סוגי אלכוהול וכמויות",
    icon: ClipboardList,
  },
  {
    key: "allocation",
    label: "הקצאות",
    description: "חלוקה לבר, שולחנות, עמדות וחדר חתן־כלה",
    icon: MapPin,
  },
  {
    key: "live",
    label: "ניהול לייב",
    description: "פתיחת בקבוקים ומעקב בזמן אמת",
    icon: GlassWater,
  },
];

const CATEGORY_OPTIONS = [
  "וודקה",
  "וויסקי",
  "ערק",
  "טקילה",
  "ג׳ין",
  "רום",
  "יין",
  "שמפניה",
  "ליקר",
  "בירה",
  "אחר",
];

const QUICK_LOCATIONS = [
  "בר ראשי",
  "בר רחבה",
  "שולחנות",
  "חדר חתן כלה",
  "VIP",
  "רזרבה",
];

const DEFAULT_BOTTLE = {
  category: "וודקה",
  brand: "",
  flavor: "",
  total: 1,
  allocations: [],
};

const STORAGE_PREFIX = "invistimo_alcohol_logs";

/* ======================================================
   MAIN
====================================================== */

export default function AlcoholManagementSystem({ eventId }) {
  const [mode, setMode] = useState("planning");
  const [bottles, setBottles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  const bottleFieldTimeout = useRef({});
  const logSaveTimeout = useRef(null);

  const storageKey = `${STORAGE_PREFIX}_${eventId || "unknown"}`;

  /* ======================================================
     LOAD FROM API
  ====================================================== */

  useEffect(() => {
    if (!eventId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/events/${eventId}/alcohol`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to load alcohol");
        }

        const data = await res.json();

        if (cancelled) return;

        const alcohol = Array.isArray(data?.alcohol)
          ? data.alcohol.filter(Boolean)
          : [];

        setBottles(alcohol);

        const serverLogs = Array.isArray(data?.logs)
          ? data.logs
          : Array.isArray(data?.alcoholLogs)
            ? data.alcoholLogs
            : [];

        if (serverLogs.length > 0) {
          setLogs(serverLogs);
          localStorage.setItem(storageKey, JSON.stringify(serverLogs));
        } else {
          const savedLogs = localStorage.getItem(storageKey);
          setLogs(savedLogs ? JSON.parse(savedLogs) : []);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setBottles([]);
          setError("לא הצלחנו לטעון את מערכת האלכוהול. נסי לרענן.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [eventId, storageKey]);

  /* ======================================================
     STATS
  ====================================================== */

  const stats = useMemo(() => {
    const total = bottles.reduce(
      (sum, b) => sum + safeNumber(b.total),
      0
    );

    const allocated = bottles.reduce(
      (sum, b) => sum + totalAllocated(b),
      0
    );

    const opened = bottles.reduce(
      (sum, b) => sum + totalOpened(b),
      0
    );

    const remaining = Math.max(total - opened, 0);
    const unallocated = Math.max(total - allocated, 0);

    return {
      total,
      allocated,
      opened,
      remaining,
      unallocated,
      bottleTypes: bottles.length,
    };
  }, [bottles]);

  /* ======================================================
     HELPERS
  ====================================================== */

  function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function totalAllocated(bottle) {
    return (bottle.allocations || []).reduce(
      (sum, a) => sum + safeNumber(a.qty),
      0
    );
  }

  function totalOpened(bottle) {
    return (bottle.allocations || []).reduce(
      (sum, a) => sum + safeNumber(a.opened),
      0
    );
  }

  function remainingUnallocated(bottle) {
    return Math.max(
      safeNumber(bottle.total) - totalAllocated(bottle),
      0
    );
  }

  function remainingInAllocation(allocation) {
    return Math.max(
      safeNumber(allocation.qty) - safeNumber(allocation.opened),
      0
    );
  }

  function bottleLabel(bottle) {
    return [
      bottle.category,
      bottle.brand,
      bottle.flavor,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function getProgress(opened, total) {
    if (!total) return 0;
    return Math.min(100, Math.round((opened / total) * 100));
  }

  async function persistLogs(nextLogs) {
    setLogs(nextLogs);
    localStorage.setItem(storageKey, JSON.stringify(nextLogs));

    if (logSaveTimeout.current) {
      clearTimeout(logSaveTimeout.current);
    }

    logSaveTimeout.current = setTimeout(async () => {
      try {
        await fetch(`/api/events/${eventId}/alcohol/logs`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            logs: nextLogs,
          }),
        });
      } catch (err) {
        /*
          אם אין עדיין route ללוגים בשרת, הלוגים נשמרים קבוע בדפדפן.
          כשהשרת יתמוך ב-/alcohol/logs זה יישמר גם בדאטהבייס בלי שינוי בפרונט.
        */
      }
    }, 350);
  }

  function addLog(text, type = "info") {
    const entry = {
      _id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      type,
      text,
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: new Date().toLocaleDateString("he-IL"),
    };

    const nextLogs = [entry, ...logs].slice(0, 300);
    persistLogs(nextLogs);
  }

  /* ======================================================
     API ACTIONS
  ====================================================== */

  async function addBottle() {
    try {
      setSavingId("new");

      const res = await fetch(`/api/events/${eventId}/alcohol`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(DEFAULT_BOTTLE),
      });

      if (!res.ok) {
        throw new Error("Failed to add bottle");
      }

      const data = await res.json();

      if (data?.alcohol) {
        setBottles((prev) => [...prev, data.alcohol].filter(Boolean));
        addLog("נוסף סוג אלכוהול חדש למלאי", "create");
      }
    } catch (err) {
      console.error(err);
      setError("לא הצלחנו להוסיף סוג אלכוהול.");
    } finally {
      setSavingId(null);
    }
  }

  async function updateBottle(id, patch, logText = "") {
    const prevBottles = bottles;

    setBottles((prev) =>
      prev
        .filter(Boolean)
        .map((b) =>
          b._id === id
            ? {
                ...b,
                ...patch,
              }
            : b
        )
    );

    try {
      setSavingId(id);

      const res = await fetch(`/api/events/alcohol/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        throw new Error("Failed to update bottle");
      }

      const data = await res.json();

      setBottles((prev) =>
        prev
          .filter(Boolean)
          .map((b) =>
            b._id === id
              ? data?.alcohol ?? b
              : b
          )
      );

      if (logText) {
        addLog(logText, "update");
      }
    } catch (err) {
      console.error(err);
      setBottles(prevBottles);
      setError("לא הצלחנו לשמור את השינוי.");
    } finally {
      setSavingId(null);
    }
  }

  async function removeBottle(id) {
    const bottle = bottles.find((b) => b._id === id);
    const prevBottles = bottles;

    setBottles((prev) => prev.filter((b) => b._id !== id));

    try {
      setSavingId(id);

      const res = await fetch(`/api/events/alcohol/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete bottle");
      }

      addLog(`נמחק מהמלאי: ${bottleLabel(bottle) || "פריט אלכוהול"}`, "delete");
    } catch (err) {
      console.error(err);
      setBottles(prevBottles);
      setError("לא הצלחנו למחוק את הפריט.");
    } finally {
      setSavingId(null);
    }
  }

  function updateBottleField(index, field, value) {
    const bottle = bottles[index];
    if (!bottle?._id) return;

    setBottles((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      return copy;
    });

    const key = `${bottle._id}-${field}`;

    if (bottleFieldTimeout.current[key]) {
      clearTimeout(bottleFieldTimeout.current[key]);
    }

    bottleFieldTimeout.current[key] = setTimeout(() => {
      updateBottle(bottle._id, {
        [field]: value,
      });
    }, 450);
  }

  async function addAllocation(bottle, location, qty) {
    const cleanLocation = String(location || "").trim();
    const cleanQty = safeNumber(qty);

    if (!cleanLocation || cleanQty <= 0) return;

    const max = remainingUnallocated(bottle);

    if (cleanQty > max) {
      setError(`אי אפשר להקצות יותר ממה שנשאר. נותרו ${max}.`);
      return;
    }

    const allocations = [
      ...(bottle.allocations || []),
      {
        location: cleanLocation,
        qty: cleanQty,
        opened: 0,
      },
    ];

    await updateBottle(
      bottle._id,
      { allocations },
      `${bottleLabel(bottle)} – הוקצו ${cleanQty} בקבוקים ל${cleanLocation}`
    );
  }

  async function removeAllocation(bottle, allocationIndex) {
    const allocation = bottle.allocations?.[allocationIndex];
    if (!allocation) return;

    const allocations = [...(bottle.allocations || [])];
    allocations.splice(allocationIndex, 1);

    await updateBottle(
      bottle._id,
      { allocations },
      `${bottleLabel(bottle)} – נמחקה הקצאה מ${allocation.location}`
    );
  }

  async function updateAllocationQty(bottle, allocationIndex, qty) {
    const allocations = [...(bottle.allocations || [])];
    const allocation = allocations[allocationIndex];

    if (!allocation) return;

    const cleanQty = Math.max(safeNumber(qty), safeNumber(allocation.opened));

    allocations[allocationIndex] = {
      ...allocation,
      qty: cleanQty,
    };

    await updateBottle(bottle._id, { allocations });
  }

  async function openBottle(bottle, allocationIndex) {
    const allocations = [...(bottle.allocations || [])];
    const allocation = allocations[allocationIndex];

    if (!allocation) return;

    if (safeNumber(allocation.opened) >= safeNumber(allocation.qty)) {
      return;
    }

    allocations[allocationIndex] = {
      ...allocation,
      opened: safeNumber(allocation.opened) + 1,
    };

    await updateBottle(
      bottle._id,
      { allocations },
      `${bottleLabel(bottle)} – נפתח בקבוק ב${allocation.location}`
    );
  }

  async function closeBottle(bottle, allocationIndex) {
    const allocations = [...(bottle.allocations || [])];
    const allocation = allocations[allocationIndex];

    if (!allocation || safeNumber(allocation.opened) <= 0) return;

    allocations[allocationIndex] = {
      ...allocation,
      opened: safeNumber(allocation.opened) - 1,
    };

    await updateBottle(
      bottle._id,
      { allocations },
      `${bottleLabel(bottle)} – בוטלה פתיחת בקבוק ב${allocation.location}`
    );
  }

  function clearLocalLogs() {
    persistLogs([]);
  }

  function exportLogs() {
    const lines = logs.map(
      (l) => `${l.date || ""} ${l.time || ""} - ${l.text || ""}`
    );

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `alcohol-logs-${eventId}.txt`;
    a.click();

    URL.revokeObjectURL(url);
  }

  /* ======================================================
     RENDER STATES
  ====================================================== */

  if (!eventId || loading) {
    return (
      <div
        dir="rtl"
        className="
          p-16
          text-center
          text-gray-400
          font-bold
        "
      >
        טוען מערכת אלכוהול…
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="
        w-full
        max-w-none
        mx-auto
        px-6
        py-10
        overflow-hidden
      "
    >
      {/* HEADER */}
      <div className="text-center mb-10">
        <div
          className="
            inline-flex
            items-center
            gap-2
            rounded-full
            border
            border-[#E8DDD3]
            bg-white
            px-5
            py-2
            text-sm
            font-black
            text-[#7A4A35]
            mb-5
            shadow-sm
          "
        >
          <Sparkles size={16} />
          ניהול בר ואלכוהול
        </div>

        <h1
          className="
            text-4xl
            xl:text-5xl
            font-black
            text-[#1E1B2E]
            leading-tight
          "
        >
          🍾 מערכת ניהול אלכוהול
        </h1>

        <p className="text-gray-500 mt-4">
          תכנון מלאי, הקצאות לבר, ניהול פתיחת בקבוקים ולוג פעולות קבוע
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div
          className="
            mb-6
            rounded-3xl
            border
            border-red-100
            bg-red-50
            text-red-600
            px-5
            py-4
            font-bold
            flex
            items-center
            justify-between
            gap-4
          "
        >
          <span>{error}</span>

          <button
            onClick={() => setError("")}
            className="text-sm underline"
          >
            סגור
          </button>
        </div>
      )}

      {/* STATS */}
      <div
        className="
          grid
          grid-cols-2
          lg:grid-cols-5
          gap-4
          mb-8
        "
      >
        <StatCard
          icon={BottleWine}
          label="סוגי אלכוהול"
          value={stats.bottleTypes}
        />

        <StatCard
          icon={Wine}
          label="סה״כ בקבוקים"
          value={stats.total}
        />

        <StatCard
          icon={MapPin}
          label="הוקצו"
          value={stats.allocated}
        />

        <StatCard
          icon={GlassWater}
          label="נפתחו בפועל"
          value={stats.opened}
        />

        <StatCard
          icon={BarChart3}
          label="נותרו סה״כ"
          value={stats.remaining}
        />
      </div>

      {/* MODES */}
      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-4
          mb-10
        "
      >
        {MODES.map((m) => (
          <ModeButton
            key={m.key}
            mode={m}
            active={mode === m.key}
            onClick={() => setMode(m.key)}
          />
        ))}
      </div>

      {/* PLANNING */}
      {mode === "planning" && (
        <section className="space-y-5">
          <SectionHeader
            icon={ClipboardList}
            title="תכנון מלאי אלכוהול"
            description="הגדירי קטגוריה, מותג, טעם וכמות. כל שינוי נשמר אוטומטית בשרת."
            action={
              <button
                onClick={addBottle}
                disabled={savingId === "new"}
                className="
                  rounded-2xl
                  bg-gradient-to-r
                  from-violet-600
                  to-purple-500
                  text-white
                  font-black
                  px-5
                  py-4
                  text-sm
                  disabled:opacity-50
                  inline-flex
                  items-center
                  gap-2
                "
              >
                <PackagePlus size={17} />
                הוסף סוג אלכוהול
              </button>
            }
          />

          {bottles.length === 0 ? (
            <EmptyState
              title="עדיין אין אלכוהול במלאי"
              text="לחצי על הוספת סוג אלכוהול כדי להתחיל לבנות את המלאי לאירוע."
            />
          ) : (
            <div className="space-y-4">
              {bottles.map((bottle, index) => (
                <Card key={bottle._id || index}>
                  <div
                    className="
                      grid
                      grid-cols-1
                      md:grid-cols-2
                      xl:grid-cols-[1fr_1fr_1fr_160px_90px]
                      gap-4
                      items-end
                    "
                  >
                    <SelectInput
                      label="קטגוריה"
                      value={bottle.category || ""}
                      options={CATEGORY_OPTIONS}
                      onChange={(v) =>
                        updateBottleField(index, "category", v)
                      }
                    />

                    <Input
                      label="מותג"
                      value={bottle.brand || ""}
                      placeholder="לדוגמה: Grey Goose"
                      onChange={(v) =>
                        updateBottleField(index, "brand", v)
                      }
                    />

                    <Input
                      label="טעם / הערה"
                      value={bottle.flavor || ""}
                      placeholder="רגיל / לימון / רזרבה"
                      onChange={(v) =>
                        updateBottleField(index, "flavor", v)
                      }
                    />

                    <NumberInput
                      label="סה״כ בקבוקים"
                      value={safeNumber(bottle.total)}
                      min={0}
                      onChange={(v) =>
                        updateBottleField(
                          index,
                          "total",
                          safeNumber(v)
                        )
                      }
                    />

                    <button
                      onClick={() => removeBottle(bottle._id)}
                      disabled={savingId === bottle._id}
                      className="
                        h-[50px]
                        rounded-2xl
                        border
                        border-red-100
                        bg-red-50
                        text-red-500
                        font-black
                        flex
                        items-center
                        justify-center
                        gap-2
                        disabled:opacity-50
                      "
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div
                    className="
                      mt-4
                      grid
                      grid-cols-1
                      md:grid-cols-3
                      gap-3
                    "
                  >
                    <MiniInfo
                      label="הוקצו"
                      value={`${totalAllocated(bottle)} / ${safeNumber(bottle.total)}`}
                    />

                    <MiniInfo
                      label="נפתחו"
                      value={totalOpened(bottle)}
                    />

                    <MiniInfo
                      label="נותרו ללא הקצאה"
                      value={remainingUnallocated(bottle)}
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ALLOCATION */}
      {mode === "allocation" && (
        <section className="space-y-5">
          <SectionHeader
            icon={MapPin}
            title="הקצאות אלכוהול"
            description="חלקי כל סוג אלכוהול לפי מיקום: בר ראשי, בר רחבה, VIP, שולחנות או רזרבה."
          />

          {bottles.length === 0 ? (
            <EmptyState
              title="אין עדיין מלאי להקצאה"
              text="קודם הוסיפי סוגי אלכוהול במסך תכנון מלאי."
            />
          ) : (
            <div className="space-y-5">
              {bottles.map((bottle) => (
                <Card key={bottle._id}>
                  <div
                    className="
                      flex
                      flex-col
                      lg:flex-row
                      lg:items-center
                      justify-between
                      gap-4
                      mb-5
                    "
                  >
                    <div>
                      <h3
                        className="
                          text-xl
                          font-black
                          text-[#1E1B2E]
                        "
                      >
                        {bottleLabel(bottle) || "ללא שם"}
                      </h3>

                      <p className="text-sm text-gray-400 mt-1">
                        סה״כ {safeNumber(bottle.total)} · הוקצו {totalAllocated(bottle)} · נותרו להקצאה {remainingUnallocated(bottle)}
                      </p>
                    </div>

                    <AllocationProgress
                      opened={totalAllocated(bottle)}
                      total={safeNumber(bottle.total)}
                      label="התקדמות הקצאה"
                    />
                  </div>

                  <div className="space-y-3 mb-5">
                    {(bottle.allocations || []).length === 0 ? (
                      <div
                        className="
                          rounded-2xl
                          border
                          border-dashed
                          border-[#E8DDD3]
                          bg-[#FCFBFA]
                          p-5
                          text-center
                          text-sm
                          text-gray-400
                          font-bold
                        "
                      >
                        אין עדיין הקצאות לסוג הזה.
                      </div>
                    ) : (
                      (bottle.allocations || []).map((allocation, index) => (
                        <div
                          key={`${allocation.location}-${index}`}
                          className="
                            flex
                            flex-col
                            md:flex-row
                            md:items-center
                            justify-between
                            gap-3
                            rounded-2xl
                            border
                            border-[#F0ECE7]
                            bg-[#FCFBFA]
                            px-4
                            py-4
                          "
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="
                                h-10
                                w-10
                                rounded-2xl
                                bg-white
                                border
                                border-[#E8DDD3]
                                flex
                                items-center
                                justify-center
                                text-[#7A4A35]
                              "
                            >
                              <MapPin size={16} />
                            </div>

                            <div>
                              <div className="font-black text-[#1E1B2E]">
                                {allocation.location}
                              </div>

                              <div className="text-xs text-gray-400">
                                נפתחו {safeNumber(allocation.opened)} מתוך {safeNumber(allocation.qty)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <NumberInput
                              label="כמות"
                              value={safeNumber(allocation.qty)}
                              min={safeNumber(allocation.opened)}
                              onChange={(v) =>
                                updateAllocationQty(
                                  bottle,
                                  index,
                                  safeNumber(v)
                                )
                              }
                            />

                            <button
                              onClick={() =>
                                removeAllocation(bottle, index)
                              }
                              className="
                                h-[50px]
                                w-[50px]
                                rounded-2xl
                                border
                                border-red-100
                                bg-red-50
                                text-red-500
                                flex
                                items-center
                                justify-center
                              "
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <AllocationAdder
                    max={remainingUnallocated(bottle)}
                    quickLocations={QUICK_LOCATIONS}
                    onAdd={(location, qty) =>
                      addAllocation(bottle, location, qty)
                    }
                  />
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* LIVE */}
      {mode === "live" && (
        <section
          className="
            grid
            grid-cols-1
            xl:grid-cols-[1fr_390px]
            gap-8
            items-start
          "
        >
          <div className="space-y-5">
            <SectionHeader
              icon={GlassWater}
              title="ניהול אלכוהול בלייב"
              description="כאן מנהלים פתיחת בקבוקים בזמן אמת. כל פעולה נכנסת ללוג."
            />

            {bottles.length === 0 ? (
              <EmptyState
                title="אין מלאי לניהול לייב"
                text="קודם הוסיפי מלאי והקצאות."
              />
            ) : (
              bottles.map((bottle) => (
                <Card key={bottle._id}>
                  <div
                    className="
                      flex
                      flex-col
                      lg:flex-row
                      lg:items-center
                      justify-between
                      gap-4
                      mb-5
                    "
                  >
                    <div>
                      <h3 className="text-xl font-black text-[#1E1B2E]">
                        {bottleLabel(bottle) || "ללא שם"}
                      </h3>

                      <p className="text-sm text-gray-400 mt-1">
                        נפתחו {totalOpened(bottle)} מתוך {totalAllocated(bottle)} שהוקצו
                      </p>
                    </div>

                    <AllocationProgress
                      opened={totalOpened(bottle)}
                      total={totalAllocated(bottle)}
                      label="נפתח בפועל"
                    />
                  </div>

                  <div className="space-y-3">
                    {(bottle.allocations || []).length === 0 ? (
                      <div
                        className="
                          rounded-2xl
                          border
                          border-dashed
                          border-[#E8DDD3]
                          bg-[#FCFBFA]
                          p-5
                          text-center
                          text-sm
                          text-gray-400
                          font-bold
                        "
                      >
                        לא הוגדרו הקצאות לסוג הזה.
                      </div>
                    ) : (
                      (bottle.allocations || []).map((allocation, index) => (
                        <LiveAllocationRow
                          key={`${allocation.location}-${index}`}
                          allocation={allocation}
                          onOpen={() => openBottle(bottle, index)}
                          onClose={() => closeBottle(bottle, index)}
                        />
                      ))
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>

          <ActivityLogPanel
            logs={logs}
            onClear={clearLocalLogs}
            onExport={exportLogs}
          />
        </section>
      )}
    </div>
  );
}

/* ======================================================
   UI COMPONENTS
====================================================== */

function ModeButton({ mode, active, onClick }) {
  const Icon = mode.icon;

  return (
    <button
      onClick={onClick}
      className={`
        group
        rounded-[30px]
        border
        p-5
        text-right
        transition
        ${
          active
            ? "bg-[#1E1B2E] text-white border-[#1E1B2E] shadow-lg"
            : "bg-white text-[#1E1B2E] border-[#ECE5DE] hover:border-[#CDBBAA]"
        }
      `}
    >
      <div className="flex items-center justify-between gap-4">
        <div
          className={`
            h-12
            w-12
            rounded-2xl
            flex
            items-center
            justify-center
            shrink-0
            ${
              active
                ? "bg-white/15 text-white"
                : "bg-[#F5E7DC] text-[#7A4A35]"
            }
          `}
        >
          <Icon size={20} />
        </div>

        <ChevronRight
          size={18}
          className={active ? "text-white/70" : "text-gray-300"}
        />
      </div>

      <div className="mt-4 font-black text-lg">
        {mode.label}
      </div>

      <div
        className={`
          mt-1
          text-sm
          ${
            active
              ? "text-white/70"
              : "text-gray-400"
          }
        `}
      >
        {mode.description}
      </div>
    </button>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div
      className="
        rounded-[28px]
        border
        border-[#ECE5DE]
        bg-white
        p-5
        shadow-sm
      "
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className="
            h-11
            w-11
            rounded-2xl
            bg-[#F5E7DC]
            text-[#7A4A35]
            flex
            items-center
            justify-center
          "
        >
          <Icon size={18} />
        </div>

        <div className="text-3xl font-black text-[#1E1B2E]">
          {value}
        </div>
      </div>

      <div className="text-sm text-gray-400 font-bold mt-4">
        {label}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description, action }) {
  return (
    <div
      className="
        flex
        flex-col
        md:flex-row
        md:items-center
        justify-between
        gap-4
        rounded-[34px]
        border
        border-[#ECE5DE]
        bg-white
        p-6
      "
    >
      <div className="flex items-center gap-4">
        <div
          className="
            h-14
            w-14
            rounded-3xl
            bg-[#F5E7DC]
            text-[#7A4A35]
            flex
            items-center
            justify-center
            shrink-0
          "
        >
          <Icon size={22} />
        </div>

        <div>
          <h2 className="text-2xl xl:text-3xl font-black text-[#1E1B2E]">
            {title}
          </h2>

          <p className="text-gray-400 text-sm mt-1">
            {description}
          </p>
        </div>
      </div>

      {action}
    </div>
  );
}

function Card({ children }) {
  return (
    <div
      className="
        rounded-[30px]
        border
        border-[#ECE5DE]
        bg-white
        p-5
        xl:p-6
        shadow-sm
      "
    >
      {children}
    </div>
  );
}

function Input({ label, value, placeholder, onChange }) {
  return (
    <label className="block">
      <div className="text-xs font-black text-gray-400 mb-2">
        {label}
      </div>

      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full
          rounded-2xl
          border
          border-[#E7E2DD]
          bg-[#FCFBFA]
          px-4
          py-4
          outline-none
          text-sm
          font-bold
          text-[#1E1B2E]
          focus:border-[#B99C82]
        "
      />
    </label>
  );
}

function SelectInput({ label, value, options, onChange }) {
  return (
    <label className="block">
      <div className="text-xs font-black text-gray-400 mb-2">
        {label}
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full
          rounded-2xl
          border
          border-[#E7E2DD]
          bg-[#FCFBFA]
          px-4
          py-4
          outline-none
          text-sm
          font-bold
          text-[#1E1B2E]
          focus:border-[#B99C82]
        "
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberInput({ label, value, min = 0, onChange }) {
  return (
    <label className="block">
      <div className="text-xs font-black text-gray-400 mb-2">
        {label}
      </div>

      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="
          w-full
          rounded-2xl
          border
          border-[#E7E2DD]
          bg-[#FCFBFA]
          px-4
          py-4
          outline-none
          text-sm
          font-bold
          text-[#1E1B2E]
          focus:border-[#B99C82]
        "
      />
    </label>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div
      className="
        rounded-2xl
        bg-[#FCFBFA]
        border
        border-[#F0ECE7]
        px-4
        py-3
      "
    >
      <div className="text-xs text-gray-400 font-black">
        {label}
      </div>

      <div className="text-lg font-black text-[#1E1B2E] mt-1">
        {value}
      </div>
    </div>
  );
}

function AllocationProgress({ opened, total, label }) {
  const progress = total
    ? Math.min(100, Math.round((opened / total) * 100))
    : 0;

  return (
    <div className="min-w-[220px]">
      <div className="flex items-center justify-between text-xs font-black text-gray-400 mb-2">
        <span>{label}</span>
        <span>{progress}%</span>
      </div>

      <div className="h-3 rounded-full bg-[#F5E7DC] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#1E1B2E]"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>
    </div>
  );
}

function AllocationAdder({ max, quickLocations, onAdd }) {
  const [location, setLocation] = useState("");
  const [qty, setQty] = useState(1);

  function submit() {
    onAdd(location, qty);
    setLocation("");
    setQty(1);
  }

  return (
    <div
      className="
        rounded-[26px]
        border
        border-[#F0ECE7]
        bg-[#FCFBFA]
        p-4
      "
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {quickLocations.map((loc) => (
          <button
            key={loc}
            onClick={() => setLocation(loc)}
            className={`
              rounded-full
              px-4
              py-2
              text-xs
              font-black
              border
              ${
                location === loc
                  ? "bg-[#1E1B2E] text-white border-[#1E1B2E]"
                  : "bg-white text-[#7A4A35] border-[#E8DDD3]"
              }
            `}
          >
            {loc}
          </button>
        ))}
      </div>

      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-[1fr_140px_130px]
          gap-3
          items-end
        "
      >
        <Input
          label="מיקום"
          value={location}
          placeholder="לדוגמה: בר ראשי"
          onChange={setLocation}
        />

        <NumberInput
          label={`כמות (נותר ${max})`}
          value={qty}
          min={1}
          onChange={setQty}
        />

        <button
          disabled={!location || qty <= 0 || qty > max}
          onClick={submit}
          className="
            h-[50px]
            rounded-2xl
            bg-[#1E1B2E]
            text-white
            font-black
            disabled:bg-gray-300
            inline-flex
            items-center
            justify-center
            gap-2
          "
        >
          <Plus size={16} />
          הוסף
        </button>
      </div>
    </div>
  );
}

function LiveAllocationRow({ allocation, onOpen, onClose }) {
  const qty = Number(allocation.qty) || 0;
  const opened = Number(allocation.opened) || 0;
  const remaining = Math.max(qty - opened, 0);
  const progress = qty
    ? Math.min(100, Math.round((opened / qty) * 100))
    : 0;

  return (
    <div
      className="
        rounded-[26px]
        border
        border-[#F0ECE7]
        bg-[#FCFBFA]
        p-4
      "
    >
      <div
        className="
          flex
          flex-col
          md:flex-row
          md:items-center
          justify-between
          gap-4
        "
      >
        <div className="flex items-center gap-3">
          <div
            className="
              h-12
              w-12
              rounded-2xl
              bg-white
              border
              border-[#E8DDD3]
              text-[#7A4A35]
              flex
              items-center
              justify-center
            "
          >
            <MapPin size={17} />
          </div>

          <div>
            <div className="font-black text-[#1E1B2E]">
              {allocation.location}
            </div>

            <div className="text-xs text-gray-400 mt-1">
              הוקצו {qty} · נפתחו {opened} · נותרו {remaining}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            disabled={opened <= 0}
            className="
              h-11
              w-11
              rounded-2xl
              border
              border-[#E8DDD3]
              bg-white
              text-[#1E1B2E]
              flex
              items-center
              justify-center
              disabled:opacity-40
            "
          >
            <Minus size={16} />
          </button>

          <button
            onClick={onOpen}
            disabled={opened >= qty}
            className="
              h-11
              rounded-2xl
              bg-[#1E1B2E]
              text-white
              font-black
              px-5
              flex
              items-center
              justify-center
              gap-2
              disabled:bg-gray-300
            "
          >
            <Plus size={16} />
            פתח בקבוק
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-3 rounded-full bg-[#F5E7DC] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#1E1B2E]"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ActivityLogPanel({ logs, onClear, onExport }) {
  return (
    <aside
      className="
        rounded-[34px]
        border
        border-[#ECE5DE]
        bg-white
        p-5
        xl:p-6
        sticky
        top-6
      "
    >
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div
            className="
              h-12
              w-12
              rounded-2xl
              bg-[#F5E7DC]
              text-[#7A4A35]
              flex
              items-center
              justify-center
            "
          >
            <History size={18} />
          </div>

          <div>
            <h3 className="text-xl font-black text-[#1E1B2E]">
              לוג פעולות
            </h3>

            <p className="text-xs text-gray-400">
              נשמר קבוע ומוצג בכל כניסה
            </p>
          </div>
        </div>

        <CheckCircle2 size={20} className="text-green-500" />
      </div>

      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={onExport}
          disabled={logs.length === 0}
          className="
            flex-1
            rounded-2xl
            border
            border-[#E8DDD3]
            bg-[#FCFBFA]
            px-3
            py-3
            text-xs
            font-black
            text-[#1E1B2E]
            disabled:opacity-40
            inline-flex
            items-center
            justify-center
            gap-2
          "
        >
          <Download size={14} />
          ייצוא
        </button>

        <button
          onClick={onClear}
          disabled={logs.length === 0}
          className="
            flex-1
            rounded-2xl
            border
            border-red-100
            bg-red-50
            px-3
            py-3
            text-xs
            font-black
            text-red-500
            disabled:opacity-40
            inline-flex
            items-center
            justify-center
            gap-2
          "
        >
          <RefreshCcw size={14} />
          ניקוי
        </button>
      </div>

      <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div
            className="
              rounded-2xl
              border
              border-dashed
              border-[#E8DDD3]
              bg-[#FCFBFA]
              p-5
              text-center
              text-sm
              text-gray-400
              font-bold
            "
          >
            עדיין אין פעולות בלייב.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log._id}
              className="
                rounded-2xl
                border
                border-[#F0ECE7]
                bg-[#FCFBFA]
                p-4
              "
            >
              <div className="flex items-center gap-2 text-xs text-gray-400 font-bold mb-2">
                <Clock3 size={13} />
                <span>{log.date}</span>
                <span>{log.time}</span>
              </div>

              <div className="text-sm font-bold text-[#1E1B2E] leading-6">
                {log.text}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function EmptyState({ title, text }) {
  return (
    <div
      className="
        rounded-[34px]
        border
        border-dashed
        border-[#E8DDD3]
        bg-white
        p-12
        text-center
      "
    >
      <div
        className="
          h-16
          w-16
          rounded-3xl
          bg-[#F5E7DC]
          text-[#7A4A35]
          flex
          items-center
          justify-center
          mx-auto
          mb-5
        "
      >
        <CalendarClock size={24} />
      </div>

      <h3 className="text-2xl font-black text-[#1E1B2E]">
        {title}
      </h3>

      <p className="text-gray-400 mt-2">
        {text}
      </p>
    </div>
  );
}
