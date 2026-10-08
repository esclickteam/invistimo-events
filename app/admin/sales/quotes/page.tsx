"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  AdminActionsItem,
  AdminActionsMenu,
  AdminButton,
  AdminFilterBar,
  AdminListPage,
  AdminLoadingState,
  AdminTableShell,
} from "@/app/components/admin/ui/AdminUI";

type QuoteRow = {
  _id: string;
  token: string;
  quoteNumber?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  eventName?: string;
  packageTitle?: string;
  status?: string;
  total?: number;
  convertedUserId?: string | null;
  createdAt?: string | null;
  expiresAt?: string | null;
};

function formatMoney(value?: number) {
  return `₪${Number(value || 0).toLocaleString("he-IL")}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("he-IL");
}

function statusLabel(status?: string) {
  const map: Record<string, string> = {
    draft: "טיוטה",
    sent: "נשלחה",
    viewed: "נצפתה",
    accepted: "אושרה",
    converted: "הומרה למשתמש",
    expired: "פגה",
  };
  return map[String(status || "").toLowerCase()] || status || "—";
}

function statusTone(status?: string) {
  const key = String(status || "").toLowerCase();
  if (key === "converted" || key === "accepted") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (key === "expired") return "bg-red-50 text-red-700";
  if (key === "viewed" || key === "sent") return "bg-blue-50 text-blue-700";
  return "bg-gray-100 text-gray-700";
}

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/sales/quotes?limit=150", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "טעינת הצעות נכשלה");
      }
      setQuotes(Array.isArray(data.quotes) ? data.quotes : []);
    } catch (err: any) {
      setError(err?.message || "טעינת הצעות נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createUserFromQuote(token: string) {
    const confirmed = confirm(
      "לפתוח משתמש מההצעה? הפרטים, החבילה, השירותים והמחירים יועברו אוטומטית. לא יבוצע חיוב אוטומטי."
    );
    if (!confirmed) return;

    try {
      setCreatingFor(token);
      const res = await fetch(
        `/api/employee/sales/documents/${encodeURIComponent(token)}/create-user`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        alert(data?.message || data?.error || "יצירת משתמש נכשלה");
        return;
      }
      alert(data.message || "המשתמש נוצר בהצלחה");
      window.location.href = data.redirectTo || "/admin/users";
    } catch {
      alert("יצירת משתמש נכשלה");
    } finally {
      setCreatingFor(null);
    }
  }

  const filtered = quotes.filter((quote) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [
      quote.quoteNumber,
      quote.fullName,
      quote.email,
      quote.phone,
      quote.eventName,
      quote.packageTitle,
      quote.status,
    ]
      .map((v) => String(v || "").toLowerCase())
      .some((v) => v.includes(q));
  });

  return (
    <AdminListPage>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-[var(--admin-muted)]">
          עריכת הצעה ופתיחת משתמש מההצעה — בלי למלא הכול פעמיים
        </p>
        <div className="flex flex-wrap gap-2">
          <AdminButton variant="secondary" size="sm" onClick={load}>
            <RefreshCw size={14} />
            רענון
          </AdminButton>
          <Link
            href="/admin/sales/new"
            className="inline-flex h-8 items-center rounded-[var(--admin-radius-sm)] bg-[var(--admin-brand)] px-3 text-xs font-bold text-white hover:bg-[var(--admin-brand-hover)]"
          >
            הצעה חדשה
          </Link>
        </div>
      </div>

      <AdminFilterBar>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי לקוח, אימייל, מספר הצעה…"
          className="admin-input h-10 min-w-0 flex-1"
        />
      </AdminFilterBar>

      {error ? (
        <div className="rounded-[var(--admin-radius)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <AdminLoadingState text="טוען הצעות…" />
      ) : (
        <AdminTableShell
          headers={[
            "מספר",
            "לקוח",
            "אימייל",
            "אירוע",
            "חבילה",
            "סכום",
            "סטטוס",
            "נוצר",
            "פעולות",
          ]}
          isEmpty={filtered.length === 0}
          empty={
            quotes.length === 0
              ? "אין הצעות מחיר עדיין."
              : "לא נמצאו הצעות התואמות לחיפוש."
          }
          minWidth={1100}
          footer={
            <>
              <span>
                מוצגות {filtered.length} מתוך {quotes.length}
              </span>
              <span>
                <Loader2 className="hidden" size={12} />
              </span>
            </>
          }
        >
          {filtered.map((quote) => {
            const open = openActionsId === quote._id;
            return (
              <tr
                key={quote._id}
                className={open ? "actions-open" : undefined}
              >
                <td className="font-bold">
                  {quote.quoteNumber || quote._id.slice(-6)}
                </td>
                <td>
                  <span
                    className="cell-clip font-bold"
                    title={quote.fullName || ""}
                  >
                    {quote.fullName || "—"}
                  </span>
                </td>
                <td>
                  <span
                    className="cell-clip-wide text-[var(--admin-muted)]"
                    title={quote.email || quote.phone || ""}
                  >
                    {quote.email || quote.phone || "—"}
                  </span>
                </td>
                <td>
                  <span className="cell-clip" title={quote.eventName || ""}>
                    {quote.eventName || "—"}
                  </span>
                </td>
                <td>
                  <span className="cell-clip" title={quote.packageTitle || ""}>
                    {quote.packageTitle || "—"}
                  </span>
                </td>
                <td className="font-bold">{formatMoney(quote.total)}</td>
                <td>
                  <span
                    className={`admin-row-badge ${statusTone(quote.status)}`}
                  >
                    {statusLabel(quote.status)}
                  </span>
                </td>
                <td>{formatDate(quote.createdAt)}</td>
                <td className="admin-actions-cell">
                  {quote.token ? (
                    <AdminActionsMenu
                      open={open}
                      onToggle={() =>
                        setOpenActionsId(open ? null : quote._id)
                      }
                      onClose={() => setOpenActionsId(null)}
                    >
                      <Link
                        href={`/sales-documents/${encodeURIComponent(quote.token)}?preview=1`}
                        target="_blank"
                        onClick={() => setOpenActionsId(null)}
                        className="text-[var(--admin-text)] hover:bg-gray-50"
                      >
                        צפייה
                      </Link>
                      <Link
                        href={`/admin/sales/quotes/${encodeURIComponent(quote.token)}/edit`}
                        onClick={() => setOpenActionsId(null)}
                        className="text-[var(--admin-text)] hover:bg-gray-50"
                      >
                        עריכת הצעה
                      </Link>
                      {quote.convertedUserId ? (
                        <Link
                          href={`/admin/users?q=${encodeURIComponent(quote.convertedUserId)}`}
                          onClick={() => setOpenActionsId(null)}
                          className="text-[var(--admin-text)] hover:bg-gray-50"
                        >
                          מעבר למשתמש
                        </Link>
                      ) : (
                        <AdminActionsItem
                          disabled={creatingFor === quote.token}
                          onClick={() => {
                            setOpenActionsId(null);
                            void createUserFromQuote(quote.token);
                          }}
                        >
                          {creatingFor === quote.token
                            ? "יוצר..."
                            : "פתיחת משתמש מההצעה"}
                        </AdminActionsItem>
                      )}
                    </AdminActionsMenu>
                  ) : (
                    <span className="text-xs text-[var(--admin-subtle)]">
                      אין קישור
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </AdminTableShell>
      )}
    </AdminListPage>
  );
}
