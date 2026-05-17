"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const TASK_STATUS = {
  OPEN: "open",
  WAITING: "waiting",
  DONE: "done",
};

const STATUS_LABEL = {
  open: "פתוחה",
  waiting: "בהמתנה",
  done: "בוצעה",
};

const STATUS_STYLE = {
  open: "bg-red-50 text-red-600",
  waiting: "bg-amber-50 text-amber-700",
  done: "bg-green-50 text-green-700",
};

/* ============================================================
   כמות מוזמנים משוערת — ידני בלבד
   לא מושכים משום מקום אחר.
   רק מהשדות שנשמרו על Event.
============================================================ */
function getEstimatedGuestsFromData(event) {
  const value = event?.estimatedGuests ?? event?.estimatedGuestCount ?? null;

  if (value === null || value === undefined || value === "") return null;

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) return null;

  return numberValue;
}

export default function OverviewTab({ eventId, invitation }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");

  const [readAlerts, setReadAlerts] = useState([]);
  const [hiddenAlerts, setHiddenAlerts] = useState([]);

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(0);
  const [savingBudget, setSavingBudget] = useState(false);
  const [budget, setBudget] = useState(null);

  const [estimatedGuestsDraft, setEstimatedGuestsDraft] = useState("");
  const [savingEstimatedGuests, setSavingEstimatedGuests] = useState(false);
  const [savedEstimatedGuests, setSavedEstimatedGuests] = useState(false);

  const estimatedGuestsTimerRef = useRef(null);

  const [giftsSummary, setGiftsSummary] = useState({
    totalGifts: 0,
    totalRows: 0,
    rowsWithGift: 0,
    rowsWithoutGift: 0,
  });

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      setError("NO_EVENT_ID");
      return;
    }

    const savedRead = localStorage.getItem(`readAlerts-${eventId}`);
    const savedHidden = localStorage.getItem(`hiddenAlerts-${eventId}`);

    setReadAlerts(savedRead ? JSON.parse(savedRead) : []);
    setHiddenAlerts(savedHidden ? JSON.parse(savedHidden) : []);

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/events/${eventId}/overview`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data?.error || "LOAD_FAILED");
          return;
        }

        setEvent(data.event);
        setTasks(data.tasks || []);
        setBudget(data.budget);

        setBudgetDraft((prev) => {
          if (prev && prev > 0) return prev;
          return data.event?.budgetTotal ?? 0;
        });

        const savedEstimatedGuests = getEstimatedGuestsFromData(data.event);
        setEstimatedGuestsDraft(
          savedEstimatedGuests ? String(savedEstimatedGuests) : ""
        );

        try {
          const giftsRes = await fetch(`/api/event-gifts?eventId=${eventId}`, {
            cache: "no-store",
          });

          const giftsData = await giftsRes.json();

          if (giftsRes.ok && giftsData?.success) {
            setGiftsSummary({
              totalGifts: Number(giftsData.summary?.totalGifts || 0),
              totalRows: Number(giftsData.summary?.totalRows || 0),
              rowsWithGift: Number(giftsData.summary?.rowsWithGift || 0),
              rowsWithoutGift: Number(giftsData.summary?.rowsWithoutGift || 0),
            });
          }
        } catch (giftError) {
          console.error("Gifts summary load error:", giftError);
        }
      } catch (e) {
        setError("NETWORK_ERROR");
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => {
      if (estimatedGuestsTimerRef.current) {
        clearTimeout(estimatedGuestsTimerRef.current);
      }
    };
  }, [eventId]);

  const budgetTotal = budget?.total ?? event?.budgetTotal ?? 0;
  const commitments = budget?.commitments ?? 0;
  const paid = budget?.paid ?? 0;
  const available = budget?.available ?? budgetTotal;

  const estimatedGuests = getEstimatedGuestsFromData(event);

  const averageCostPerGuest =
    commitments > 0 && estimatedGuests > 0
      ? Math.round(commitments / estimatedGuests)
      : null;

  const totalGifts = giftsSummary.totalGifts || 0;
  const hasGiftAmounts = totalGifts > 0;

  const incomeMinusExpenses = hasGiftAmounts ? totalGifts - commitments : null;

  const progress = budgetTotal
    ? Math.min(Math.round((commitments / budgetTotal) * 100), 100)
    : 0;

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== TASK_STATUS.DONE).length,
    [tasks]
  );

  const daysLeft = useMemo(() => {
    if (!event?.date) return null;

    const today = new Date();
    const eventDate = new Date(event.date);

    if (Number.isNaN(eventDate.getTime())) return null;

    return Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
  }, [event]);

  const smartAlerts = useMemo(() => {
    const alerts = [];
    const today = new Date();

    if (progress >= 90) {
      alerts.push({
        id: "budget-danger",
        type: "danger",
        icon: "!",
        title: "התקציב כמעט נוצל",
        description: `נוצלו ${progress}% מהתקציב`,
        action: "לצפייה בתקציב",
      });
    }

    if (available <= 5000) {
      alerts.push({
        id: "low-budget",
        type: "warning",
        icon: "₪",
        title: "יתרה נמוכה",
        description: `נותרו ₪${available.toLocaleString()} בלבד`,
        action: "לבדיקת תקציב",
      });
    }

    if (commitments > 0 && !estimatedGuests) {
      alerts.push({
        id: "missing-estimated-guests",
        type: "info",
        icon: "👥",
        title: "חסרה כמות מוזמנים משוערת",
        description: "כדי לחשב עלות ממוצעת לאורח, יש להזין כמות מוזמנים.",
        action: "עדכן כמות",
      });
    }

    if (
      commitments > 0 &&
      estimatedGuests > 0 &&
      averageCostPerGuest >= 400
    ) {
      alerts.push({
        id: "high-average-cost",
        type: "warning",
        icon: "₪",
        title: "עלות ממוצעת גבוהה לאורח",
        description: `עלות ממוצעת לאורח כרגע: ₪${averageCostPerGuest.toLocaleString()}`,
        action: "בדיקת תקציב",
      });
    }

    if (hasGiftAmounts && incomeMinusExpenses < 0) {
      alerts.push({
        id: "negative-after-gifts",
        type: "warning",
        icon: "🎁",
        title: "המתנות עדיין לא מכסות את ההוצאות",
        description: `פער נוכחי: ₪${Math.abs(
          incomeMinusExpenses
        ).toLocaleString()}`,
        action: "בדיקת מאזן",
      });
    }

    if (hasGiftAmounts && incomeMinusExpenses >= 0) {
      alerts.push({
        id: "positive-after-gifts",
        type: "info",
        icon: "🎁",
        title: "המתנות מכסות את ההוצאות",
        description: `עודף נוכחי: ₪${incomeMinusExpenses.toLocaleString()}`,
        action: "קראתי",
      });
    }

    const overdueTasks = tasks.filter((task) => {
      if (!task.dueDate) return false;

      return task.status !== TASK_STATUS.DONE && new Date(task.dueDate) < today;
    });

    if (overdueTasks.length > 0) {
      alerts.push({
        id: "overdue-tasks",
        type: "danger",
        icon: "!",
        title: "יש משימות באיחור",
        description: `${overdueTasks.length} משימות עברו את התאריך`,
        action: "טפל עכשיו",
      });
    }

    if (activeTasks >= 10) {
      alerts.push({
        id: "many-tasks",
        type: "warning",
        icon: "✓",
        title: "יש הרבה משימות פתוחות",
        description: `${activeTasks} משימות עדיין פעילות`,
        action: "לצפייה במשימות",
      });
    }

    if (daysLeft !== null && daysLeft >= 0 && daysLeft <= 30) {
      alerts.push({
        id: "event-close",
        type: "info",
        icon: "⏱",
        title: "האירוע מתקרב",
        description: `נותרו ${daysLeft} ימים לאירוע`,
        action: "קראתי",
      });
    }

    if (daysLeft !== null && daysLeft <= 14 && activeTasks > 0) {
      alerts.push({
        id: "urgent-tasks",
        type: "danger",
        icon: "!",
        title: "נותרו משימות לפני האירוע",
        description: `${activeTasks} משימות עדיין פתוחות`,
        action: "טפל עכשיו",
      });
    }

    return alerts;
  }, [
    progress,
    available,
    activeTasks,
    tasks,
    daysLeft,
    hasGiftAmounts,
    incomeMinusExpenses,
    commitments,
    estimatedGuests,
    averageCostPerGuest,
  ]);

  const visibleAlerts = smartAlerts.filter(
    (alert) => !hiddenAlerts.includes(alert.id)
  );

  function markAlertAsRead(alertId) {
    const next = Array.from(new Set([...readAlerts, alertId]));
    setReadAlerts(next);
    localStorage.setItem(`readAlerts-${eventId}`, JSON.stringify(next));
  }

  function hideAlert(alertId) {
    const next = Array.from(new Set([...hiddenAlerts, alertId]));
    setHiddenAlerts(next);
    localStorage.setItem(`hiddenAlerts-${eventId}`, JSON.stringify(next));
  }

  async function addTask() {
    if (!newTitle.trim()) return;

    setError("");

    try {
      const res = await fetch(`/api/events/${eventId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          dueDate: newDate || "",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data?.error || "FAILED_TO_ADD_TASK");
        return;
      }

      setTasks((prev) => [...prev, data.task]);
      setNewTitle("");
      setNewDate("");
    } catch (e) {
      setError("NETWORK_ERROR");
    }
  }

  async function updateTask(taskId, field, value) {
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, [field]: value } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error("PATCH_FAILED");
      }

      if (data.task) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? data.task : t))
        );
      }
    } catch (e) {
      setError("FAILED_TO_UPDATE_TASK");
    }
  }

  async function saveBudget() {
    if (!isEditingBudget) return;

    const nextBudget = Number(budgetDraft);

    if (
      Number.isNaN(nextBudget) ||
      nextBudget <= 0 ||
      nextBudget === event?.budgetTotal
    ) {
      setIsEditingBudget(false);
      setBudgetDraft(event?.budgetTotal || 0);
      return;
    }

    setSavingBudget(true);
    setError("");

    try {
      const res = await fetch(`/api/events/${eventId}/overview`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetTotal: nextBudget,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error("SAVE_BUDGET_FAILED");
      }

      const nextEvent = data.event || {
        ...event,
        budgetTotal: nextBudget,
      };

      setEvent(nextEvent);

      setBudget((prev) => ({
        ...prev,
        total: nextBudget,
        available: Math.max(nextBudget - (prev?.commitments || 0), 0),
      }));

      setBudgetDraft(nextBudget);
    } catch (e) {
      setError("שגיאה בשמירת התקציב");
    } finally {
      setSavingBudget(false);
      setIsEditingBudget(false);
    }
  }

  async function saveEstimatedGuestsNow(nextValue) {
    const nextEstimatedGuests =
      nextValue === "" || nextValue === null || nextValue === undefined
        ? null
        : Number(nextValue);

    if (
      nextEstimatedGuests !== null &&
      (!Number.isFinite(nextEstimatedGuests) || nextEstimatedGuests < 0)
    ) {
      setError("כמות מוזמנים לא תקינה");
      return;
    }

    const currentValue = getEstimatedGuestsFromData(event);

    if (
      (nextEstimatedGuests === null && currentValue === null) ||
      nextEstimatedGuests === currentValue
    ) {
      return;
    }

    setSavingEstimatedGuests(true);
    setSavedEstimatedGuests(false);
    setError("");

    try {
      const res = await fetch(`/api/events/${eventId}/overview`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimatedGuests: nextEstimatedGuests,
          estimatedGuestCount: nextEstimatedGuests,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error("SAVE_ESTIMATED_GUESTS_FAILED");
      }

      const nextEvent = data.event || {
        ...event,
        estimatedGuests: nextEstimatedGuests,
        estimatedGuestCount: nextEstimatedGuests,
      };

      setEvent((prev) => ({
        ...(prev || {}),
        ...nextEvent,
        estimatedGuests:
          nextEvent.estimatedGuests ??
          nextEvent.estimatedGuestCount ??
          nextEstimatedGuests,
        estimatedGuestCount:
          nextEvent.estimatedGuestCount ??
          nextEvent.estimatedGuests ??
          nextEstimatedGuests,
      }));

      setSavedEstimatedGuests(true);

      setTimeout(() => {
        setSavedEstimatedGuests(false);
      }, 1500);
    } catch (e) {
      setError("שגיאה בשמירת כמות מוזמנים");
    } finally {
      setSavingEstimatedGuests(false);
    }
  }

  function scheduleEstimatedGuestsSave(nextValue) {
    if (estimatedGuestsTimerRef.current) {
      clearTimeout(estimatedGuestsTimerRef.current);
    }

    estimatedGuestsTimerRef.current = setTimeout(() => {
      saveEstimatedGuestsNow(nextValue);
    }, 650);
  }

  function handleEstimatedGuestsChange(value) {
    setEstimatedGuestsDraft(value);

    const optimisticValue =
      value === "" || value === null || value === undefined
        ? null
        : Number(value);

    setEvent((prev) => ({
      ...(prev || {}),
      estimatedGuests:
        optimisticValue !== null && Number.isFinite(optimisticValue)
          ? optimisticValue
          : null,
      estimatedGuestCount:
        optimisticValue !== null && Number.isFinite(optimisticValue)
          ? optimisticValue
          : null,
    }));

    scheduleEstimatedGuestsSave(value);
  }

  function flushEstimatedGuestsSave() {
    if (estimatedGuestsTimerRef.current) {
      clearTimeout(estimatedGuestsTimerRef.current);
    }

    saveEstimatedGuestsNow(estimatedGuestsDraft);
  }

  if (loading) return <div className="p-10">טוען…</div>;

  if (!event) {
    return (
      <div className="p-10 text-red-600">
        {error === "NO_EVENT_ID"
          ? "לא התקבל מזהה אירוע"
          : "שגיאה בטעינת האירוע"}
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-7"
      style={{
        background:
          "radial-gradient(circle at top right, #F3E8FF 0, transparent 28%), linear-gradient(to bottom, #FFF7F0, #F7F2EC)",
      }}
    >
      {/* HERO */}
      <section
        className="
          relative
          overflow-hidden
          rounded-[40px]
          border
          border-white/60
          backdrop-blur-2xl
          px-6
          md:px-8
          py-7
        "
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.94), rgba(245,236,255,0.88))",
          boxShadow: "0 30px 80px rgba(124,58,237,0.10)",
        }}
      >
        <div
          className="
            absolute
            -top-20
            left-0
            h-[320px]
            w-[320px]
            rounded-full
            blur-3xl
          "
          style={{
            background:
              "radial-gradient(circle, rgba(168,85,247,0.18), transparent 70%)",
          }}
        />

        <div
          className="
            relative
            flex
            flex-col
            md:flex-row
            items-center
            justify-between
            gap-6
          "
        >
          <div className="flex items-center gap-4">
            <div
              className="
                hidden
                md:flex
                h-16
                w-16
                rounded-[24px]
                bg-gradient-to-br
                from-violet-500
                to-purple-400
                items-center
                justify-center
                text-white
                text-3xl
                shadow-[0_15px_40px_rgba(124,58,237,0.30)]
              "
            >
              ✦
            </div>

            <div className="text-center md:text-right">
              <h1
                className="
                  text-3xl
                  md:text-4xl
                  font-black
                  text-[#1E1B2E]
                  tracking-tight
                "
              >
                {event.title}
              </h1>

              <p
                className="
                  mt-2
                  text-base
                  md:text-lg
                  text-gray-500
                  font-medium
                "
              >
                {new Date(event.date).toLocaleDateString("he-IL", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>

              {daysLeft !== null && daysLeft >= 0 && (
                <div
                  className="
                    inline-flex
                    items-center
                    gap-2
                    mt-4
                    px-4
                    py-2
                    rounded-full
                    bg-white/80
                    border
                    border-purple-100
                    shadow-sm
                  "
                >
                  <span className="text-purple-500">⏳</span>

                  <span className="text-sm font-medium text-[#4B4453]">
                    נותרו {daysLeft} ימים לאירוע
                  </span>
                </div>
              )}
            </div>
          </div>

          {invitation && (
            <button
              onClick={() => router.push(`/dashboard?eventId=${eventId}`)}
              className="
                rounded-2xl
                bg-white/90
                border
                border-white/60
                px-5
                py-3
                text-sm
                font-semibold
                text-[#28212E]
                shadow-[0_10px_30px_rgba(124,58,237,0.08)]
                hover:-translate-y-1
                hover:shadow-[0_15px_40px_rgba(124,58,237,0.14)]
                transition-all
                duration-300
              "
            >
              👤 ניהול דשבורד לקוח
            </button>
          )}
        </div>
      </section>

      {/* ALERTS */}
      <section className="rounded-[30px] border border-white/60 bg-white/65 shadow-[0_16px_50px_rgba(81,55,120,0.08)] backdrop-blur-xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#28212E]">
            ✨ התראות חכמות
          </h2>

          <span className="text-xs rounded-full bg-purple-50 text-purple-700 px-3 py-1">
            {visibleAlerts.length} פעילות
          </span>
        </div>

        {visibleAlerts.length === 0 ? (
          <div className="rounded-3xl bg-white/70 border border-white/60 p-6 text-center text-sm text-gray-500">
            אין התראות פתוחות כרגע. הכל נראה תקין ✨
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {visibleAlerts.map((alert) => (
              <SmartAlertCard
                key={alert.id}
                alert={alert}
                isRead={readAlerts.includes(alert.id)}
                onRead={() => markAlertAsRead(alert.id)}
                onHide={() => hideAlert(alert.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* BUDGET CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <EditableBudgetCard
          title="תקציב מתוכנן"
          value={isEditingBudget ? budgetDraft : budgetTotal}
          icon="💼"
          isEditing={isEditingBudget}
          loading={savingBudget}
          onEdit={() => {
            setBudgetDraft(budgetTotal);
            setIsEditingBudget(true);
          }}
          onCancel={() => {
            setBudgetDraft(budgetTotal);
            setIsEditingBudget(false);
          }}
          onChange={setBudgetDraft}
          onSave={saveBudget}
        />

        <AutoSaveNumberCard
          title="כמות מוזמנים משוערת"
          value={estimatedGuestsDraft}
          icon="👥"
          suffix="מוזמנים"
          emptyText="הזיני כמות מוזמנים"
          saving={savingEstimatedGuests}
          saved={savedEstimatedGuests}
          onChange={handleEstimatedGuestsChange}
          onBlur={flushEstimatedGuestsSave}
        />

        <BudgetCard
          title="עלות ממוצעת לאורח"
          value={averageCostPerGuest}
          icon="🧮"
          emptyText="העלות תופיע לאחר הזנת התחייבויות וכמות מוזמנים"
          subText={
            averageCostPerGuest
              ? `לפי ${Number(
                  estimatedGuests || 0
                ).toLocaleString()} מוזמנים וסה״כ התחייבויות ₪${Number(
                  commitments || 0
                ).toLocaleString()}`
              : ""
          }
        />

        <BudgetCard title="סה״כ התחייבויות" value={commitments} icon="🧾" />
        <BudgetCard title="שולם בפועל" value={paid} icon="💳" />
        <BudgetCard title="יתרה זמינה" value={available} icon="💎" highlight />

        <BudgetCard
          title="סך מתנות / הכנסות"
          value={hasGiftAmounts ? totalGifts : null}
          icon="🎁"
          emptyText="הסכום יופיע לאחר עדכון מתנות"
        />

        <BudgetCard
          title="הכנסות פחות הוצאות"
          value={hasGiftAmounts ? incomeMinusExpenses : null}
          icon={hasGiftAmounts && incomeMinusExpenses >= 0 ? "📈" : "📉"}
          highlight={hasGiftAmounts && incomeMinusExpenses >= 0}
          danger={hasGiftAmounts && incomeMinusExpenses < 0}
          emptyText="הסכום יופיע לאחר עדכון מתנות"
        />
      </section>

      {/* PROGRESS */}
      <section className="rounded-[26px] border border-white/60 bg-white/75 shadow-[0_14px_45px_rgba(81,55,120,0.07)] backdrop-blur-xl p-5">
        <div className="flex justify-between text-sm mb-3">
          <span className="font-semibold text-[#28212E]">ניצול התקציב</span>
          <span className="font-bold text-purple-700">{progress}%</span>
        </div>

        <div className="h-3 bg-gray-200/70 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full shadow-[0_0_18px_rgba(124,58,237,0.45)]"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #7C3AED, #A78BFA)",
            }}
          />
        </div>
      </section>

      {/* TASKS */}
      <section className="rounded-[30px] border border-white/60 bg-white/75 shadow-[0_16px_55px_rgba(81,55,120,0.08)] backdrop-blur-xl p-5 md:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#28212E]">משימות</h2>
          <span className="rounded-2xl bg-gray-100 px-3 py-2 text-sm">📋</span>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex flex-col md:flex-row gap-3">
          <button
            onClick={addTask}
            className="px-6 py-3 rounded-2xl text-sm font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.25)]"
            style={{
              background: "linear-gradient(135deg, #7C3AED, #8B5CF6)",
            }}
          >
            הוסף
          </button>

          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="border border-gray-200 bg-white/80 rounded-2xl px-4 py-3 text-sm outline-none focus:border-purple-300"
          />

          <input
            placeholder="הוסף משימה חדשה…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 border border-gray-200 bg-white/80 rounded-2xl px-4 py-3 text-sm outline-none focus:border-purple-300"
          />
        </div>

        <div className="divide-y divide-gray-100">
          {tasks.map((task) => (
            <div
              key={task._id}
              className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <select
                  value={task.status}
                  onChange={(e) =>
                    updateTask(task._id, "status", e.target.value)
                  }
                  className={`text-xs px-3 py-2 rounded-full border-0 outline-none ${STATUS_STYLE[task.status]}`}
                >
                  {Object.values(TASK_STATUS).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>

                <span
                  className={`font-medium ${
                    task.status === TASK_STATUS.DONE
                      ? "line-through text-gray-400"
                      : "text-[#28212E]"
                  }`}
                >
                  {task.title}
                </span>
              </div>

              <input
                type="date"
                value={task.dueDate || ""}
                onChange={(e) =>
                  updateTask(task._id, "dueDate", e.target.value)
                }
                className="text-sm border border-gray-200 bg-white/80 rounded-xl px-3 py-2 outline-none"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SmartAlertCard({ alert, isRead, onRead, onHide }) {
  const styles = {
    danger: {
      bg: "linear-gradient(135deg,#FFF1F2,#FFFFFF)",
      border: "#FDA4AF",
      iconBg: "#FFE4E6",
      text: "text-rose-700",
      button: "from-rose-500 to-red-500",
    },
    warning: {
      bg: "linear-gradient(135deg,#FFF7ED,#FFFFFF)",
      border: "#FDBA74",
      iconBg: "#FFEDD5",
      text: "text-orange-700",
      button: "from-orange-400 to-amber-400",
    },
    info: {
      bg: "linear-gradient(135deg,#F5F3FF,#FFFFFF)",
      border: "#C4B5FD",
      iconBg: "#EDE9FE",
      text: "text-violet-700",
      button: "from-violet-500 to-purple-500",
    },
  };

  const current = styles[alert.type] || styles.info;

  return (
    <div
      className={`relative rounded-[26px] p-5 border transition-all duration-300 hover:-translate-y-1 ${
        isRead ? "opacity-60" : ""
      }`}
      style={{
        background: current.bg,
        borderColor: current.border,
        boxShadow: "0 14px 40px rgba(81,55,120,0.08)",
      }}
    >
      <button
        onClick={onHide}
        className="absolute top-3 left-3 h-7 w-7 rounded-full bg-white/75 text-gray-400 hover:text-gray-700"
      >
        ×
      </button>

      <div className="flex items-start gap-4">
        <div
          className="h-12 w-12 rounded-2xl flex items-center justify-center font-bold"
          style={{ background: current.iconBg }}
        >
          <span className={current.text}>{alert.icon}</span>
        </div>

        <div className="flex-1">
          <h3 className={`font-bold text-sm ${current.text}`}>
            {alert.title}
          </h3>

          <p className="text-sm text-gray-600 mt-2">{alert.description}</p>

          <div className="flex gap-2 mt-4">
            <button
              onClick={onRead}
              className="rounded-xl bg-white px-4 py-2 text-xs font-semibold shadow-sm"
            >
              {isRead ? "נקרא" : "קראתי"}
            </button>

            <button
              onClick={onHide}
              className={`rounded-xl bg-gradient-to-r ${current.button} px-4 py-2 text-xs font-semibold text-white shadow-sm`}
            >
              הסתר
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetCard({
  title,
  value,
  icon,
  highlight = false,
  danger = false,
  emptyText = "",
  subText = "",
}) {
  const isEmpty = value === null || value === undefined;

  return (
    <div
      className="
        rounded-[26px]
        p-5
        border
        border-white/60
        bg-white/75
        backdrop-blur-xl
        transition-all
        duration-300
        hover:-translate-y-1
      "
      style={{
        background: danger
          ? "linear-gradient(135deg, #FFF1F2, #FFFFFF)"
          : highlight
          ? "linear-gradient(135deg, #F4ECFF, #FFFFFF)"
          : "#FFFFFFCC",
        boxShadow: "0 14px 40px rgba(81,55,120,0.08)",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-gray-500 mb-2">{title}</p>

          {isEmpty ? (
            <p className="max-w-[210px] text-sm font-semibold leading-5 text-gray-400">
              {emptyText || "אין נתונים להצגה"}
            </p>
          ) : (
            <>
              <p
                className={`text-2xl font-bold ${
                  danger ? "text-rose-700" : "text-[#28212E]"
                }`}
              >
                ₪{Number(value || 0).toLocaleString()}
              </p>

              {subText && (
                <p className="mt-1 max-w-[230px] text-xs font-medium leading-5 text-gray-400">
                  {subText}
                </p>
              )}
            </>
          )}
        </div>

        <div
          className={`h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center text-xl ${
            danger ? "bg-rose-100/80" : "bg-purple-100/80"
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function EditableBudgetCard({
  title,
  value,
  icon,
  isEditing,
  loading,
  onEdit,
  onCancel,
  onChange,
  onSave,
}) {
  return (
    <div
      className="
        rounded-[26px]
        p-5
        border
        border-purple-200/70
        bg-white/75
        backdrop-blur-xl
        transition-all
        duration-300
        hover:-translate-y-1
      "
      style={{
        background: "linear-gradient(135deg, #FFFFFF, #F8F3FF)",
        boxShadow: "0 14px 40px rgba(81,55,120,0.08)",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-2">{title}</p>

          {isEditing ? (
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full border rounded-xl px-3 py-2 text-lg"
              />

              <button
                onClick={onSave}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-white text-sm bg-purple-600 disabled:opacity-50"
              >
                {loading ? "שומר..." : "שמור"}
              </button>

              <button
                onClick={onCancel}
                className="px-3 py-2 rounded-xl text-sm border"
              >
                ביטול
              </button>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-[#28212E]">
                ₪{Number(value || 0).toLocaleString()}
              </p>

              <button
                onClick={onEdit}
                className="text-sm text-purple-600 hover:underline mt-2"
              >
                עריכה
              </button>
            </>
          )}
        </div>

        <div className="h-12 w-12 rounded-2xl bg-purple-100/80 flex items-center justify-center text-xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function AutoSaveNumberCard({
  title,
  value,
  icon,
  suffix = "",
  emptyText = "אין נתונים להצגה",
  saving = false,
  saved = false,
  onChange,
  onBlur,
}) {
  const isEmpty = value === null || value === undefined || value === "";

  return (
    <div
      className="
        rounded-[26px]
        p-5
        border
        border-purple-200/70
        bg-white/75
        backdrop-blur-xl
        transition-all
        duration-300
        hover:-translate-y-1
      "
      style={{
        background: "linear-gradient(135deg, #FFFFFF, #F8F3FF)",
        boxShadow: "0 14px 40px rgba(81,55,120,0.08)",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm text-gray-500">{title}</p>

            <span className="min-w-[54px] text-xs font-bold text-gray-400">
              {saving ? "שומר..." : saved ? "נשמר" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
              placeholder={emptyText}
              className="
                w-full
                rounded-xl
                border
                border-gray-200
                bg-white/80
                px-3
                py-2
                text-2xl
                font-bold
                text-[#28212E]
                outline-none
                transition
                placeholder:text-sm
                placeholder:font-semibold
                placeholder:text-gray-400
                focus:border-purple-300
              "
            />

            {suffix && !isEmpty ? (
              <span className="text-sm font-semibold text-gray-400">
                {suffix}
              </span>
            ) : null}
          </div>
        </div>

        <div className="h-12 w-12 rounded-2xl bg-purple-100/80 flex items-center justify-center text-xl">
          {icon}
        </div>
      </div>
    </div>
  );
}