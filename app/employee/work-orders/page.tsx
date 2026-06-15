"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/* ============================================================
   Types
============================================================ */

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

  createdAt: string | null;
  updatedAt: string | null;
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
};

type ApiResponse = {
  success: boolean;
  error?: string;
  employee?: EmployeeInfo;
  count?: number;
  summary?: Summary;
  workOrders?: WorkOrder[];
  activeWorkOrders?: WorkOrder[];
  completedWorkOrders?: WorkOrder[];
};

/* ============================================================
   Helpers
============================================================ */

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getTodayKey() {
  const now = new Date();

  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(
    now.getDate()
  )}`;
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
    scheduled: "מתוזמנת",
    open: "פתוחה",
    in_progress: "בטיפול",
    completed: "הושלמה",
    cancelled: "בוטלה",
    paused: "מוקפאת",
  };

  return map[status] || status || "—";
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

function safeNumber(value: unknown) {
  const n = Number(value || 0);

  return Number.isFinite(n) ? n : 0;
}

/* ============================================================
   Page
============================================================ */

export default function EmployeeWorkOrdersPage() {
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  const [date, setDate] = useState(getTodayKey());
  const [showAllDates, setShowAllDates] = useState(false);
  const [status, setStatus] = useState("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const activeOrders = useMemo(() => {
    return workOrders.filter((order) => safeNumber(order.myTasksRemaining) > 0);
  }, [workOrders]);

  const completedOrders = useMemo(() => {
    return workOrders.filter(
      (order) =>
        safeNumber(order.myTasksTotal) > 0 &&
        safeNumber(order.myTasksRemaining) <= 0
    );
  }, [workOrders]);

  async function loadWorkOrders(options?: { silent?: boolean }) {
    try {
      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const params = new URLSearchParams();

      params.set("limit", "200");

      if (showAllDates) {
        params.set("all", "1");
      } else {
        params.set("date", date || getTodayKey());
      }

      if (status && status !== "all") {
        params.set("status", status);
      }

      const res = await fetch(`/api/employee/work-orders?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const data = (await res.json().catch(() => ({}))) as ApiResponse;

      if (!res.ok || !data.success) {
        throw new Error(data.error || "שגיאה בטעינת הוראות העבודה");
      }

      setEmployee(data.employee || null);
      setSummary(data.summary || null);
      setWorkOrders(Array.isArray(data.workOrders) ? data.workOrders : []);
    } catch (err: any) {
      setError(err?.message || "שגיאה בטעינת הוראות העבודה");
      setWorkOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadWorkOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, showAllDates, status]);

  return (
    <main className="workOrdersPage" dir="rtl">
      <section className="hero">
        <div>
          <p className="eyebrow">אזור עובד</p>
          <h1>הוראות עבודה</h1>
          <p className="subtitle">
            כאן מופיעות רק הוראות העבודה והשיחות שהוקצו אלייך.
          </p>
        </div>

        <button
          type="button"
          className="refreshBtn"
          disabled={refreshing || loading}
          onClick={() => loadWorkOrders({ silent: true })}
        >
          {refreshing ? "מרענן..." : "רענון"}
        </button>
      </section>

      <section className="filtersCard">
        <div className="filterGroup">
          <label>תאריך</label>
          <input
            type="date"
            value={date}
            disabled={showAllDates}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="filterGroup">
          <label>סטטוס משימות</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">הכל</option>
            <option value="open">פתוחות בלבד</option>
            <option value="done">טופלו בלבד</option>
            <option value="pending">ממתין</option>
            <option value="in_progress">בטיפול</option>
            <option value="confirmed">אישרו הגעה</option>
            <option value="declined">לא מגיעים</option>
            <option value="no_answer">לא ענו</option>
            <option value="callback">לחזור אליהם</option>
            <option value="wrong_number">מספר שגוי</option>
          </select>
        </div>

        <label className="checkboxLine">
          <input
            type="checkbox"
            checked={showAllDates}
            onChange={(e) => setShowAllDates(e.target.checked)}
          />
          הצג את כל התאריכים
        </label>
      </section>

      {employee && (
        <section className="employeeCard">
          <div>
            <span className="smallLabel">עובד מחובר</span>
            <strong>{employee.name || employee.email || "עובד"}</strong>
          </div>

          <div>
            <span className="smallLabel">מייל</span>
            <strong>{employee.email || "—"}</strong>
          </div>
        </section>
      )}

      {summary && (
        <section className="summaryGrid">
          <div className="summaryBox">
            <span>סה״כ שיחות שלי</span>
            <strong>{safeNumber(summary.total)}</strong>
          </div>

          <div className="summaryBox">
            <span>נותרו</span>
            <strong>{safeNumber(summary.remaining)}</strong>
          </div>

          <div className="summaryBox">
            <span>טופלו</span>
            <strong>{safeNumber(summary.completedLogical)}</strong>
          </div>

          <div className="summaryBox">
            <span>לא ענו</span>
            <strong>{safeNumber(summary.no_answer)}</strong>
          </div>
        </section>
      )}

      {error && <div className="errorBox">{error}</div>}

      {loading ? (
        <section className="loadingCard">
          <div className="spinner" />
          <p>טוען הוראות עבודה...</p>
        </section>
      ) : workOrders.length === 0 ? (
        <section className="emptyCard">
          <h2>אין הוראות עבודה להצגה</h2>
          <p>
            אם אמורות להיות הוראות עבודה להיום, בדקי שיש עובדים משובצים
            במשמרת ושנפתחו הוראות עבודה אוטומטית.
          </p>
        </section>
      ) : (
        <>
          <section className="sectionHeader">
            <div>
              <h2>הוראות פעילות</h2>
              <p>{activeOrders.length} הוראות עם שיחות שעדיין נותרו לטיפול</p>
            </div>
          </section>

          <section className="ordersGrid">
            {activeOrders.map((order) => (
              <WorkOrderCard key={order.id} order={order} />
            ))}
          </section>

          {completedOrders.length > 0 && (
            <>
              <section className="sectionHeader completedHeader">
                <div>
                  <h2>הוראות שהושלמו</h2>
                  <p>{completedOrders.length} הוראות שטופלו</p>
                </div>
              </section>

              <section className="ordersGrid muted">
                {completedOrders.map((order) => (
                  <WorkOrderCard key={order.id} order={order} completed />
                ))}
              </section>
            </>
          )}
        </>
      )}

      <style>{`
        .workOrdersPage {
          min-height: 100vh;
          background:
            radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 28%),
            linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
          padding: 28px;
          color: #0f172a;
        }

        .hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .eyebrow {
          margin: 0 0 6px;
          color: #2563eb;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        h1 {
          margin: 0;
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .subtitle {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 15px;
        }

        .refreshBtn {
          border: 0;
          border-radius: 16px;
          background: #0f172a;
          color: white;
          padding: 13px 18px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.18);
          white-space: nowrap;
        }

        .refreshBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .filtersCard,
        .employeeCard,
        .loadingCard,
        .emptyCard {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 24px;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
        }

        .filtersCard {
          display: flex;
          align-items: end;
          gap: 14px;
          flex-wrap: wrap;
          padding: 16px;
          margin-bottom: 16px;
        }

        .filterGroup {
          display: grid;
          gap: 7px;
          min-width: 190px;
        }

        .filterGroup label,
        .smallLabel {
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        input,
        select {
          height: 44px;
          border: 1px solid #dbe3ef;
          background: #fff;
          color: #0f172a;
          border-radius: 14px;
          padding: 0 12px;
          font-weight: 700;
          outline: none;
        }

        input:focus,
        select:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
        }

        .checkboxLine {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 44px;
          font-weight: 800;
          color: #334155;
        }

        .checkboxLine input {
          width: 18px;
          height: 18px;
        }

        .employeeCard {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          padding: 16px;
          margin-bottom: 16px;
        }

        .employeeCard div {
          display: grid;
          gap: 4px;
        }

        .employeeCard strong {
          font-size: 15px;
        }

        .summaryGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .summaryBox {
          background: #fff;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 22px;
          padding: 18px;
          box-shadow: 0 14px 38px rgba(15, 23, 42, 0.07);
        }

        .summaryBox span {
          display: block;
          color: #64748b;
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 7px;
        }

        .summaryBox strong {
          display: block;
          font-size: 30px;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .sectionHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 22px 0 12px;
        }

        .sectionHeader h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 950;
        }

        .sectionHeader p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 14px;
          font-weight: 700;
        }

        .completedHeader {
          margin-top: 34px;
        }

        .ordersGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .ordersGrid.muted {
          opacity: 0.82;
        }

        .errorBox {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #be123c;
          border-radius: 18px;
          padding: 14px 16px;
          font-weight: 900;
          margin-bottom: 16px;
        }

        .loadingCard,
        .emptyCard {
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
          font-weight: 700;
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

        @media (max-width: 1100px) {
          .ordersGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .summaryGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .workOrdersPage {
            padding: 18px;
          }

          .hero {
            align-items: stretch;
            flex-direction: column;
          }

          .refreshBtn {
            width: 100%;
          }

          .filtersCard {
            align-items: stretch;
            flex-direction: column;
          }

          .filterGroup {
            min-width: 100%;
          }

          .ordersGrid {
            grid-template-columns: 1fr;
          }

          .summaryGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

/* ============================================================
   Card
============================================================ */

function WorkOrderCard({
  order,
  completed = false,
}: {
  order: WorkOrder;
  completed?: boolean;
}) {
  const total = safeNumber(order.myTasksTotal);
  const completedCount = safeNumber(order.myTasksCompleted);
  const remaining = safeNumber(order.myTasksRemaining);
  const progress = Math.min(100, Math.max(0, safeNumber(order.myProgressPercent)));

  return (
    <article className="orderCard">
      <div className="cardTop">
        <div>
          <span className="roundBadge">{getRoundLabel(order.round)}</span>
          <h3>{order.clientName || order.clientEmail || "לקוח"}</h3>
          <p>{order.eventName || "אירוע"}</p>
        </div>

        <span className={`statusBadge ${completed ? "done" : ""}`}>
          {completed ? "הושלם" : getStatusLabel(order.status)}
        </span>
      </div>

      <div className="metaGrid">
        <div>
          <span>מייל לקוחה</span>
          <strong>{order.clientEmail || "—"}</strong>
        </div>

        <div>
          <span>תאריך עבודה</span>
          <strong>{formatDate(order.workDate)}</strong>
        </div>

        <div>
          <span>סוג רשומות</span>
          <strong>{getAudienceLabel(order.sourceAudience)}</strong>
        </div>

        <div>
          <span>מועד סבב שהוגדר</span>
          <strong>{formatDateTime(order.configuredRoundAt)}</strong>
        </div>
      </div>

      <div className="progressWrap">
        <div className="progressText">
          <span>התקדמות שלי</span>
          <strong>{progress}%</strong>
        </div>

        <div className="progressBar">
          <div style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="statsRow">
        <div>
          <span>סה״כ</span>
          <strong>{total}</strong>
        </div>

        <div>
          <span>טופלו</span>
          <strong>{completedCount}</strong>
        </div>

        <div>
          <span>נותרו</span>
          <strong>{remaining}</strong>
        </div>
      </div>

      <div className="miniStats">
        <span>אישרו: {safeNumber(order.myConfirmedTasks)}</span>
        <span>לא מגיעים: {safeNumber(order.myDeclinedTasks)}</span>
        <span>לא ענו: {safeNumber(order.myNoAnswerTasks)}</span>
        <span>לחזור: {safeNumber(order.myCallbackTasks)}</span>
      </div>

      <Link className="openLink" href={`/employee/work-orders/${order.id}`}>
        {completed ? "צפייה בשיחות" : "כניסה לרשימת השיחות"}
      </Link>

      <style>{`
        .orderCard {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 26px;
          padding: 18px;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.09);
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 100%;
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          align-items: start;
          gap: 12px;
        }

        .roundBadge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          background: #dbeafe;
          color: #1d4ed8;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 950;
          margin-bottom: 10px;
        }

        h3 {
          margin: 0;
          font-size: 21px;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 14px;
          font-weight: 700;
        }

        .statusBadge {
          white-space: nowrap;
          border-radius: 999px;
          background: #ecfeff;
          color: #0e7490;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 950;
        }

        .statusBadge.done {
          background: #dcfce7;
          color: #15803d;
        }

        .metaGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .metaGrid div {
          background: #f8fafc;
          border: 1px solid #eef2f7;
          border-radius: 16px;
          padding: 11px;
          min-width: 0;
        }

        .metaGrid span,
        .statsRow span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
          margin-bottom: 4px;
        }

        .metaGrid strong {
          display: block;
          font-size: 13px;
          font-weight: 900;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .progressWrap {
          display: grid;
          gap: 8px;
        }

        .progressText {
          display: flex;
          justify-content: space-between;
          color: #334155;
          font-size: 13px;
          font-weight: 900;
        }

        .progressBar {
          height: 10px;
          border-radius: 999px;
          overflow: hidden;
          background: #e2e8f0;
        }

        .progressBar div {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #2563eb, #06b6d4);
        }

        .statsRow {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .statsRow div {
          background: #0f172a;
          color: #fff;
          border-radius: 18px;
          padding: 12px;
          text-align: center;
        }

        .statsRow span {
          color: #cbd5e1;
        }

        .statsRow strong {
          font-size: 24px;
          font-weight: 950;
        }

        .miniStats {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .miniStats span {
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #475569;
          border-radius: 999px;
          padding: 7px 9px;
          font-size: 12px;
          font-weight: 900;
        }

        .openLink {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 46px;
          border-radius: 16px;
          background: #2563eb;
          color: white;
          text-decoration: none;
          font-weight: 950;
          box-shadow: 0 14px 30px rgba(37, 99, 235, 0.22);
          margin-top: auto;
        }

        @media (max-width: 720px) {
          .metaGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </article>
  );
}