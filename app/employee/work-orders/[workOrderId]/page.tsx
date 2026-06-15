"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
    confirmed: "אישר הגעה",
    declined: "לא מגיע",
    no_answer: "לא ענה",
    callback: "לחזור אליו",
    wrong_number: "מספר שגוי",
    completed: "הושלם",
    cancelled: "בוטל",

    scheduled: "מתוזמן",
    open: "פתוח",
    paused: "מוקפא",
  };

  return map[status] || status || "—";
}

function getStatusClass(status: string) {
  if (status === "confirmed") return "good";
  if (status === "declined") return "bad";
  if (status === "no_answer") return "warn";
  if (status === "callback") return "info";
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
    pending_rsvp: "כל הממתינים",
    round_1_no_answer: "לא ענו בסבב 1",
    round_2_no_answer: "לא ענו בסבב 2",
  };

  return map[sourceAudience] || sourceAudience || "—";
}

function normalizePhone(phone: string) {
  return cleanText(phone).replace(/[^\d+]/g, "");
}

function getActionTitle(status: TaskStatus) {
  const map: Record<TaskStatus, string> = {
    pending: "החזרה לממתין",
    in_progress: "התחלת טיפול",
    confirmed: "סימון אישר הגעה",
    declined: "סימון לא מגיע",
    no_answer: "סימון לא ענה",
    callback: "סימון לחזור אליו",
    wrong_number: "סימון מספר שגוי",
    completed: "סימון הושלם",
    cancelled: "ביטול משימה",
  };

  return map[status] || "עדכון סטטוס";
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
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [tasks, setTasks] = useState<CallTask[]>([]);

  const [status, setStatus] = useState("open");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [modalTask, setModalTask] = useState<CallTask | null>(null);
  const [modalStatus, setModalStatus] = useState<TaskStatus | "">("");
  const [modalNote, setModalNote] = useState("");
  const [modalCount, setModalCount] = useState("1");

  const progress = summary
    ? Math.min(100, Math.max(0, safeNumber(summary.progressPercent)))
    : workOrder
      ? Math.min(100, Math.max(0, safeNumber(workOrder.myProgressPercent)))
      : 0;

  async function loadTasks(options?: { silent?: boolean; nextPage?: number }) {
    if (!workOrderId) return;

    try {
      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const requestedPage = options?.nextPage || page;

      const query = new URLSearchParams();
      query.set("page", String(requestedPage));
      query.set("limit", "120");

      if (status && status !== "all") {
        query.set("status", status);
      }

      if (search.trim()) {
        query.set("q", search.trim());
      }

      if (sort && sort !== "default") {
        query.set("sort", sort);
      }

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

      setEmployee(data.employee || null);
      setWorkOrder(data.workOrder || null);
      setSummary(data.summary || null);
      setPagination(data.pagination || null);
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (err: any) {
      setError(err?.message || "שגיאה בטעינת רשימת השיחות");
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId, page, status, sort]);

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
    loadTasks({ silent: true, nextPage: 1 });
  }

  function openUpdateModal(task: CallTask, nextStatus: TaskStatus) {
    setModalTask(task);
    setModalStatus(nextStatus);
    setModalNote(task.note || "");

    const existingCount =
      typeof task.attendingCount === "number" && task.attendingCount > 0
        ? task.attendingCount
        : 1;

    setModalCount(String(existingCount));
  }

  function closeModal() {
    if (updatingTaskId) return;

    setModalTask(null);
    setModalStatus("");
    setModalNote("");
    setModalCount("1");
  }

  async function updateTaskStatus(input: {
    task: CallTask;
    status: TaskStatus;
    note?: string;
    attendingCount?: number;
  }) {
    try {
      setUpdatingTaskId(input.task.id);
      setError("");
      setSuccessMsg("");

      const body: Record<string, any> = {
        status: input.status,
      };

      if (input.note !== undefined) {
        body.note = input.note;
      }

      if (input.attendingCount !== undefined) {
        body.attendingCount = input.attendingCount;
      }

      const res = await fetch(
        `/api/employee/call-tasks/${encodeURIComponent(
          input.task.id
        )}/status`,
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

      setSuccessMsg(data.message || "השיחה עודכנה בהצלחה");

      if (data.workOrder) {
        setWorkOrder(data.workOrder);
      }

      closeModal();

      await loadTasks({ silent: true });
    } catch (err: any) {
      setError(err?.message || "שגיאה בעדכון השיחה");
    } finally {
      setUpdatingTaskId("");
    }
  }

  async function submitModalUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!modalTask || !modalStatus) return;

    const payload: {
      task: CallTask;
      status: TaskStatus;
      note?: string;
      attendingCount?: number;
    } = {
      task: modalTask,
      status: modalStatus,
      note: modalNote,
    };

    if (modalStatus === "confirmed") {
      const count = Math.max(1, Number(modalCount || 1));
      payload.attendingCount = Number.isFinite(count) ? count : 1;
    }

    await updateTaskStatus(payload);
  }

  async function startTask(task: CallTask) {
    await updateTaskStatus({
      task,
      status: "in_progress",
      note: task.note || "",
    });
  }

  return (
    <main className="ewoTasksPage" dir="rtl">
      <section className="ewoTopBar">
        <Link href="/employee/work-orders" className="ewoBackLink">
          ← חזרה להוראות עבודה
        </Link>

        <button
          type="button"
          className="ewoRefreshBtn"
          disabled={refreshing || loading}
          onClick={() => loadTasks({ silent: true })}
        >
          {refreshing ? "מרענן..." : "רענון"}
        </button>
      </section>

      <section className="ewoHero">
        <div>
          <p className="ewoEyebrow">רשימת שיחות</p>
          <h1>
            {workOrder?.clientName ||
              workOrder?.clientEmail ||
              "הוראת עבודה"}
          </h1>

          <p className="ewoSubtitle">
            {workOrder
              ? `${getRoundLabel(workOrder.round)} · ${getAudienceLabel(
                  workOrder.sourceAudience
                )}`
              : "כאן מופיעות רק השיחות שהוקצו לעובד המחובר."}
          </p>
        </div>

        <div className="ewoHeroMeta">
          <span>{workOrder?.eventName || "אירוע"}</span>
          <strong>{formatDate(workOrder?.workDate)}</strong>
        </div>
      </section>

      {employee && (
        <section className="ewoEmployeeCard">
          <div>
            <span>עובד מחובר</span>
            <strong>{employee.name || employee.email || "עובד"}</strong>
          </div>

          <div>
            <span>מייל</span>
            <strong>{employee.email || "—"}</strong>
          </div>

          <div>
            <span>לקוחה</span>
            <strong>{workOrder?.clientEmail || "—"}</strong>
          </div>

          <div>
            <span>מועד סבב</span>
            <strong>{formatDateTime(workOrder?.configuredRoundAt)}</strong>
          </div>
        </section>
      )}

      {summary && (
        <section className="ewoSummaryGrid">
          <div className="ewoSummaryBox">
            <span>סה״כ שיחות שלי</span>
            <strong>{safeNumber(summary.total)}</strong>
          </div>

          <div className="ewoSummaryBox">
            <span>נותרו</span>
            <strong>{safeNumber(summary.remaining)}</strong>
          </div>

          <div className="ewoSummaryBox">
            <span>טופלו</span>
            <strong>{safeNumber(summary.completedLogical)}</strong>
          </div>

          <div className="ewoSummaryBox">
            <span>התקדמות</span>
            <strong>{progress}%</strong>
          </div>
        </section>
      )}

      <section className="ewoProgressCard">
        <div className="ewoProgressText">
          <span>התקדמות טיפול</span>
          <strong>{progress}%</strong>
        </div>

        <div className="ewoProgressBar">
          <div style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="ewoFiltersCard">
        <form onSubmit={handleSearchSubmit} className="ewoSearchForm">
          <label>חיפוש</label>

          <div>
            <input
              type="search"
              value={search}
              placeholder="שם אורח, טלפון, קבוצה, שולחן..."
              onChange={(e) => setSearch(e.target.value)}
            />

            <button type="submit">חפש</button>
          </div>
        </form>

        <div className="ewoFilterGroup">
          <label>סטטוס</label>

          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="all">הכל</option>
            <option value="open">פתוחות בלבד</option>
            <option value="done">טופלו בלבד</option>
            <option value="pending">ממתין</option>
            <option value="in_progress">בטיפול</option>
            <option value="confirmed">אישר הגעה</option>
            <option value="declined">לא מגיע</option>
            <option value="no_answer">לא ענה</option>
            <option value="callback">לחזור אליו</option>
            <option value="wrong_number">מספר שגוי</option>
          </select>
        </div>

        <div className="ewoFilterGroup">
          <label>מיון</label>

          <select
            value={sort}
            onChange={(e) => {
              setPage(1);
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

      {error && <div className="ewoErrorBox">{error}</div>}
      {successMsg && <div className="ewoSuccessBox">{successMsg}</div>}

      {loading ? (
        <section className="ewoLoadingCard">
          <div className="ewoSpinner" />
          <p>טוען שיחות...</p>
        </section>
      ) : tasks.length === 0 ? (
        <section className="ewoEmptyCard">
          <h2>אין שיחות להצגה</h2>
          <p>אפשר לשנות סינון או לחזור להוראות העבודה.</p>
        </section>
      ) : (
        <section className="ewoTasksGrid">
          {tasks.map((task) => {
            const tel = normalizePhone(task.guestPhone);
            const isUpdating = updatingTaskId === task.id;

            return (
              <article key={task.id} className="ewoTaskCard">
                <div className="ewoTaskTop">
                  <div>
                    <span
                      className={`ewoStatusBadge ${getStatusClass(
                        String(task.status)
                      )}`}
                    >
                      {getStatusLabel(String(task.status))}
                    </span>

                    <h2>{task.guestName || "אורח ללא שם"}</h2>

                    <p>{task.guestPhone || "אין טלפון"}</p>
                  </div>

                  <div className="ewoAttempts">
                    <span>ניסיונות</span>
                    <strong>{safeNumber(task.attemptsCount)}</strong>
                  </div>
                </div>

                <div className="ewoTaskMeta">
                  <div>
                    <span>קבוצה</span>
                    <strong>{task.guestGroup || "—"}</strong>
                  </div>

                  <div>
                    <span>צד</span>
                    <strong>{task.guestSide || "—"}</strong>
                  </div>

                  <div>
                    <span>שולחן</span>
                    <strong>{task.guestTable || "—"}</strong>
                  </div>

                  <div>
                    <span>עודכן</span>
                    <strong>{formatDateTime(task.lastAttemptAt)}</strong>
                  </div>
                </div>

                {task.guestNotes && (
                  <div className="ewoGuestNote">
                    <span>הערת אורח</span>
                    <p>{task.guestNotes}</p>
                  </div>
                )}

                {task.note && (
                  <div className="ewoWorkerNote">
                    <span>הערת עובד</span>
                    <p>{task.note}</p>
                  </div>
                )}

                <div className="ewoCallActions">
                  {tel ? (
                    <a href={`tel:${tel}`} className="ewoCallBtn">
                      התקשר
                    </a>
                  ) : (
                    <button type="button" className="ewoCallBtn" disabled>
                      אין טלפון
                    </button>
                  )}

                  <button
                    type="button"
                    className="ewoSecondaryBtn"
                    disabled={isUpdating || !task.canUpdate}
                    onClick={() => startTask(task)}
                  >
                    התחל טיפול
                  </button>
                </div>

                <div className="ewoResultActions">
                  <button
                    type="button"
                    className="good"
                    disabled={isUpdating || !task.canUpdate}
                    onClick={() => openUpdateModal(task, "confirmed")}
                  >
                    אישר
                  </button>

                  <button
                    type="button"
                    className="bad"
                    disabled={isUpdating || !task.canUpdate}
                    onClick={() => openUpdateModal(task, "declined")}
                  >
                    לא מגיע
                  </button>

                  <button
                    type="button"
                    className="warn"
                    disabled={isUpdating || !task.canUpdate}
                    onClick={() => openUpdateModal(task, "no_answer")}
                  >
                    לא ענה
                  </button>

                  <button
                    type="button"
                    className="info"
                    disabled={isUpdating || !task.canUpdate}
                    onClick={() => openUpdateModal(task, "callback")}
                  >
                    לחזור אליו
                  </button>

                  <button
                    type="button"
                    className="danger"
                    disabled={isUpdating || !task.canUpdate}
                    onClick={() => openUpdateModal(task, "wrong_number")}
                  >
                    מספר שגוי
                  </button>
                </div>

                {isUpdating && <div className="ewoUpdating">מעדכן...</div>}
              </article>
            );
          })}
        </section>
      )}

      {pagination && pagination.totalPages > 1 && (
        <section className="ewoPagination">
          <button
            type="button"
            disabled={!pagination.hasPrevPage || loading}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            הקודם
          </button>

          <span>
            עמוד {pagination.page} מתוך {pagination.totalPages}
          </span>

          <button
            type="button"
            disabled={!pagination.hasNextPage || loading}
            onClick={() =>
              setPage((prev) =>
                Math.min(pagination.totalPages || prev + 1, prev + 1)
              )
            }
          >
            הבא
          </button>
        </section>
      )}

      {modalTask && modalStatus && (
        <div className="ewoModalOverlay" role="dialog" aria-modal="true">
          <form className="ewoModal" onSubmit={submitModalUpdate}>
            <div className="ewoModalTop">
              <div>
                <span>{getActionTitle(modalStatus)}</span>
                <h2>{modalTask.guestName || "אורח"}</h2>
                <p>{modalTask.guestPhone || "—"}</p>
              </div>

              <button type="button" onClick={closeModal}>
                ×
              </button>
            </div>

            {modalStatus === "confirmed" && (
              <div className="ewoModalField">
                <label>כמה מגיעים?</label>
                <input
                  type="number"
                  min={1}
                  value={modalCount}
                  onChange={(e) => setModalCount(e.target.value)}
                />
              </div>
            )}

            <div className="ewoModalField">
              <label>הערה</label>
              <textarea
                value={modalNote}
                placeholder="לדוגמה: ביקש לחזור בערב / אישר עם בת זוג / מספר לא תקין..."
                onChange={(e) => setModalNote(e.target.value)}
              />
            </div>

            <div className="ewoModalActions">
              <button
                type="button"
                className="ewoCancelModal"
                disabled={Boolean(updatingTaskId)}
                onClick={closeModal}
              >
                ביטול
              </button>

              <button
                type="submit"
                className="ewoSaveModal"
                disabled={Boolean(updatingTaskId)}
              >
                {updatingTaskId ? "שומר..." : "שמור סטטוס"}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .ewoTasksPage {
          min-height: 100vh;
          background:
            radial-gradient(circle at top right, rgba(37, 99, 235, 0.13), transparent 28%),
            linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
          padding: 28px;
          color: #0f172a;
        }

        .ewoTopBar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .ewoBackLink,
        .ewoRefreshBtn {
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 0 16px;
          font-weight: 950;
          text-decoration: none;
        }

        .ewoBackLink {
          background: white;
          color: #2563eb;
          border: 1px solid #dbeafe;
        }

        .ewoRefreshBtn {
          border: 0;
          color: white;
          background: #0f172a;
          cursor: pointer;
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.16);
        }

        .ewoRefreshBtn:disabled,
        button:disabled {
          opacity: 0.58;
          cursor: not-allowed;
        }

        .ewoHero {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 18px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 30px;
          padding: 26px;
          box-shadow: 0 18px 54px rgba(15, 23, 42, 0.08);
          margin-bottom: 16px;
        }

        .ewoEyebrow {
          margin: 0 0 6px;
          color: #2563eb;
          font-size: 13px;
          font-weight: 900;
        }

        .ewoHero h1 {
          margin: 0;
          font-size: clamp(30px, 4vw, 46px);
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .ewoSubtitle {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 15px;
          font-weight: 800;
        }

        .ewoHeroMeta {
          background: #eff6ff;
          border: 1px solid #dbeafe;
          border-radius: 20px;
          padding: 14px 16px;
          min-width: 210px;
        }

        .ewoHeroMeta span {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .ewoHeroMeta strong {
          display: block;
          font-size: 17px;
          font-weight: 950;
        }

        .ewoEmployeeCard,
        .ewoProgressCard,
        .ewoFiltersCard,
        .ewoLoadingCard,
        .ewoEmptyCard {
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 24px;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.07);
        }

        .ewoEmployeeCard {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .ewoEmployeeCard div {
          background: #f8fafc;
          border: 1px solid #eef2f7;
          border-radius: 16px;
          padding: 12px;
          min-width: 0;
        }

        .ewoEmployeeCard span,
        .ewoTaskMeta span,
        .ewoGuestNote span,
        .ewoWorkerNote span {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .ewoEmployeeCard strong,
        .ewoTaskMeta strong {
          display: block;
          font-size: 14px;
          font-weight: 950;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .ewoSummaryGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 16px;
        }

        .ewoSummaryBox {
          background: white;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 22px;
          padding: 18px;
          box-shadow: 0 14px 40px rgba(15, 23, 42, 0.07);
        }

        .ewoSummaryBox span {
          display: block;
          color: #64748b;
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 7px;
        }

        .ewoSummaryBox strong {
          display: block;
          font-size: 31px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .ewoProgressCard {
          padding: 16px;
          margin-bottom: 16px;
        }

        .ewoProgressText {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #334155;
          font-weight: 950;
          margin-bottom: 9px;
        }

        .ewoProgressBar {
          height: 12px;
          border-radius: 999px;
          background: #e2e8f0;
          overflow: hidden;
        }

        .ewoProgressBar div {
          height: 100%;
          background: linear-gradient(90deg, #2563eb, #06b6d4);
          border-radius: 999px;
        }

        .ewoFiltersCard {
          display: grid;
          grid-template-columns: 1fr 220px 220px;
          gap: 14px;
          padding: 16px;
          margin-bottom: 16px;
          align-items: end;
        }

        .ewoSearchForm,
        .ewoFilterGroup {
          display: grid;
          gap: 7px;
        }

        .ewoSearchForm label,
        .ewoFilterGroup label,
        .ewoModalField label {
          color: #64748b;
          font-size: 12px;
          font-weight: 950;
        }

        .ewoSearchForm div {
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
          font-weight: 800;
          outline: none;
        }

        input,
        select {
          height: 44px;
        }

        textarea {
          min-height: 104px;
          padding: 12px;
          resize: vertical;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
        }

        .ewoSearchForm input {
          flex: 1;
          min-width: 0;
        }

        .ewoSearchForm button {
          height: 44px;
          border: 0;
          border-radius: 14px;
          background: #2563eb;
          color: white;
          padding: 0 16px;
          font-weight: 950;
          cursor: pointer;
        }

        .ewoErrorBox,
        .ewoSuccessBox {
          border-radius: 18px;
          padding: 14px 16px;
          font-weight: 950;
          margin-bottom: 16px;
        }

        .ewoErrorBox {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #be123c;
        }

        .ewoSuccessBox {
          background: #ecfdf5;
          border: 1px solid #bbf7d0;
          color: #15803d;
        }

        .ewoLoadingCard,
        .ewoEmptyCard {
          padding: 34px;
          text-align: center;
        }

        .ewoEmptyCard h2 {
          margin: 0 0 8px;
          font-size: 22px;
          font-weight: 950;
        }

        .ewoEmptyCard p,
        .ewoLoadingCard p {
          margin: 0;
          color: #64748b;
          font-weight: 800;
        }

        .ewoSpinner {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 4px solid #dbeafe;
          border-top-color: #2563eb;
          margin: 0 auto 12px;
          animation: ewoSpin 0.8s linear infinite;
        }

        @keyframes ewoSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .ewoTasksGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .ewoTaskCard {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 26px;
          padding: 18px;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
          display: flex;
          flex-direction: column;
          gap: 14px;
          position: relative;
        }

        .ewoTaskTop {
          display: flex;
          justify-content: space-between;
          align-items: start;
          gap: 12px;
        }

        .ewoStatusBadge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 950;
          margin-bottom: 10px;
        }

        .ewoStatusBadge.pending {
          background: #f1f5f9;
          color: #475569;
        }

        .ewoStatusBadge.active {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .ewoStatusBadge.good {
          background: #dcfce7;
          color: #15803d;
        }

        .ewoStatusBadge.bad {
          background: #fee2e2;
          color: #b91c1c;
        }

        .ewoStatusBadge.warn {
          background: #fef3c7;
          color: #b45309;
        }

        .ewoStatusBadge.info {
          background: #cffafe;
          color: #0e7490;
        }

        .ewoStatusBadge.danger {
          background: #ffe4e6;
          color: #be123c;
        }

        .ewoStatusBadge.muted {
          background: #e2e8f0;
          color: #64748b;
        }

        .ewoTaskTop h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .ewoTaskTop p {
          margin: 5px 0 0;
          color: #475569;
          font-size: 15px;
          font-weight: 900;
          direction: ltr;
          text-align: right;
        }

        .ewoAttempts {
          background: #f8fafc;
          border: 1px solid #eef2f7;
          border-radius: 16px;
          padding: 10px 12px;
          text-align: center;
          min-width: 74px;
        }

        .ewoAttempts span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
        }

        .ewoAttempts strong {
          display: block;
          font-size: 23px;
          font-weight: 950;
        }

        .ewoTaskMeta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .ewoTaskMeta div {
          background: #f8fafc;
          border: 1px solid #eef2f7;
          border-radius: 16px;
          padding: 11px;
          min-width: 0;
        }

        .ewoGuestNote,
        .ewoWorkerNote {
          border-radius: 16px;
          padding: 12px;
        }

        .ewoGuestNote {
          background: #fff7ed;
          border: 1px solid #fed7aa;
        }

        .ewoWorkerNote {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
        }

        .ewoGuestNote p,
        .ewoWorkerNote p {
          margin: 0;
          color: #334155;
          font-size: 14px;
          font-weight: 800;
          line-height: 1.55;
        }

        .ewoCallActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .ewoCallBtn,
        .ewoSecondaryBtn {
          height: 44px;
          border-radius: 14px;
          font-weight: 950;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }

        .ewoCallBtn {
          border: 0;
          background: #10b981;
          color: white;
          box-shadow: 0 12px 26px rgba(16, 185, 129, 0.22);
          cursor: pointer;
        }

        .ewoSecondaryBtn {
          border: 1px solid #dbeafe;
          background: #eff6ff;
          color: #1d4ed8;
          cursor: pointer;
        }

        .ewoResultActions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .ewoResultActions button {
          min-height: 42px;
          border: 0;
          border-radius: 14px;
          font-weight: 950;
          cursor: pointer;
          padding: 8px 10px;
        }

        .ewoResultActions .good {
          background: #dcfce7;
          color: #15803d;
        }

        .ewoResultActions .bad {
          background: #fee2e2;
          color: #b91c1c;
        }

        .ewoResultActions .warn {
          background: #fef3c7;
          color: #b45309;
        }

        .ewoResultActions .info {
          background: #cffafe;
          color: #0e7490;
        }

        .ewoResultActions .danger {
          background: #ffe4e6;
          color: #be123c;
          grid-column: 1 / -1;
        }

        .ewoUpdating {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.74);
          backdrop-filter: blur(3px);
          border-radius: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 950;
          color: #2563eb;
        }

        .ewoPagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 22px;
        }

        .ewoPagination button {
          height: 42px;
          border: 1px solid #dbeafe;
          background: white;
          color: #2563eb;
          border-radius: 999px;
          padding: 0 16px;
          font-weight: 950;
          cursor: pointer;
        }

        .ewoPagination span {
          color: #475569;
          font-weight: 950;
        }

        .ewoModalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.46);
          backdrop-filter: blur(6px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .ewoModal {
          width: min(520px, 100%);
          background: white;
          border-radius: 28px;
          padding: 20px;
          box-shadow: 0 30px 90px rgba(15, 23, 42, 0.28);
          display: grid;
          gap: 16px;
        }

        .ewoModalTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: start;
        }

        .ewoModalTop span {
          color: #2563eb;
          font-size: 13px;
          font-weight: 950;
        }

        .ewoModalTop h2 {
          margin: 5px 0 4px;
          font-size: 26px;
          font-weight: 950;
        }

        .ewoModalTop p {
          margin: 0;
          color: #64748b;
          font-weight: 900;
          direction: ltr;
          text-align: right;
        }

        .ewoModalTop button {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #0f172a;
          font-size: 26px;
          cursor: pointer;
        }

        .ewoModalField {
          display: grid;
          gap: 7px;
        }

        .ewoModalActions {
          display: flex;
          gap: 10px;
        }

        .ewoCancelModal,
        .ewoSaveModal {
          flex: 1;
          height: 46px;
          border-radius: 16px;
          font-weight: 950;
          cursor: pointer;
        }

        .ewoCancelModal {
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #334155;
        }

        .ewoSaveModal {
          border: 0;
          background: #2563eb;
          color: white;
          box-shadow: 0 14px 30px rgba(37, 99, 235, 0.2);
        }

        @media (max-width: 1180px) {
          .ewoTasksGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ewoEmployeeCard,
          .ewoSummaryGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ewoFiltersCard {
            grid-template-columns: 1fr 1fr;
          }

          .ewoSearchForm {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 760px) {
          .ewoTasksPage {
            padding: 18px;
          }

          .ewoTopBar,
          .ewoHero {
            flex-direction: column;
            align-items: stretch;
          }

          .ewoHeroMeta {
            min-width: 0;
          }

          .ewoEmployeeCard,
          .ewoSummaryGrid,
          .ewoFiltersCard,
          .ewoTasksGrid {
            grid-template-columns: 1fr;
          }

          .ewoSearchForm div,
          .ewoModalActions {
            flex-direction: column;
          }

          .ewoSearchForm button {
            width: 100%;
          }

          .ewoTaskMeta,
          .ewoCallActions,
          .ewoResultActions {
            grid-template-columns: 1fr;
          }

          .ewoResultActions .danger {
            grid-column: auto;
          }
        }
      `}</style>
    </main>
  );
}