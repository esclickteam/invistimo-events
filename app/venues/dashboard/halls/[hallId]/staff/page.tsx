"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GripVertical,
  HeartPulse,
  Loader2,
  MessageCircle,
  Plus,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Shuffle,
  UserMinus,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";

type WorkerRole =
  | "מנהל אולם"
  | "אחראי משמרת"
  | "מלצר"
  | "ברמן"
  | "מטבח"
  | "ניקיון"
  | "אבטחה";

type WorkerStatus = "available" | "working" | "sick" | "vacation" | "replacement_pending";

type Worker = {
  id: string;
  name: string;
  phone: string;
  role: WorkerRole;
  initials: string;
  status: WorkerStatus;
};

type ShiftType = "morning" | "noon" | "evening" | "night";

type Shift = {
  id: string;
  date: string;
  dayLabel: string;
  type: ShiftType;
  title: string;
  time: string;
  required: number;
  workerIds: string[];
};

type AbsenceType = "חופש" | "מחלה" | "היעדרות מיוחדת";

type AbsenceRequest = {
  id: string;
  workerId: string;
  workerName: string;
  type: AbsenceType;
  fromDate: string;
  toDate: string;
  reason: string;
  status: "pending" | "approved" | "declined";
};

const workersInitial: Worker[] = [
  {
    id: "w1",
    name: "דניאל מזרחי",
    phone: "052-1111111",
    role: "מנהל אולם",
    initials: "דמ",
    status: "working",
  },
  {
    id: "w2",
    name: "מיכל אדרי",
    phone: "052-2222222",
    role: "אחראי משמרת",
    initials: "מא",
    status: "working",
  },
  {
    id: "w3",
    name: "יונתן כהן",
    phone: "052-3333333",
    role: "מלצר",
    initials: "יכ",
    status: "working",
  },
  {
    id: "w4",
    name: "רועי לוי",
    phone: "052-4444444",
    role: "מלצר",
    initials: "רל",
    status: "replacement_pending",
  },
  {
    id: "w5",
    name: "איתי פרץ",
    phone: "052-5555555",
    role: "ברמן",
    initials: "אפ",
    status: "available",
  },
  {
    id: "w6",
    name: "שיר לוי",
    phone: "052-6666666",
    role: "מטבח",
    initials: "של",
    status: "sick",
  },
  {
    id: "w7",
    name: "נועה ביטון",
    phone: "052-7777777",
    role: "מלצר",
    initials: "נב",
    status: "available",
  },
  {
    id: "w8",
    name: "אוראל דהן",
    phone: "052-8888888",
    role: "ניקיון",
    initials: "אד",
    status: "vacation",
  },
  {
    id: "w9",
    name: "ליאור חן",
    phone: "052-9999999",
    role: "אבטחה",
    initials: "לח",
    status: "available",
  },
  {
    id: "w10",
    name: "תמר סגל",
    phone: "053-1111111",
    role: "מלצר",
    initials: "תס",
    status: "available",
  },
  {
    id: "w11",
    name: "עידן בר",
    phone: "053-2222222",
    role: "ברמן",
    initials: "עב",
    status: "available",
  },
  {
    id: "w12",
    name: "רוני מנור",
    phone: "053-3333333",
    role: "מלצר",
    initials: "רמ",
    status: "available",
  },
];

const weekDays = [
  { date: "18.05", day: "ראשון" },
  { date: "19.05", day: "שני" },
  { date: "20.05", day: "שלישי" },
  { date: "21.05", day: "רביעי" },
  { date: "22.05", day: "חמישי" },
  { date: "23.05", day: "שישי" },
  { date: "24.05", day: "שבת" },
];

const shiftTypes: Array<{
  type: ShiftType;
  title: string;
  time: string;
}> = [
  { type: "morning", title: "בוקר", time: "07:00 - 15:00" },
  { type: "noon", title: "צהריים", time: "15:00 - 18:00" },
  { type: "evening", title: "ערב", time: "18:00 - 01:00" },
  { type: "night", title: "לילה", time: "23:00 - 07:00" },
];

function createInitialShifts(): Shift[] {
  const baseWorkerMap: Record<ShiftType, string[]> = {
    morning: ["w1", "w6", "w9"],
    noon: ["w2", "w5", "w10"],
    evening: ["w1", "w2", "w3", "w4", "w5", "w7", "w10", "w11", "w12"],
    night: ["w8", "w9"],
  };

  return weekDays.flatMap((day, dayIndex) =>
    shiftTypes.map((shiftType, shiftIndex) => {
      const extra =
        dayIndex % 2 === 0 && shiftType.type === "evening"
          ? ["w6"]
          : dayIndex % 3 === 0 && shiftType.type === "morning"
            ? ["w7"]
            : [];

      return {
        id: `${day.date}-${shiftType.type}`,
        date: day.date,
        dayLabel: day.day,
        type: shiftType.type,
        title: shiftType.title,
        time: shiftType.time,
        required:
          shiftType.type === "evening"
            ? 12
            : shiftType.type === "noon"
              ? 8
              : shiftType.type === "morning"
                ? 5
                : 4,
        workerIds: [...baseWorkerMap[shiftType.type], ...extra],
      };
    })
  );
}

const initialAbsences: AbsenceRequest[] = [
  {
    id: "a1",
    workerId: "w6",
    workerName: "שיר לוי",
    type: "מחלה",
    fromDate: "2026-05-20",
    toDate: "2026-05-22",
    reason: "אישור מחלה",
    status: "pending",
  },
  {
    id: "a2",
    workerId: "w8",
    workerName: "אוראל דהן",
    type: "חופש",
    fromDate: "2026-05-18",
    toDate: "2026-05-24",
    reason: "חופשה מראש",
    status: "approved",
  },
];

function getHallName(hallId: string) {
  if (hallId === "garden-hall") return "גן אירועים";
  if (hallId === "sky-hall") return "SKY Hall";
  return "אולם הזהב";
}

function statusLabel(status: WorkerStatus) {
  if (status === "working") return "במשמרת";
  if (status === "sick") return "מחלה";
  if (status === "vacation") return "חופש";
  if (status === "replacement_pending") return "החלפה";
  return "זמין";
}

function statusClass(status: WorkerStatus) {
  if (status === "working") return "bg-emerald-50 text-emerald-700";
  if (status === "sick") return "bg-rose-50 text-rose-700";
  if (status === "vacation") return "bg-amber-50 text-amber-700";
  if (status === "replacement_pending") return "bg-violet-50 text-violet-700";
  return "bg-[#fff8eb] text-[#b98121]";
}

function absenceStatusClass(status: AbsenceRequest["status"]) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700";
  if (status === "declined") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function absenceStatusLabel(status: AbsenceRequest["status"]) {
  if (status === "approved") return "אושר";
  if (status === "declined") return "נדחה";
  return "ממתין";
}

export default function HallStaffShiftsPage() {
  const params = useParams<{ hallId: string }>();
  const hallId = params?.hallId || "main-gold-hall";
  const hallName = getHallName(hallId);

  const [workers, setWorkers] = useState<Worker[]>(workersInitial);
  const [shifts, setShifts] = useState<Shift[]>(createInitialShifts);
  const [absences, setAbsences] = useState<AbsenceRequest[]>(initialAbsences);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [draggedWorkerId, setDraggedWorkerId] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [workerSidebarOpen, setWorkerSidebarOpen] = useState(false);
  const [absenceOpen, setAbsenceOpen] = useState(false);
  const [addWorkerOpen, setAddWorkerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [absenceForm, setAbsenceForm] = useState({
    workerId: "w1",
    type: "חופש" as AbsenceType,
    fromDate: "2026-05-25",
    toDate: "2026-05-27",
    reason: "",
  });

  const selectedWorker = workers.find((worker) => worker.id === selectedWorkerId) || null;
  const selectedShift = shifts.find((shift) => shift.id === selectedShiftId) || null;

  const stats = useMemo(() => {
    const todayWorkerIds = new Set<string>();

    shifts.forEach((shift) => {
      if (shift.date === "19.05") {
        shift.workerIds.forEach((id) => todayWorkerIds.add(id));
      }
    });

    const eveningShift = shifts.find(
      (shift) => shift.date === "19.05" && shift.type === "evening"
    );

    const missingToday = shifts
      .filter((shift) => shift.date === "19.05")
      .reduce((sum, shift) => sum + Math.max(shift.required - shift.workerIds.length, 0), 0);

    return {
      workersToday: todayWorkerIds.size,
      eveningWorkers: eveningShift?.workerIds.length || 0,
      missingToday,
      pendingAbsences: absences.filter((absence) => absence.status === "pending").length,
    };
  }, [shifts, absences]);

  const workerById = (workerId: string) => workers.find((worker) => worker.id === workerId);

  const addWorkerToShift = (shiftId: string, workerId: string) => {
    setShifts((current) =>
      current.map((shift) => {
        if (shift.id !== shiftId) return shift;
        if (shift.workerIds.includes(workerId)) return shift;

        return {
          ...shift,
          workerIds: [...shift.workerIds, workerId],
        };
      })
    );

    setWorkers((current) =>
      current.map((worker) =>
        worker.id === workerId ? { ...worker, status: "working" } : worker
      )
    );
  };

  const removeWorkerFromShift = (shiftId: string, workerId: string) => {
    setShifts((current) =>
      current.map((shift) =>
        shift.id === shiftId
          ? {
              ...shift,
              workerIds: shift.workerIds.filter((id) => id !== workerId),
            }
          : shift
      )
    );
  };

  const openWorkerInShift = (workerId: string, shiftId: string) => {
    setSelectedWorkerId(workerId);
    setSelectedShiftId(shiftId);
    setWorkerSidebarOpen(true);
  };

  const replaceWorker = (newWorkerId: string) => {
    if (!selectedWorkerId || !selectedShiftId) return;

    setShifts((current) =>
      current.map((shift) => {
        if (shift.id !== selectedShiftId) return shift;

        const filtered = shift.workerIds.filter((id) => id !== selectedWorkerId);

        return {
          ...shift,
          workerIds: filtered.includes(newWorkerId) ? filtered : [...filtered, newWorkerId],
        };
      })
    );

    setWorkers((current) =>
      current.map((worker) => {
        if (worker.id === selectedWorkerId) return { ...worker, status: "replacement_pending" };
        if (worker.id === newWorkerId) return { ...worker, status: "working" };
        return worker;
      })
    );

    setWorkerSidebarOpen(false);
  };

  const approveSpecialAbsence = () => {
    if (!selectedWorker || !selectedShift) return;

    const absence: AbsenceRequest = {
      id: `absence-${Date.now()}`,
      workerId: selectedWorker.id,
      workerName: selectedWorker.name,
      type: "היעדרות מיוחדת",
      fromDate: selectedShift.date,
      toDate: selectedShift.date,
      reason: `אישור היעדרות ממשמרת ${selectedShift.title}`,
      status: "approved",
    };

    setAbsences((current) => [absence, ...current]);
    removeWorkerFromShift(selectedShift.id, selectedWorker.id);

    setWorkers((current) =>
      current.map((worker) =>
        worker.id === selectedWorker.id ? { ...worker, status: "vacation" } : worker
      )
    );

    setWorkerSidebarOpen(false);
  };

  const createAbsence = () => {
    const worker = workerById(absenceForm.workerId);
    if (!worker) return;

    const absence: AbsenceRequest = {
      id: `absence-${Date.now()}`,
      workerId: worker.id,
      workerName: worker.name,
      type: absenceForm.type,
      fromDate: absenceForm.fromDate,
      toDate: absenceForm.toDate,
      reason: absenceForm.reason || "ללא פירוט",
      status: "pending",
    };

    setAbsences((current) => [absence, ...current]);
    setWorkers((current) =>
      current.map((item) =>
        item.id === worker.id
          ? {
              ...item,
              status: absence.type === "מחלה" ? "sick" : "vacation",
            }
          : item
      )
    );

    setAbsenceOpen(false);
  };

  const updateAbsenceStatus = (absenceId: string, status: AbsenceRequest["status"]) => {
    setAbsences((current) =>
      current.map((absence) => (absence.id === absenceId ? { ...absence, status } : absence))
    );
  };

  const addWorker = () => {
    const id = `w-${Date.now()}`;

    setWorkers((current) => [
      ...current,
      {
        id,
        name: "עובד חדש",
        phone: "050-0000000",
        role: "מלצר",
        initials: "ח",
        status: "available",
      },
    ]);

    setAddWorkerOpen(false);
  };

  const saveMock = () => {
    setSaving(true);
    window.setTimeout(() => setSaving(false), 700);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f6f2] text-[#2b241c]">
      <div className="mx-auto max-w-[1820px] px-4 py-5 md:px-7">
        <header className="mb-5 rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[#9b8a73]">
                <span>ניהול אולם</span>
                <span>›</span>
                <span>{hallName}</span>
                <span>›</span>
                <span>צוות ומשמרות</span>
              </div>

              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#f4ead9] text-[#b98121]">
                  <UsersRound size={32} />
                </div>

                <div>
                  <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                    צוות ומשמרות
                  </h1>
                  <p className="mt-2 text-sm font-bold leading-7 text-[#7f705d]">
                    שיבוץ עובדים לחודש קדימה, תצוגה שבועית, גרירת עובדים למשמרות,
                    החלפות, חופשות, ימי מחלה ואישור היעדרות מיוחד.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/venues/dashboard/halls/${hallId}`}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
              >
                <ArrowRight size={17} />
                חזרה לאולם
              </Link>

              <button
                type="button"
                onClick={() => setAbsenceOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-4 text-sm font-black text-[#9f6f1a] transition hover:bg-[#f4ead9]"
              >
                <HeartPulse size={17} />
                חופש / מחלה
              </button>

              <button
                type="button"
                onClick={() => setAddWorkerOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-white px-4 text-sm font-black text-[#9f6f1a] transition hover:bg-[#fff8eb]"
              >
                <UserPlus size={17} />
                הוספת עובד
              </button>

              <button
                type="button"
                onClick={saveMock}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
              >
                {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                שמירת שיבוץ
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="עובדים היום"
            value={`${stats.workersToday}`}
            subtitle="סה״כ עובדים משובצים היום"
            icon={<UsersRound size={22} />}
          />
          <MetricCard
            title="במשמרת ערב"
            value={`${stats.eveningWorkers}`}
            subtitle="מתוך תקן של 12 עובדים"
            icon={<Clock3 size={22} />}
          />
          <MetricCard
            title="חוסרים היום"
            value={`${stats.missingToday}`}
            subtitle="פער בין תקן לשיבוץ בפועל"
            icon={<UserMinus size={22} />}
            danger
          />
          <MetricCard
            title="בקשות ממתינות"
            value={`${stats.pendingAbsences}`}
            subtitle="חופשה / מחלה / החלפה"
            icon={<Shuffle size={22} />}
          />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[310px_1fr_360px]">
          <aside className="space-y-5">
            <Panel title="מאגר עובדים לגרירה" icon={<UsersRound size={18} />}>
              <div className="mb-3 flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3">
                <Search size={16} className="text-[#a2937f]" />
                <input
                  placeholder="חיפוש עובד..."
                  className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-[#b7a895]"
                />
              </div>

              <div className="space-y-2">
                {workers.map((worker) => (
                  <WorkerDragCard
                    key={worker.id}
                    worker={worker}
                    onDragStart={() => setDraggedWorkerId(worker.id)}
                    onOpen={() => {
                      setSelectedWorkerId(worker.id);
                      setSelectedShiftId(null);
                      setWorkerSidebarOpen(true);
                    }}
                  />
                ))}
              </div>
            </Panel>

            <Panel title="פעולות מהירות" icon={<Sparkles size={18} />}>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setAbsenceOpen(true)}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] text-sm font-black text-[#9f6f1a]"
                >
                  <HeartPulse size={16} />
                  סימון חופש / מחלה
                </button>

                <button
                  type="button"
                  onClick={() => setAddWorkerOpen(true)}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]"
                >
                  <Plus size={16} />
                  הוספת עובד
                </button>

                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]"
                >
                  <Send size={16} />
                  שליחת הודעה לצוות
                </button>
              </div>
            </Panel>
          </aside>

          <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#2b241c]">יומן משמרות שבועי</h2>
                <p className="mt-1 text-sm font-bold text-[#7f705d]">
                  משבצים חודש קדימה, אבל התצוגה מחולקת לפי שבוע. גררי עובד לתא של משמרת.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWeekOffset((current) => Math.max(0, current - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-[#6f6252]"
                >
                  <ChevronRight size={18} />
                </button>

                <div className="flex h-10 items-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-4 text-sm font-black text-[#2b241c]">
                  <CalendarDays size={16} className="text-[#b98121]" />
                  שבוע {selectedWeekOffset + 1} מתוך 4
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedWeekOffset((current) => Math.min(3, current + 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-[#6f6252]"
                >
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[26px] border border-[#eadfce]">
              <div className="min-w-[1180px]">
                <div className="grid grid-cols-[120px_repeat(7,1fr)] border-b border-[#eadfce] bg-[#fff8eb]">
                  <div className="p-3 text-sm font-black text-[#8a7b68]">משמרת</div>

                  {weekDays.map((day) => (
                    <div
                      key={day.date}
                      className="border-r border-[#eadfce] p-3 text-center"
                    >
                      <div className="text-sm font-black text-[#2b241c]">{day.day}</div>
                      <div className="mt-1 text-xs font-bold text-[#8a7b68]">{day.date}</div>
                    </div>
                  ))}
                </div>

                {shiftTypes.map((shiftType) => (
                  <div
                    key={shiftType.type}
                    className="grid grid-cols-[120px_repeat(7,1fr)] border-b border-[#eadfce] last:border-b-0"
                  >
                    <div className="flex flex-col justify-center bg-[#fffdf8] p-3">
                      <div className="text-sm font-black text-[#2b241c]">{shiftType.title}</div>
                      <div className="mt-1 text-[11px] font-bold text-[#8a7b68]">
                        {shiftType.time}
                      </div>
                    </div>

                    {weekDays.map((day) => {
                      const shift = shifts.find(
                        (item) => item.date === day.date && item.type === shiftType.type
                      );

                      if (!shift) return null;

                      const missing = Math.max(shift.required - shift.workerIds.length, 0);

                      return (
                        <div
                          key={shift.id}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => {
                            if (draggedWorkerId) addWorkerToShift(shift.id, draggedWorkerId);
                            setDraggedWorkerId(null);
                          }}
                          className="min-h-[165px] border-r border-[#eadfce] bg-white p-2 transition hover:bg-[#fffdf8]"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="text-[11px] font-black text-[#8a7b68]">
                              {shift.workerIds.length}/{shift.required}
                            </div>

                            <span
                              className={[
                                "rounded-full px-2 py-1 text-[10px] font-black",
                                missing > 0
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-emerald-50 text-emerald-700",
                              ].join(" ")}
                            >
                              {missing > 0 ? `חסר ${missing}` : "מלא"}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {shift.workerIds.slice(0, 5).map((workerId) => {
                              const worker = workerById(workerId);
                              if (!worker) return null;

                              return (
                                <button
                                  key={worker.id}
                                  type="button"
                                  onClick={() => openWorkerInShift(worker.id, shift.id)}
                                  className="flex w-full items-center gap-2 rounded-xl border border-[#eadfce] bg-[#fffdf8] px-2 py-1.5 text-right transition hover:border-[#d9bd83] hover:bg-[#fff8eb]"
                                >
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f4ead9] text-[10px] font-black text-[#b98121]">
                                    {worker.initials}
                                  </span>

                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-xs font-black text-[#2b241c]">
                                      {worker.name}
                                    </span>
                                    <span className="block truncate text-[10px] font-bold text-[#8a7b68]">
                                      {worker.role}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}

                            {shift.workerIds.length > 5 ? (
                              <div className="rounded-xl bg-[#f4ead9] px-2 py-1 text-center text-[11px] font-black text-[#b98121]">
                                +{shift.workerIds.length - 5} נוספים
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <Panel title="כמה עובדים בכל משמרת" icon={<CheckCircle2 size={18} />}>
              <div className="space-y-4">
                {shiftTypes.map((shiftType) => {
                  const weekShiftWorkers = shifts
                    .filter((shift) => shift.type === shiftType.type)
                    .reduce((sum, shift) => sum + shift.workerIds.length, 0);

                  const weekRequired = shifts
                    .filter((shift) => shift.type === shiftType.type)
                    .reduce((sum, shift) => sum + shift.required, 0);

                  const percent = Math.min(100, Math.round((weekShiftWorkers / weekRequired) * 100));

                  return (
                    <div key={shiftType.type}>
                      <div className="mb-2 flex items-center justify-between text-xs font-black text-[#8a7b68]">
                        <span>{shiftType.title}</span>
                        <span>
                          {weekShiftWorkers}/{weekRequired}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-[#eee6d9]">
                        <div
                          className="h-full rounded-full bg-[#b98121]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="בקשות חופש / מחלה / היעדרות" icon={<HeartPulse size={18} />}>
              <div className="space-y-3">
                {absences.map((absence) => (
                  <div
                    key={absence.id}
                    className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-[#2b241c]">
                          {absence.workerName}
                        </div>
                        <div className="mt-1 text-xs font-bold text-[#8a7b68]">
                          {absence.type} · {absence.fromDate} - {absence.toDate}
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-black ${absenceStatusClass(
                          absence.status
                        )}`}
                      >
                        {absenceStatusLabel(absence.status)}
                      </span>
                    </div>

                    <div className="mt-2 text-xs font-bold leading-5 text-[#7f705d]">
                      {absence.reason}
                    </div>

                    {absence.status === "pending" ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => updateAbsenceStatus(absence.id, "approved")}
                          className="h-9 rounded-xl bg-emerald-50 text-xs font-black text-emerald-700"
                        >
                          אישור
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAbsenceStatus(absence.id, "declined")}
                          className="h-9 rounded-xl bg-rose-50 text-xs font-black text-rose-700"
                        >
                          דחייה
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="התראות" icon={<MessageCircle size={18} />}>
              <div className="space-y-2">
                <AlertLine title="חסר עובד בערב" text="19.05 · משמרת ערב חסר תקן חלקי" />
                <AlertLine title="מחלה פתוחה" text="שיר לוי ממתינה לאישור מנהל" />
                <AlertLine title="החלפה ממתינה" text="רועי לוי ביקש החלפה במשמרת ערב" />
              </div>
            </Panel>
          </aside>
        </section>
      </div>

      {workerSidebarOpen && selectedWorker ? (
        <aside className="fixed inset-y-0 left-0 z-[120] w-full max-w-[430px] overflow-y-auto border-r border-[#eadfce] bg-white p-5 shadow-2xl">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black text-[#b98121]">כרטיס עובד</div>
              <h2 className="mt-1 text-2xl font-black text-[#2b241c]">
                {selectedWorker.name}
              </h2>
              <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                {selectedWorker.role} · {selectedWorker.phone}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setWorkerSidebarOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-[#6f6252]"
            >
              <X size={18} />
            </button>
          </div>

          <div className="rounded-[26px] border border-[#eadfce] bg-[#fffdf8] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#f4ead9] text-lg font-black text-[#b98121]">
                {selectedWorker.initials}
              </div>

              <div>
                <div className="text-base font-black text-[#2b241c]">
                  {selectedWorker.name}
                </div>
                <div className="mt-1 text-xs font-bold text-[#8a7b68]">
                  {selectedShift
                    ? `${selectedShift.title} · ${selectedShift.date} · ${selectedShift.time}`
                    : "לא נבחרה משמרת"}
                </div>
              </div>
            </div>

            <span
              className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${statusClass(
                selectedWorker.status
              )}`}
            >
              {statusLabel(selectedWorker.status)}
            </span>
          </div>

          {selectedShift ? (
            <>
              <div className="mt-5 rounded-[26px] border border-[#eadfce] bg-white p-4">
                <h3 className="text-lg font-black text-[#2b241c]">
                  החלפה עם עובד אחר
                </h3>
                <p className="mt-1 text-xs font-bold leading-6 text-[#7f705d]">
                  בחרי עובד פנוי שייכנס במקומו למשמרת. העובד הנוכחי יסומן כהחלפה ממתינה.
                </p>

                <div className="mt-4 space-y-2">
                  {workers
                    .filter((worker) => worker.id !== selectedWorker.id)
                    .slice(0, 6)
                    .map((worker) => (
                      <button
                        key={worker.id}
                        type="button"
                        onClick={() => replaceWorker(worker.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-right transition hover:bg-[#fff8eb]"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4ead9] text-xs font-black text-[#b98121]">
                            {worker.initials}
                          </span>
                          <span>
                            <span className="block text-sm font-black text-[#2b241c]">
                              {worker.name}
                            </span>
                            <span className="block text-xs font-bold text-[#8a7b68]">
                              {worker.role}
                            </span>
                          </span>
                        </span>

                        <Shuffle size={16} className="text-[#b98121]" />
                      </button>
                    ))}
                </div>
              </div>

              <button
                type="button"
                onClick={approveSpecialAbsence}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 text-sm font-black text-white"
              >
                <ShieldCheck size={17} />
                אישור מיוחד להיעדרות
              </button>
            </>
          ) : (
            <div className="mt-5 rounded-2xl border border-[#eadfce] bg-[#fff8eb] p-4 text-sm font-bold leading-7 text-[#7f705d]">
              כדי לבצע החלפה, לחצי על שם העובד מתוך משמרת ספציפית ביומן.
            </div>
          )}
        </aside>
      ) : null}

      {absenceOpen && (
        <Modal title="סימון חופש / מחלה לפי תאריכים" onClose={() => setAbsenceOpen(false)}>
          <div className="grid gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-black text-[#8a7b68]">עובד</span>
              <select
                value={absenceForm.workerId}
                onChange={(event) =>
                  setAbsenceForm((current) => ({ ...current, workerId: event.target.value }))
                }
                className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
              >
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name} · {worker.role}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-black text-[#8a7b68]">סוג היעדרות</span>
              <select
                value={absenceForm.type}
                onChange={(event) =>
                  setAbsenceForm((current) => ({
                    ...current,
                    type: event.target.value as AbsenceType,
                  }))
                }
                className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
              >
                <option value="חופש">חופש</option>
                <option value="מחלה">מחלה</option>
                <option value="היעדרות מיוחדת">היעדרות מיוחדת</option>
              </select>
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-black text-[#8a7b68]">מתאריך</span>
                <input
                  type="date"
                  value={absenceForm.fromDate}
                  onChange={(event) =>
                    setAbsenceForm((current) => ({ ...current, fromDate: event.target.value }))
                  }
                  className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black text-[#8a7b68]">עד תאריך</span>
                <input
                  type="date"
                  value={absenceForm.toDate}
                  onChange={(event) =>
                    setAbsenceForm((current) => ({ ...current, toDate: event.target.value }))
                  }
                  className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-black text-[#8a7b68]">סיבה / הערה</span>
              <textarea
                value={absenceForm.reason}
                onChange={(event) =>
                  setAbsenceForm((current) => ({ ...current, reason: event.target.value }))
                }
                placeholder="לדוגמה: אישור מחלה / חופשה מראש / אישור מנהל..."
                className="min-h-[110px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
              />
            </label>

            <button
              type="button"
              onClick={createAbsence}
              className="mt-2 h-11 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              שמירת בקשה
            </button>
          </div>
        </Modal>
      )}

      {addWorkerOpen && (
        <Modal title="הוספת עובד" onClose={() => setAddWorkerOpen(false)}>
          <div className="grid gap-3">
            <InputLike label="שם עובד" value="עובד חדש" />
            <InputLike label="טלפון" value="050-0000000" />
            <InputLike label="תפקיד" value="מלצר" />

            <button
              type="button"
              onClick={addWorker}
              className="mt-2 h-11 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              הוספת עובד
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  danger,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="rounded-[26px] border border-[#eadfce] bg-white p-5 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
        {icon}
      </div>
      <div className="mt-4 text-sm font-black text-[#8a7b68]">{title}</div>
      <div className={["mt-1 text-3xl font-black", danger ? "text-rose-700" : "text-[#2b241c]"].join(" ")}>
        {value}
      </div>
      <div className="mt-1 text-xs font-bold leading-5 text-[#9b8a73]">{subtitle}</div>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
          {icon}
        </div>
        <h2 className="text-base font-black text-[#2b241c]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function WorkerDragCard({
  worker,
  onDragStart,
  onOpen,
}: {
  worker: Worker;
  onDragStart: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex cursor-grab items-center gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-2 active:cursor-grabbing"
    >
      <GripVertical size={17} className="text-[#b7a895]" />

      <button
        type="button"
        onClick={onOpen}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f4ead9] text-xs font-black text-[#b98121]"
      >
        {worker.initials}
      </button>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black text-[#2b241c]">{worker.name}</div>
        <div className="truncate text-xs font-bold text-[#8a7b68]">{worker.role}</div>
      </div>

      <span className={`rounded-full px-2 py-1 text-[10px] font-black ${statusClass(worker.status)}`}>
        {statusLabel(worker.status)}
      </span>
    </div>
  );
}

function AlertLine({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div className="text-sm font-black text-[#2b241c]">{title}</div>
      <div className="mt-1 text-xs font-bold leading-5 text-[#7f705d]">{text}</div>
    </div>
  );
}

function InputLike({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-[#8a7b68]">{label}</span>
      <input
        defaultValue={value}
        className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
      />
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/35 p-4">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-[#2b241c]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-[#6f6252]"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
