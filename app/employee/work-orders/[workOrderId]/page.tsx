"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/* ============================================================
   Constants
============================================================ */

const TASKS_PAGE_LIMIT = 5000;
const MAX_AUTO_PAGES = 50;

/* ============================================================
   Types
============================================================ */

type TaskStatus =
  | "pending"
  | "in_progress"
  | "confirmed"
  | "declined"
  | "no_answer"
  | "callback"
  | "undecided"
  | "will_reply_message"
  | "wrong_number"
  | "completed"
  | "cancelled";

type EmployeeInfo = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type WorkOrder = {
  id: string;
  _id: string;

  type: string;
  status: string;

  title: string;
  description: string;

  invitationId: string;

  clientName: string;
  clientEmail: string;

  eventName: string;
  eventDate: string | null;

  round: number;
  sourceAudience: string;

  workDate: string | null;
  configuredRoundAt: string | null;
  autoOpenAt: string | null;
  timezone: string;

  myTasksTotal: number;
  myTasksCompleted: number;
  myTasksRemaining: number;
  myProgressPercent: number;

  myPendingTasks: number;
  myInProgressTasks: number;
  myConfirmedTasks: number;
  myDeclinedTasks: number;
  myNoAnswerTasks: number;
  myCallbackTasks: number;
  myWrongNumberTasks: number;
  myCancelledTasks: number;

  totalTasks?: number;
  completedTasks?: number;
  remainingTasks?: number;
  progressPercent?: number;

  pendingTasks?: number;
  inProgressTasks?: number;
  confirmedTasks?: number;
  declinedTasks?: number;
  noAnswerTasks?: number;
  callbackTasks?: number;
  undecidedTasks?: number;
  willReplyMessageTasks?: number;
  wrongNumberTasks?: number;
  cancelledTasks?: number;

  createdAt: string | null;
  updatedAt: string | null;
};

type CallTask = {
  id: string;
  _id: string;

  type: string;

  workOrderId: string;
  invitationId: string;
  guestId: string;

  clientName: string;
  clientEmail: string;
  eventName: string;
  eventDate: string | null;

  guestName: string;
  guestPhone: string;
  guestEmail: string;
  guestGroup: string;
  guestSide: string;
  guestTable: string;
  guestNotes: string;

  round: number;
  sourceAudience: string;

  workDate: string | null;

  status: TaskStatus | string;
  result: string | null;

  priority: number;
  sortOrder: number;

  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastAttemptAt: string | null;

  attemptsCount: number;

  rsvpStatus: string;
  attendingCount: number | null;

  note: string;

  isCompleted: boolean;
  canStart: boolean;
  canUpdate: boolean;
};

type Summary = {
  total: number;
  pending: number;
  in_progress: number;
  confirmed: number;
  declined: number;
  no_answer: number;
  callback: number;
  undecided?: number;
  will_reply_message?: number;
  wrong_number: number;
  completed: number;
  cancelled: number;
  completedLogical: number;
  remaining: number;
  progressPercent: number;
};

type Pagination = {
  page: number;
  limit: number;
  totalFiltered: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type TasksApiResponse = {
  success: boolean;
  error?: string;
  employee?: EmployeeInfo;
  workOrder?: WorkOrder;
  summary?: Summary;
  pagination?: Pagination;
  count?: number;
  tasks?: CallTask[];
};

type UpdateApiResponse = {
  success: boolean;
  error?: string;
  message?: string;
  task?: CallTask;
  workOrder?: WorkOrder | null;
};

/* ============================================================
   Helpers
============================================================ */

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: "ממתין",
    in_progress: "בטיפול",
    confirmed: "מגיע",
    declined: "לא מגיע",
    no_answer: "לא ענה",
    callback: "לחזור אליו",
    undecided: "מתלבט",
    will_reply_message: "ישיב בהודעה",
    wrong_number: "מספר שגוי",
    completed: "הושלם",
    cancelled: "בוטל",

    scheduled: "מתוזמן",
    open: "פתוח",
    assigned: "משויך",
    active: "פעיל",
    paused: "מוקפא",
  };

  return map[status] || status || "—";
}

function getStatusClass(status: string) {
  if (status === "confirmed") return "good";
  if (status === "declined") return "bad";
  if (status === "no_answer") return "warn";
  if (status === "callback") return "info";
  if (status === "undecided") return "purple";
  if (status === "will_reply_message") return "cyan";
  if (status === "wrong_number") return "danger";
  if (status === "in_progress") return "active";
  if (status === "completed") return "good";
  if (status === "cancelled") return "muted";

  return "pending";
}

function getRoundLabel(round: number) {
  if (round === 1) return "סבב 1";
  if (round === 2) return "סבב 2";
  if (round === 3) return "סבב 3";

  return `סבב ${round}`;
}

function getAudienceLabel(sourceAudience: string) {
  const map: Record<string, string> = {
    pending_rsvp: "סבב 1 - כל מי שממתין לתשובה",
    round_1_no_answer: "סבב 2 - מי שלא ענה בסבב 1",
    round_2_no_answer: "סבב 3 - מי שלא ענה בסבב 2",
    all_pending: "כל הממתינים",
    no_response: "ללא תשובה",
  };

  return map[sourceAudience] || sourceAudience || "—";
}

function normalizePhone(phone: string) {
  return cleanText(phone).replace(/[^\d+]/g, "");
}

function getTaskId(task: CallTask) {
  return String(task.id || task._id || "");
}

function isFinalResultStatus(status: TaskStatus) {
  return (
    status === "confirmed" ||
    status === "declined" ||
    status === "no_answer" ||
    status === "callback" ||
    status === "undecided" ||
    status === "will_reply_message" ||
    status === "wrong_number"
  );
}

function isOpenTask(task: CallTask) {
  const status = String(task.status || "");

  return (
    status === "pending" ||
    status === "in_progress" ||
    status === "open" ||
    status === "assigned" ||
    status === "active"
  );
}

function statusButtonLabel(status: TaskStatus) {
  const map: Record<TaskStatus, string> = {
    pending: "ממתין",
    in_progress: "בטיפול",
    confirmed: "מגיע",
    declined: "לא מגיע",
    no_answer: "לא ענה",
    callback: "לחזור אליו",
    undecided: "מתלבט",
    will_reply_message: "ישיב בהודעה",
    wrong_number: "מספר שגוי",
    completed: "הושלם",
    cancelled: "בוטל",
  };

  return map[status] || status;
}

function getResultHelp(status: TaskStatus) {
  const map: Record<TaskStatus, string> = {
    pending: "השיחה עדיין ממתינה לטיפול.",
    in_progress: "השיחה נמצאת בטיפול.",
    confirmed: "יעדכן את ה-RSVP של האורח כמגיע ואת כמות המגיעים.",
    declined: "יעדכן את ה-RSVP של האורח כלא מגיע וכמות מגיעים 0.",
    no_answer: "יסמן שלא הייתה תשובה בסבב הזה. האורח ייחשב בוצע בסבב הנוכחי.",
    callback: "יסמן שהאורח ביקש שיחזרו אליו. האורח ייחשב בוצע בסבב הנוכחי.",
    undecided: "יסמן שהאורח ענה אבל עדיין מתלבט, בלי לסגור RSVP סופי.",
    will_reply_message:
      "יסמן שהאורח ביקש לא לחזור אליו ושהוא ישיב בהודעה, בלי לסגור RSVP סופי.",
    wrong_number: "יסמן מספר שגוי ויעדכן גם את האורח.",
    completed: "השיחה הושלמה.",
    cancelled: "השיחה בוטלה.",
  };

  return map[status] || "";
}

function normalizeDraftStatus(status: string): TaskStatus {
  const allowed: TaskStatus[] = [
    "pending",
    "in_progress",
    "confirmed",
    "declined",
    "no_answer",
    "callback",
    "undecided",
    "will_reply_message",
    "wrong_number",
    "completed",
    "cancelled",
  ];

  if (allowed.includes(status as TaskStatus)) {
    return status as TaskStatus;
  }

  return "confirmed";
}

function uniqueTasksById(items: CallTask[]) {
  const map = new Map<string, CallTask>();

  for (const task of items) {
    const id = getTaskId(task);
    if (!id) continue;
    map.set(id, task);
  }

  return Array.from(map.values());
}

/* ============================================================
   Page
============================================================ */

export default function EmployeeWorkOrderTasksPage() {
  const params = useParams();

  const workOrderId = useMemo(() => {
    const raw = params?.workOrderId;
    if (Array.isArray(raw)) return raw[0] || "";
    return String(raw || "");
  }, [params]);

  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [serverTotalFiltered, setServerTotalFiltered] = useState(0);
  const [tasks, setTasks] = useState<CallTask[]>([]);

  const [selectedTask, setSelectedTask] = useState<CallTask | null>(null);
  const [draftStatus, setDraftStatus] = useState<TaskStatus>("confirmed");
  const [draftNote, setDraftNote] = useState("");
  const [draftCount, setDraftCount] = useState("1");

  const [status, setStatus] = useState("open");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("default");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const visibleOpenTasks = useMemo(() => {
    return tasks.filter(isOpenTask);
  }, [tasks]);

  const visibleCompletedTasks = useMemo(() => {
    return tasks.filter((task) => !isOpenTask(task));
  }, [tasks]);

  const progress = summary
    ? Math.min(100, Math.max(0, safeNumber(summary.progressPercent)))
    : workOrder
      ? Math.min(100, Math.max(0, safeNumber(workOrder.myProgressPercent)))
      : 0;

  const totalTasksCount = summary
    ? safeNumber(summary.total)
    : workOrder
      ? safeNumber(workOrder.myTasksTotal)
      : tasks.length;

  const openTasksCount = summary
    ? safeNumber(summary.remaining)
    : workOrder
      ? safeNumber(workOrder.myTasksRemaining)
      : visibleOpenTasks.length;

  const completedTasksCount = summary
    ? safeNumber(summary.completedLogical)
    : workOrder
      ? safeNumber(workOrder.myTasksCompleted)
      : visibleCompletedTasks.length;

  const selectedTel = selectedTask ? normalizePhone(selectedTask.guestPhone) : "";

  function applySelectedTask(task: CallTask | null) {
    setSelectedTask(task);

    if (!task) {
      setDraftStatus("confirmed");
      setDraftNote("");
      setDraftCount("1");
      return;
    }

    const currentStatus = normalizeDraftStatus(String(task.status || "pending"));

    setDraftStatus(
      currentStatus === "pending" || currentStatus === "in_progress"
        ? "confirmed"
        : currentStatus
    );

    setDraftNote(task.note || "");

    const existingCount =
      typeof task.attendingCount === "number" && task.attendingCount > 0
        ? task.attendingCount
        : 1;

    setDraftCount(String(existingCount));
  }

  function buildTasksQuery(pageNumber: number) {
    const query = new URLSearchParams();

    query.set("page", String(pageNumber));
    query.set("limit", String(TASKS_PAGE_LIMIT));
    query.set("all", "true");
    query.set("noPagination", "true");
    query.set("_t", String(Date.now()));

    if (status && status !== "all") {
      query.set("status", status);
    }

    if (search.trim()) {
      query.set("q", search.trim());
    }

    if (sort && sort !== "default") {
      query.set("sort", sort);
    }

    return query;
  }

  async function fetchTasksPage(pageNumber: number) {
    const query = buildTasksQuery(pageNumber);

    const res = await fetch(
      `/api/employee/work-orders/${encodeURIComponent(
        workOrderId
      )}/tasks?${query.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      }
    );

    const data = (await res.json().catch(() => ({}))) as TasksApiResponse;

    if (!res.ok || !data.success) {
      throw new Error(data.error || "שגיאה בטעינת רשימת השיחות");
    }

    return data;
  }

  async function loadTasks(options?: { silent?: boolean }) {
    if (!workOrderId) return;

    try {
      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const firstData = await fetchTasksPage(1);
      let allTasks = Array.isArray(firstData.tasks) ? firstData.tasks : [];

      let latestPagination = firstData.pagination || null;
      let nextPage = 2;

      while (
        latestPagination?.hasNextPage &&
        nextPage <= safeNumber(latestPagination.totalPages) &&
        nextPage <= MAX_AUTO_PAGES
      ) {
        const nextData = await fetchTasksPage(nextPage);
        const nextTasks = Array.isArray(nextData.tasks) ? nextData.tasks : [];

        allTasks = allTasks.concat(nextTasks);
        latestPagination = nextData.pagination || null;
        nextPage += 1;
      }

      const nextTasks = uniqueTasksById(allTasks);

      setEmployee(firstData.employee || null);
      setWorkOrder(firstData.workOrder || null);
      setSummary(firstData.summary || null);
      setServerTotalFiltered(
        safeNumber(firstData.pagination?.totalFiltered || nextTasks.length)
      );
      setTasks(nextTasks);

      setSelectedTask((current) => {
        if (!nextTasks.length) {
          setTimeout(() => applySelectedTask(null), 0);
          return null;
        }

        if (!current) {
          const firstOpen = nextTasks.find(isOpenTask) || nextTasks[0];
          setTimeout(() => applySelectedTask(firstOpen), 0);
          return firstOpen;
        }

        const stillExists = nextTasks.find(
          (task) => getTaskId(task) === getTaskId(current)
        );

        if (stillExists) {
          setTimeout(() => applySelectedTask(stillExists), 0);
          return stillExists;
        }

        const firstOpen = nextTasks.find(isOpenTask) || nextTasks[0];
        setTimeout(() => applySelectedTask(firstOpen), 0);
        return firstOpen;
      });
    } catch (err: any) {
      setError(err?.message || "שגיאה בטעינת רשימת השיחות");
      setTasks([]);
      setServerTotalFiltered(0);
      applySelectedTask(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
  const timer = window.setTimeout(() => {
    loadTasks({ silent: true });
  }, search.trim() ? 350 : 0);

  return () => {
    window.clearTimeout(timer);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [workOrderId, status, sort, search]);

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    loadTasks({ silent: true });
  }

  async function updateTaskStatus(input: {
    task: CallTask;
    status: TaskStatus;
    note?: string;
    attendingCount?: number;
  }) {
    try {
      const taskId = getTaskId(input.task);

      setUpdatingTaskId(taskId);
      setError("");
      setSuccessMsg("");

      const isFinal = isFinalResultStatus(input.status);
      const round = safeNumber(input.task.round || workOrder?.round || 1);
      const currentWorkOrderId = input.task.workOrderId || workOrderId;
      const invitationId = input.task.invitationId || workOrder?.invitationId || "";
      const guestId = input.task.guestId || "";

      const body: Record<string, any> = {
        taskId,
        callTaskId: taskId,

        workOrderId: currentWorkOrderId,
        invitationId,
        guestId,

        round,
        sourceAudience:
          input.task.sourceAudience || workOrder?.sourceAudience || "",

        status: input.status,
        result: input.status,
        callResult: input.status,

        note: input.note || "",

        markCompleted: isFinal,
        isCompleted: isFinal,
        completed: isFinal,

        updateGuestRsvp: isFinal,
        updateGuest: isFinal,

        completedAt: isFinal ? new Date().toISOString() : null,
      };

      if (input.attendingCount !== undefined) {
        body.attendingCount = input.attendingCount;
        body.confirmedCount = input.attendingCount;
        body.guestsCount = input.attendingCount;
      }

      if (input.status === "confirmed") {
        body.rsvpStatus = "attending";
        body.guestRsvpStatus = "attending";
        body.rsvpResult = "attending";
        body.keepRsvpOpen = false;
      }

      if (input.status === "declined") {
        body.rsvpStatus = "not_attending";
        body.guestRsvpStatus = "not_attending";
        body.rsvpResult = "not_attending";
        body.attendingCount = 0;
        body.confirmedCount = 0;
        body.guestsCount = 0;
        body.keepRsvpOpen = false;
      }

      if (input.status === "wrong_number") {
        body.rsvpStatus = "wrong_number";
        body.guestRsvpStatus = "wrong_number";
        body.rsvpResult = "wrong_number";
        body.attendingCount = 0;
        body.confirmedCount = 0;
        body.guestsCount = 0;
        body.phoneInvalid = true;
        body.invalidPhone = true;
        body.keepRsvpOpen = false;
      }

      if (
        input.status === "undecided" ||
        input.status === "callback" ||
        input.status === "will_reply_message" ||
        input.status === "no_answer"
      ) {
        body.keepRsvpOpen = true;
        body.rsvpStatus = input.status;
        body.guestRsvpStatus = input.status;
        body.rsvpResult = input.status;
      }

      const res = await fetch(
        `/api/employee/call-tasks/${encodeURIComponent(taskId)}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(body),
        }
      );

      const data = (await res.json().catch(() => ({}))) as UpdateApiResponse;

      if (!res.ok || !data.success) {
        throw new Error(data.error || "שגיאה בעדכון השיחה");
      }

      setSuccessMsg(data.message || "השיחה עודכנה והאורח סומן כבוצע");

      if (data.workOrder) {
        setWorkOrder(data.workOrder);
      }

      setTasks((current) => {
        const updated = current.map((task) => {
          if (getTaskId(task) !== taskId) return task;

          return {
            ...task,
            status: input.status,
            result: input.status,
            note: input.note || "",
            attendingCount:
              input.attendingCount !== undefined
                ? input.attendingCount
                : task.attendingCount,
            isCompleted: isFinal,
            completedAt: isFinal ? new Date().toISOString() : task.completedAt,
            lastAttemptAt: new Date().toISOString(),
            attemptsCount:
              input.status === "in_progress"
                ? safeNumber(task.attemptsCount)
                : safeNumber(task.attemptsCount) + 1,
          };
        });

        return updated;
      });

      if (isFinal) {
        setTimeout(() => {
          loadTasks({ silent: true });
        }, 250);
      } else {
        await loadTasks({ silent: true });
      }
    } catch (err: any) {
      setError(err?.message || "שגיאה בעדכון השיחה");
    } finally {
      setUpdatingTaskId("");
    }
  }

  async function saveSelectedTask() {
    if (!selectedTask || !draftStatus) return;

    const payload: {
      task: CallTask;
      status: TaskStatus;
      note?: string;
      attendingCount?: number;
    } = {
      task: selectedTask,
      status: draftStatus,
      note: draftNote,
    };

    if (draftStatus === "confirmed") {
      const count = Math.max(1, Number(draftCount || 1));
      payload.attendingCount = Number.isFinite(count) ? count : 1;
    }

    if (draftStatus === "declined" || draftStatus === "wrong_number") {
      payload.attendingCount = 0;
    }

    await updateTaskStatus(payload);
  }

  async function startSelectedTask() {
    if (!selectedTask) return;

    await updateTaskStatus({
      task: selectedTask,
      status: "in_progress",
      note: draftNote || selectedTask.note || "",
    });
  }

  function selectNextOpenTask() {
    if (!visibleOpenTasks.length) return;

    if (!selectedTask) {
      applySelectedTask(visibleOpenTasks[0]);
      return;
    }

    const currentIndex = visibleOpenTasks.findIndex(
      (task) => getTaskId(task) === getTaskId(selectedTask)
    );

    const next =
      currentIndex >= 0
        ? visibleOpenTasks[currentIndex + 1] || visibleOpenTasks[0]
        : visibleOpenTasks[0];

    applySelectedTask(next);
  }

  return (
    <main className="callCenterPage" dir="rtl">
      <section className="topBar">
        <Link href="/employee/work-orders" className="backLink">
          ← חזרה להוראות עבודה
        </Link>

        <div className="topActions">
          <button
            type="button"
            className="ghostBtn"
            disabled={refreshing || loading || !visibleOpenTasks.length}
            onClick={selectNextOpenTask}
          >
            השיחה הבאה
          </button>

          <button
            type="button"
            className="refreshBtn"
            disabled={refreshing || loading}
            onClick={() => loadTasks({ silent: true })}
          >
            {refreshing ? "מרענן..." : "רענון"}
          </button>
        </div>
      </section>

      <section className="hero">
        <div>
          <p className="eyebrow">מוקד שיחות RSVP</p>

          <h1>
            {workOrder?.clientName ||
              workOrder?.clientEmail ||
              "הוראת עבודה"}
          </h1>

          <p className="subtitle">
            {workOrder
              ? `${getRoundLabel(workOrder.round)} · ${getAudienceLabel(
                  workOrder.sourceAudience
                )} · ${workOrder.eventName || "אירוע"}`
              : "כאן מופיעות רק השיחות שהוקצו לעובד המחובר."}
          </p>

          <p className="dailyHint">
            כל הרשימה נטענת במסך אחד. בסיום שיחה נשלח לשרת הסבב, האורח והתוצאה
            כדי לעדכן RSVP ולסמן את אותו אורח כבוצע בסבב הנוכחי.
          </p>
        </div>

        <div className="heroMeta">
          <span>תאריך עבודה</span>
          <strong>{formatDate(workOrder?.workDate)}</strong>
          <small>{formatDateTime(workOrder?.configuredRoundAt)}</small>
        </div>
      </section>

      <section className="statsGrid">
        <div className="statBox primary">
          <span>סה״כ שיחות שלי</span>
          <strong>{totalTasksCount}</strong>
        </div>

        <div className="statBox">
          <span>פתוחות</span>
          <strong>{openTasksCount}</strong>
        </div>

        <div className="statBox">
          <span>טופלו</span>
          <strong>{completedTasksCount}</strong>
        </div>

        <div className="statBox">
          <span>לא ענו</span>
          <strong>{safeNumber(summary?.no_answer)}</strong>
        </div>

        <div className="statBox">
          <span>מגיעים</span>
          <strong>{safeNumber(summary?.confirmed)}</strong>
        </div>

        <div className="statBox">
          <span>התקדמות</span>
          <strong>{progress}%</strong>
        </div>
      </section>

      <section className="progressCard">
        <div>
          <span>התקדמות טיפול</span>
          <strong>{progress}%</strong>
        </div>

        <div className="progressBar">
          <div style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="filtersCard">
        <form onSubmit={handleSearchSubmit} className="searchForm">
          <label>חיפוש</label>

          <div>
            <input
              type="search"
              value={search}
              placeholder="שם אורח, טלפון, קבוצה, שולחן..."
              onChange={(e) => setSearch(e.target.value)}
            />

          </div>
        </form>

        <div className="filterGroup">
          <label>סטטוס</label>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
            }}
          >
            <option value="all">הכל</option>
            <option value="open">פתוחות בלבד</option>
            <option value="done">טופלו בלבד</option>
            <option value="pending">ממתין</option>
            <option value="in_progress">בטיפול</option>
            <option value="confirmed">מגיע</option>
            <option value="declined">לא מגיע</option>
            <option value="no_answer">לא ענה</option>
            <option value="will_reply_message">ישיב בהודעה</option>
          </select>
        </div>

        <div className="filterGroup">
          <label>מיון</label>

          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
            }}
          >
            <option value="default">לפי סדר חלוקה</option>
            <option value="name">שם אורח</option>
            <option value="status">סטטוס</option>
            <option value="newest">חדש קודם</option>
            <option value="oldest">ישן קודם</option>
          </select>
        </div>
      </section>

      {employee && (
        <section className="employeeStrip">
          <div>
            <span>עובד מחובר</span>
            <strong>{employee.name || employee.email || "עובד"}</strong>
          </div>

          <div>
            <span>מייל</span>
            <strong>{employee.email || "—"}</strong>
          </div>

          <div>
            <span>לקוח</span>
            <strong>{workOrder?.clientEmail || "—"}</strong>
          </div>
        </section>
      )}

      {error && <div className="errorBox">{error}</div>}
      {successMsg && <div className="successBox">{successMsg}</div>}

      {loading ? (
        <section className="loadingCard">
          <div className="spinner" />
          <p>טוען את כל רשימת השיחות...</p>
        </section>
      ) : tasks.length === 0 ? (
        <section className="emptyCard">
          <h2>אין שיחות להצגה</h2>
          <p>אפשר לשנות סינון או לחזור להוראות העבודה.</p>
        </section>
      ) : (
        <section className="workspace">
          <section className="queuePanel">
            <div className="panelHeader">
              <div>
                <h2>תור שיחות</h2>
                <p>
                  {openTasksCount} פתוחות · {completedTasksCount} טופלו · מוצגות{" "}
                  {tasks.length}
                  {serverTotalFiltered && serverTotalFiltered !== tasks.length
                    ? ` מתוך ${serverTotalFiltered}`
                    : " - כל הרשימה"}
                </p>
              </div>
            </div>

            <div className="queueTable">
              <div className="queueHead">
                <span>אורח</span>
                <span>טלפון</span>
                <span>קבוצה</span>
                <span>ניסיונות</span>
                <span>סטטוס</span>
              </div>

              <div className="queueRows">
                {tasks.map((task) => {
                  const taskId = getTaskId(task);
                  const selected =
                    selectedTask && getTaskId(selectedTask) === taskId;

                  return (
                    <button
                      type="button"
                      key={taskId}
                      className={`queueRow ${selected ? "selected" : ""}`}
                      onClick={() => applySelectedTask(task)}
                    >
                      <span className="guestCell">
                        <strong>{task.guestName || "אורח ללא שם"}</strong>
                        <small>
                          {task.guestTable ? `שולחן ${task.guestTable}` : "—"}
                        </small>
                      </span>

                      <span dir="ltr">{task.guestPhone || "—"}</span>

                      <span>{task.guestGroup || "—"}</span>

                      <span>{safeNumber(task.attemptsCount)}</span>

                      <span>
                        <b
                          className={`statusPill ${getStatusClass(
                            String(task.status)
                          )}`}
                        >
                          {getStatusLabel(String(task.status))}
                        </b>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="callPanel">
            {!selectedTask ? (
              <div className="noSelection">
                <h2>בחרי שיחה מהרשימה</h2>
                <p>כאן יופיעו פרטי האורח והפעולות לעדכון.</p>
              </div>
            ) : (
              <>
                <div className="callPanelTop">
                  <div>
                    <span
                      className={`statusPill ${getStatusClass(
                        String(selectedTask.status)
                      )}`}
                    >
                      {getStatusLabel(String(selectedTask.status))}
                    </span>

                    <h2>{selectedTask.guestName || "אורח ללא שם"}</h2>

                    <p dir="ltr">{selectedTask.guestPhone || "אין טלפון"}</p>
                  </div>

                  <div className="attemptBox">
                    <span>ניסיונות</span>
                    <strong>{safeNumber(selectedTask.attemptsCount)}</strong>
                  </div>
                </div>

                <div className="detailsGrid">
                  <div>
                    <span>סבב</span>
                    <strong>
                      {getRoundLabel(
                        safeNumber(selectedTask.round || workOrder?.round || 1)
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>קבוצה</span>
                    <strong>{selectedTask.guestGroup || "—"}</strong>
                  </div>

                  <div>
                    <span>שולחן</span>
                    <strong>{selectedTask.guestTable || "—"}</strong>
                  </div>

                  <div>
                    <span>עודכן</span>
                    <strong>{formatDateTime(selectedTask.lastAttemptAt)}</strong>
                  </div>
                </div>

                {selectedTask.guestNotes && (
                  <div className="noteBox guest">
                    <span>הערת אורח</span>
                    <p>{selectedTask.guestNotes}</p>
                  </div>
                )}

                {selectedTask.note && (
                  <div className="noteBox worker">
                    <span>הערת עובד קיימת</span>
                    <p>{selectedTask.note}</p>
                  </div>
                )}

                <div className="mainActions">
                  {selectedTel ? (
                    <a href={`tel:${selectedTel}`} className="callBtn">
                      התקשר עכשיו
                    </a>
                  ) : (
                    <button type="button" className="callBtn" disabled>
                      אין טלפון
                    </button>
                  )}

                  <button
                    type="button"
                    className="startBtn"
                    disabled={Boolean(updatingTaskId) || !selectedTask.canUpdate}
                    onClick={startSelectedTask}
                  >
                    התחל טיפול
                  </button>
                </div>

                <div className="resultPanel">
                  <span className="panelMiniTitle">תוצאת השיחה</span>

                  <div className="resultButtons">
                    {(
  [
    "confirmed",
    "declined",
    "will_reply_message",
    "no_answer",
  ] as TaskStatus[]
).map((item) => (

                      <button
                        type="button"
                        key={item}
                        className={`${getStatusClass(item)} ${
                          draftStatus === item ? "selected" : ""
                        }`}
                        onClick={() => setDraftStatus(item)}
                      >
                        {statusButtonLabel(item)}
                      </button>
                    ))}
                  </div>

                  <div className="resultHelp">{getResultHelp(draftStatus)}</div>

                  {draftStatus === "confirmed" && (
                    <div className="field">
                      <label>כמה מגיעים?</label>
                      <input
                        type="number"
                        min={1}
                        value={draftCount}
                        onChange={(e) => setDraftCount(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="field">
                    <label>הערה</label>
                    <textarea
                      value={draftNote}
                      placeholder="לדוגמה: ביקש לחזור בערב / מתלבט / ישיב בהודעה / מספר לא תקין..."
                      onChange={(e) => setDraftNote(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className="saveBtn"
                    disabled={
                      Boolean(updatingTaskId) || !selectedTask.canUpdate
                    }
                    onClick={saveSelectedTask}
                  >
                    {updatingTaskId === getTaskId(selectedTask)
                      ? "שומר..."
                      : "שמור תוצאה וסמן כבוצע"}
                  </button>
                </div>
              </>
            )}
          </aside>
        </section>
      )}

      <style>{`
        .callCenterPage {
          min-height: 100vh;
          background:
            radial-gradient(circle at 88% 0%, rgba(37, 99, 235, 0.18), transparent 28%),
            radial-gradient(circle at 8% 20%, rgba(14, 165, 233, 0.1), transparent 24%),
            linear-gradient(180deg, #f8fafc 0%, #edf2f8 100%);
          padding: 24px;
          color: #0f172a;
        }

        .topBar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .topActions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .backLink,
        .refreshBtn,
        .ghostBtn {
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 0 16px;
          font-weight: 950;
          text-decoration: none;
          white-space: nowrap;
        }

        .backLink {
          background: rgba(255, 255, 255, 0.94);
          color: #2563eb;
          border: 1px solid #dbeafe;
        }

        .refreshBtn {
          border: 0;
          color: white;
          background: #0f172a;
          cursor: pointer;
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.16);
        }

        .ghostBtn {
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
          background: #eff6ff;
          cursor: pointer;
        }

        button:disabled,
        .refreshBtn:disabled {
          opacity: 0.58;
          cursor: not-allowed;
        }

        .hero {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 18px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 30px;
          padding: 24px;
          box-shadow: 0 18px 54px rgba(15, 23, 42, 0.08);
          margin-bottom: 14px;
        }

        .eyebrow {
          margin: 0 0 6px;
          color: #2563eb;
          font-size: 13px;
          font-weight: 950;
        }

        .hero h1 {
          margin: 0;
          font-size: clamp(30px, 4vw, 44px);
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .subtitle {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 15px;
          font-weight: 800;
        }

        .dailyHint {
          margin: 8px 0 0;
          color: #2563eb;
          font-size: 13px;
          font-weight: 950;
          max-width: 850px;
          line-height: 1.6;
        }

        .heroMeta {
          background: #eff6ff;
          border: 1px solid #dbeafe;
          border-radius: 20px;
          padding: 14px 16px;
          min-width: 220px;
        }

        .heroMeta span,
        .employeeStrip span,
        .detailsGrid span,
        .noteBox span,
        .field label,
        .panelMiniTitle {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 950;
          margin-bottom: 5px;
        }

        .heroMeta strong {
          display: block;
          font-size: 17px;
          font-weight: 950;
        }

        .heroMeta small {
          display: block;
          color: #64748b;
          font-weight: 800;
          margin-top: 4px;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 14px;
        }

        .statBox,
        .progressCard,
        .filtersCard,
        .employeeStrip,
        .queuePanel,
        .callPanel,
        .loadingCard,
        .emptyCard {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.24);
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.07);
        }

        .statBox {
          border-radius: 22px;
          padding: 16px;
        }

        .statBox.primary {
          background: #0f172a;
          color: white;
        }

        .statBox span {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 950;
          margin-bottom: 6px;
        }

        .statBox.primary span {
          color: #cbd5e1;
        }

        .statBox strong {
          display: block;
          font-size: 30px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .progressCard {
          border-radius: 22px;
          padding: 14px 16px;
          margin-bottom: 14px;
        }

        .progressCard > div:first-child {
          display: flex;
          justify-content: space-between;
          font-weight: 950;
          margin-bottom: 8px;
        }

        .progressBar {
          height: 12px;
          border-radius: 999px;
          background: #e2e8f0;
          overflow: hidden;
        }

        .progressBar div {
          height: 100%;
          background: linear-gradient(90deg, #2563eb, #06b6d4);
          border-radius: 999px;
        }

        .filtersCard {
          display: grid;
          grid-template-columns: 1fr 220px 220px;
          gap: 12px;
          padding: 14px;
          border-radius: 24px;
          margin-bottom: 14px;
          align-items: end;
        }

        .searchForm,
        .filterGroup {
          display: grid;
          gap: 7px;
        }

        .searchForm label,
        .filterGroup label {
          color: #64748b;
          font-size: 12px;
          font-weight: 950;
        }

        .searchForm div {
          display: flex;
          gap: 8px;
        }

        input,
        select,
        textarea {
          border: 1px solid #dbe3ef;
          background: white;
          color: #0f172a;
          border-radius: 14px;
          padding: 0 12px;
          font-weight: 850;
          outline: none;
        }

        input,
        select {
          height: 44px;
        }

        textarea {
          min-height: 94px;
          padding: 12px;
          resize: vertical;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
        }

        .searchForm input {
          flex: 1;
          min-width: 0;
        }

        .searchForm button {
          height: 44px;
          border: 0;
          border-radius: 14px;
          background: #2563eb;
          color: white;
          padding: 0 16px;
          font-weight: 950;
          cursor: pointer;
        }

        .employeeStrip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          padding: 14px;
          border-radius: 22px;
          margin-bottom: 14px;
        }

        .employeeStrip div {
          background: #f8fafc;
          border: 1px solid #eef2f7;
          border-radius: 16px;
          padding: 11px;
          min-width: 0;
        }

        .employeeStrip strong,
        .detailsGrid strong {
          display: block;
          font-size: 14px;
          font-weight: 950;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .errorBox,
        .successBox {
          border-radius: 18px;
          padding: 14px 16px;
          font-weight: 950;
          margin-bottom: 14px;
        }

        .errorBox {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #be123c;
        }

        .successBox {
          background: #ecfdf5;
          border: 1px solid #bbf7d0;
          color: #15803d;
        }

        .loadingCard,
        .emptyCard {
          border-radius: 24px;
          padding: 34px;
          text-align: center;
        }

        .emptyCard h2 {
          margin: 0 0 8px;
          font-size: 22px;
          font-weight: 950;
        }

        .emptyCard p,
        .loadingCard p {
          margin: 0;
          color: #64748b;
          font-weight: 800;
        }

        .spinner {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 4px solid #dbeafe;
          border-top-color: #2563eb;
          margin: 0 auto 12px;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .workspace {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 420px;
          gap: 16px;
          align-items: start;
        }

        .queuePanel,
        .callPanel {
          border-radius: 26px;
          overflow: hidden;
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .panelHeader h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 950;
        }

        .panelHeader p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 13px;
          font-weight: 850;
        }

        .queueTable {
          width: 100%;
        }

        .queueHead,
        .queueRow {
          display: grid;
          grid-template-columns: 1.7fr 1fr 0.8fr 0.6fr 0.9fr;
          gap: 12px;
          align-items: center;
          padding: 0 16px;
        }

        .queueHead {
          min-height: 42px;
          background: #f8fafc;
          color: #64748b;
          font-size: 12px;
          font-weight: 950;
          border-bottom: 1px solid #e2e8f0;
        }

        .queueRows {
          max-height: calc(100vh - 420px);
          min-height: 460px;
          overflow: auto;
        }

        .queueRow {
          width: 100%;
          min-height: 62px;
          border: 0;
          border-bottom: 1px solid #eef2f7;
          background: white;
          color: #0f172a;
          text-align: right;
          cursor: pointer;
          font-weight: 850;
        }

        .queueRow:hover {
          background: #f8fafc;
        }

        .queueRow.selected {
          background: #eff6ff;
          box-shadow: inset -4px 0 0 #2563eb;
        }

        .guestCell {
          min-width: 0;
        }

        .guestCell strong {
          display: block;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 14px;
        }

        .guestCell small {
          display: block;
          color: #64748b;
          margin-top: 3px;
          font-size: 12px;
        }

        .statusPill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }

        .statusPill.pending,
        .resultButtons .pending {
          background: #f1f5f9;
          color: #475569;
        }

        .statusPill.active,
        .resultButtons .active {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .statusPill.good,
        .resultButtons .good {
          background: #dcfce7;
          color: #15803d;
        }

        .statusPill.bad,
        .resultButtons .bad {
          background: #fee2e2;
          color: #b91c1c;
        }

        .statusPill.warn,
        .resultButtons .warn {
          background: #fef3c7;
          color: #b45309;
        }

        .statusPill.info,
        .resultButtons .info {
          background: #cffafe;
          color: #0e7490;
        }

        .statusPill.purple,
        .resultButtons .purple {
          background: #ede9fe;
          color: #6d28d9;
        }

        .statusPill.cyan,
        .resultButtons .cyan {
          background: #ccfbf1;
          color: #0f766e;
        }

        .statusPill.danger,
        .resultButtons .danger {
          background: #ffe4e6;
          color: #be123c;
        }

        .statusPill.muted {
          background: #e2e8f0;
          color: #64748b;
        }

        .callPanel {
          position: sticky;
          top: 18px;
          padding: 18px;
        }

        .noSelection {
          min-height: 400px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
        }

        .noSelection h2 {
          margin: 0 0 8px;
          font-size: 22px;
          font-weight: 950;
        }

        .noSelection p {
          margin: 0;
          color: #64748b;
          font-weight: 850;
        }

        .callPanelTop {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: start;
          margin-bottom: 16px;
        }

        .callPanelTop h2 {
          margin: 10px 0 4px;
          font-size: 28px;
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .callPanelTop p {
          margin: 0;
          color: #475569;
          font-size: 17px;
          font-weight: 950;
          text-align: right;
        }

        .attemptBox {
          background: #f8fafc;
          border: 1px solid #eef2f7;
          border-radius: 16px;
          padding: 10px 12px;
          text-align: center;
          min-width: 78px;
        }

        .attemptBox span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 950;
        }

        .attemptBox strong {
          display: block;
          font-size: 25px;
          font-weight: 950;
        }

        .detailsGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 12px;
        }

        .detailsGrid div {
          background: #f8fafc;
          border: 1px solid #eef2f7;
          border-radius: 16px;
          padding: 11px;
          min-width: 0;
        }

        .noteBox {
          border-radius: 16px;
          padding: 12px;
          margin-bottom: 10px;
        }

        .noteBox.guest {
          background: #fff7ed;
          border: 1px solid #fed7aa;
        }

        .noteBox.worker {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
        }

        .noteBox p {
          margin: 0;
          color: #334155;
          font-size: 14px;
          font-weight: 850;
          line-height: 1.55;
        }

        .mainActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin: 12px 0;
        }

        .callBtn,
        .startBtn,
        .saveBtn {
          min-height: 48px;
          border-radius: 16px;
          font-weight: 950;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          cursor: pointer;
        }

        .callBtn {
          border: 0;
          background: #10b981;
          color: white;
          box-shadow: 0 14px 28px rgba(16, 185, 129, 0.22);
        }

        .startBtn {
          border: 1px solid #dbeafe;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .resultPanel {
          border-top: 1px solid #e2e8f0;
          padding-top: 14px;
          display: grid;
          gap: 12px;
        }

        .resultButtons {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .resultButtons button {
          min-height: 42px;
          border: 1px solid transparent;
          border-radius: 14px;
          font-weight: 950;
          cursor: pointer;
          padding: 8px 10px;
        }

        .resultButtons button.selected {
          outline: 3px solid rgba(37, 99, 235, 0.18);
          border-color: #2563eb;
          box-shadow: 0 10px 22px rgba(37, 99, 235, 0.1);
        }

        .resultHelp {
          background: #f8fafc;
          border: 1px solid #eef2f7;
          color: #475569;
          border-radius: 14px;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 900;
          line-height: 1.5;
        }

        .field {
          display: grid;
          gap: 7px;
        }

        .saveBtn {
          width: 100%;
          border: 0;
          background: #2563eb;
          color: white;
          box-shadow: 0 14px 30px rgba(37, 99, 235, 0.2);
        }

        @media (max-width: 1200px) {
          .statsGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .filtersCard {
            grid-template-columns: 1fr 1fr;
          }

          .searchForm {
            grid-column: 1 / -1;
          }

          .workspace {
            grid-template-columns: 1fr;
          }

          .callPanel {
            position: static;
          }

          .queueRows {
            max-height: 520px;
            min-height: 360px;
          }
        }

        @media (max-width: 760px) {
          .callCenterPage {
            padding: 16px;
          }

          .topBar,
          .hero {
            flex-direction: column;
            align-items: stretch;
          }

          .topActions,
          .mainActions {
            grid-template-columns: 1fr;
            display: grid;
          }

          .heroMeta {
            min-width: 0;
          }

          .statsGrid,
          .filtersCard,
          .employeeStrip,
          .detailsGrid,
          .resultButtons {
            grid-template-columns: 1fr;
          }

          .searchForm div {
            flex-direction: column;
          }

          .searchForm button {
            width: 100%;
          }

          .queueHead {
            display: none;
          }

          .queueRow {
            grid-template-columns: 1fr;
            gap: 6px;
            align-items: start;
            padding: 12px 14px;
          }

          .queueRow span {
            width: 100%;
          }

          .callPanelTop {
            flex-direction: column;
          }

          .attemptBox {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}