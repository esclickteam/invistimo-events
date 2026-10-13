"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { QUOTE_PAYMENT_CONFIRMED_LABEL } from "@/lib/quotePaymentStatus";
import {
  adminSalesListKind,
  documentKindOf,
  filterAdminSalesRows,
  type CustomerVisibilityFilter,
  type DocumentKindFilter,
} from "@/lib/customers/adminSalesDocumentRow";

type QuoteRow = {
  _id: string;
  token: string;
  documentType?: "quote" | "agreement";
  quoteNumber?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  eventName?: string;
  packageTitle?: string;
  status?: string;
  total?: number;
  convertedUserId?: string | null;
  originalUserId?: string | null;
  customerDeleted?: boolean;
  userLinkStatus?: "none" | "created" | "broken";
  createdAt?: string | null;
  sentAt?: string | null;
  signedAt?: string | null;
  expiresAt?: string | null;
  adminPaymentConfirmed?: boolean;
  pdfUrl?: string;
  signerName?: string;
};

type HistoricalPayment = {
  amount: number;
  paidAt?: string | null;
  method?: string;
  status?: string;
  type?: string;
  reference?: string;
  invoiceUrl?: string;
  receiptUrl?: string;
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

function statusLabel(
  status?: string,
  paymentConfirmed?: boolean,
  documentType?: string
) {
  const key = String(status || "").toLowerCase();
  if (documentType === "agreement" && key === "signed") return "נחתם";
  if (documentType === "agreement" && key === "sent") return "נשלח לחתימה";
  if (paymentConfirmed) return QUOTE_PAYMENT_CONFIRMED_LABEL;
  const map: Record<string, string> = {
    draft: "טיוטה",
    sent: "נשלחה",
    viewed: "נצפתה",
    signed: "נחתם",
    accepted: "אושרה",
    converted: "הומרה למשתמש",
    expired: "פגה",
  };
  return map[key] || status || "—";
}

function methodLabel(method?: string) {
  const map: Record<string, string> = {
    stripe: "אשראי",
    cash: "מזומן",
    bank_transfer: "העברה בנקאית",
    bit: "ביט",
    paybox: "פייבוקס",
    manual: "ידני",
    other: "אחר",
  };
  return map[String(method || "").toLowerCase()] || method || "—";
}

function paymentStatusLabel(status?: string) {
  const map: Record<string, string> = {
    paid: "שולם",
    pending: "ממתין",
    failed: "נכשל",
    refunded: "זוכה",
    cancelled: "בוטל",
  };
  return map[String(status || "").toLowerCase()] || status || "—";
}

function documentLabel(quote: QuoteRow) {
  const kind = documentKindOf({
    documentType: quote.documentType || "quote",
    status: quote.status,
    signedAt: quote.signedAt,
  });
  if (kind === "signed") return "הסכם חתום";
  if (kind === "agreement") return "הסכם";
  return "הצעת מחיר";
}

function statusTone(status?: string, paymentConfirmed?: boolean) {
  if (paymentConfirmed) return "bg-emerald-50 text-emerald-700";
  const key = String(status || "").toLowerCase();
  if (key === "converted" || key === "accepted") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (key === "expired") return "bg-red-50 text-red-700";
  if (key === "viewed" || key === "sent") return "bg-blue-50 text-blue-700";
  return "bg-gray-100 text-gray-700";
}

export default function AdminQuotesPage() {
  const pathname = usePathname();
  const kind = adminSalesListKind(pathname || "");
  const agreementsView = kind === "agreements";
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmingFor, setConfirmingFor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [paymentsFor, setPaymentsFor] = useState<QuoteRow | null>(null);
  const [payments, setPayments] = useState<HistoricalPayment[]>([]);
  const [paymentsMeta, setPaymentsMeta] = useState("");
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [customerFilter, setCustomerFilter] =
    useState<CustomerVisibilityFilter>("all");
  const [documentFilter, setDocumentFilter] = useState<DocumentKindFilter>(
    agreementsView ? "signed" : "all"
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/admin/sales/quotes`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "טעינת הצעות נכשלה");
      }
      setQuotes(Array.isArray(data.quotes) ? data.quotes : []);
      setPage(1);
    } catch (err: any) {
      setError(err?.message || "טעינת הצעות נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setDocumentFilter(agreementsView ? "signed" : "all");
    setPage(1);
  }, [agreementsView]);

  async function openPayments(quote: QuoteRow) {
    const originalUserId = quote.originalUserId || quote.convertedUserId || "";
    const params = new URLSearchParams();
    if (originalUserId) params.set("originalUserId", originalUserId);
    if (quote.email) params.set("email", quote.email);
    if (quote.fullName) params.set("fullName", quote.fullName);
    setPaymentsFor(quote);
    setPayments([]);
    setPaymentsMeta("");
    setPaymentsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/sales/retained-payments?${params.toString()}`,
        { credentials: "include", cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setPaymentsMeta(data?.error || "לא נמצאו תשלומים היסטוריים");
        return;
      }
      const rows = [
        ...(Array.isArray(data.payments) ? data.payments : []),
        ...(Array.isArray(data.ledgerPayments) ? data.ledgerPayments : []),
      ];
      setPayments(rows);
      const deal = Number(data.totalDealAmount || 0);
      const paid = Number(data.paidAmount || 0);
      setPaymentsMeta(
        `${data.customer?.name || quote.fullName || "לקוח שנמחק"} · עסקה ${formatMoney(deal)} · נגבה ${formatMoney(paid)}`
      );
    } catch {
      setPaymentsMeta("טעינת התשלומים נכשלה");
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function confirmPayment(token: string) {
    const confirmed = confirm(
      "לסמן את ההצעה כמאושר – תשלום בוצע? הפעולה לא מחייבת את הלקוח, לא משנה את תאריך התוקף ולא משנה מחירים או שירותים."
    );
    if (!confirmed) return;

    try {
      setConfirmingFor(token);
      const res = await fetch(
        `/api/admin/sales/quotes/${encodeURIComponent(token)}/confirm-payment`,
        { method: "POST", credentials: "include" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        alert(data?.error || "שמירת הסטטוס נכשלה");
        return;
      }
      setQuotes((current) =>
        current.map((quote) =>
          quote.token === token
            ? { ...quote, adminPaymentConfirmed: true }
            : quote
        )
      );
    } catch {
      alert("שמירת הסטטוס נכשלה");
    } finally {
      setConfirmingFor(null);
    }
  }

  const visibleQuotes = filterAdminSalesRows(quotes, {
    customer: customerFilter,
    document: documentFilter,
  });
  const deletedCount = quotes.filter((quote) => quote.customerDeleted).length;
  const filtered = visibleQuotes.filter((quote) => {
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
      quote.customerDeleted ? "לקוח שנמחק" : "",
      quote.documentType === "agreement" ? "הסכם" : "הצעה",
    ]
      .map((v) => String(v || "").toLowerCase())
      .some((v) => v.includes(q));
  });
  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize;
  const paged = filtered.slice(pageStart, pageStart + pageSize);

  return (
    <AdminListPage>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/sales/quotes"
          className={`inline-flex h-9 items-center rounded-[var(--admin-radius-sm)] px-3 text-xs font-bold ${
            agreementsView
              ? "border border-[var(--admin-border)] bg-white text-[var(--admin-text)]"
              : "bg-[var(--admin-brand)] text-white"
          }`}
        >
          הצעות מחיר
        </Link>
        <Link
          href="/admin/sales/agreements"
          className={`inline-flex h-9 items-center rounded-[var(--admin-radius-sm)] px-3 text-xs font-bold ${
            agreementsView
              ? "bg-[var(--admin-brand)] text-white"
              : "border border-[var(--admin-border)] bg-white text-[var(--admin-text)]"
          }`}
        >
          הסכמים חתומים
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-[var(--admin-muted)]">
          כל ההצעות וההסכמים נשארים גם אחרי מחיקת לקוח, כולל חתימה, PDF ותשלומים.
          {deletedCount > 0
            ? ` ${deletedCount} רשומות של לקוחות שנמחקו.`
            : ""}
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
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="חיפוש לפי לקוח, אימייל, מספר מסמך…"
          className="admin-input h-10 min-w-0 flex-1"
        />
        <select
          aria-label="סינון לקוחות"
          data-testid="customer-filter"
          value={customerFilter}
          onChange={(event) => {
            setCustomerFilter(event.target.value as CustomerVisibilityFilter);
            setPage(1);
          }}
          className="admin-input h-10"
        >
          <option value="all">הכל</option>
          <option value="active">לקוחות פעילים</option>
          <option value="deleted">לקוחות שנמחקו</option>
        </select>
        <select
          aria-label="סינון סוג מסמך"
          data-testid="document-filter"
          value={documentFilter}
          onChange={(event) => {
            setDocumentFilter(event.target.value as DocumentKindFilter);
            setPage(1);
          }}
          className="admin-input h-10"
        >
          <option value="all">כל המסמכים</option>
          <option value="quote">הצעת מחיר</option>
          <option value="agreement">הסכם</option>
          <option value="signed">הסכם חתום</option>
        </select>
      </AdminFilterBar>

      {error ? (
        <div className="rounded-[var(--admin-radius)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <AdminLoadingState
          text={agreementsView ? "טוען הסכמים…" : "טוען הצעות…"}
        />
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
            "תאריכים",
            "פעולות",
          ]}
          isEmpty={filtered.length === 0}
          empty={
            quotes.length === 0
              ? "אין הצעות מחיר או הסכמים עדיין."
              : "לא נמצאו מסמכים התואמים לסינון."
          }
          footer={
            <>
              <span data-testid="sales-page-status">
                {filtered.length === 0
                  ? "0 רשומות"
                  : `מציג ${pageStart + 1}–${pageStart + paged.length} מתוך ${filtered.length}`}
                {` · נטענו ${quotes.length} רשומות היסטוריות`}
              </span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="sales-page-prev"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                  className="rounded-md border border-[var(--admin-border)] bg-white px-2 py-1 text-[11px] font-bold disabled:opacity-40"
                >
                  הקודם
                </button>
                <span>
                  עמוד {currentPage} מתוך {pageCount}
                </span>
                <button
                  type="button"
                  data-testid="sales-page-next"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage(currentPage + 1)}
                  className="rounded-md border border-[var(--admin-border)] bg-white px-2 py-1 text-[11px] font-bold disabled:opacity-40"
                >
                  הבא
                </button>
                <Loader2 className="hidden" size={12} />
              </span>
            </>
          }
        >
          {paged.map((quote) => {
            const open = openActionsId === quote._id;
            return (
              <tr
                key={quote._id}
                data-testid={
                  quote.customerDeleted ? "deleted-customer-row" : "customer-row"
                }
                className={open ? "actions-open" : undefined}
              >
                <td className="font-bold">
                  <div>{quote.quoteNumber || quote._id.slice(-6)}</div>
                  <div className="text-[11px] font-medium text-[var(--admin-muted)]">
                    {documentLabel(quote)}
                  </div>
                </td>
                <td>
                  <span
                    className="cell-clip font-bold"
                    title={quote.fullName || ""}
                  >
                    {quote.fullName || "—"}
                  </span>
                  {quote.customerDeleted ? (
                    <span
                      data-testid="deleted-customer-badge"
                      className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800"
                    >
                      לקוח שנמחק
                    </span>
                  ) : null}
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
                    className={`admin-row-badge ${statusTone(quote.status, quote.adminPaymentConfirmed)}`}
                  >
                    {statusLabel(
                      quote.status,
                      quote.adminPaymentConfirmed,
                      quote.documentType
                    )}
                  </span>
                </td>
                <td>
                  <div>נוצר {formatDate(quote.createdAt)}</div>
                  <div className="text-[11px] text-[var(--admin-muted)]">
                    נשלח {formatDate(quote.sentAt)}
                  </div>
                  {quote.signedAt ? (
                    <div className="text-[11px] text-[var(--admin-muted)]">
                      נחתם {formatDate(quote.signedAt)}
                    </div>
                  ) : null}
                </td>
                <td className="admin-actions-cell">
                  <div className="mb-1 flex flex-wrap gap-1">
                    <button
                      type="button"
                      data-testid="open-payments"
                      onClick={() => void openPayments(quote)}
                      className="inline-flex h-7 items-center rounded-md border border-[var(--admin-border)] bg-white px-2 text-[11px] font-bold text-[var(--admin-text)] hover:bg-gray-50"
                    >
                      תשלומים
                    </button>
                    {quote.pdfUrl ? (
                      <a
                        href={quote.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-7 items-center rounded-md border border-[var(--admin-border)] bg-white px-2 text-[11px] font-bold text-[var(--admin-text)] hover:bg-gray-50"
                      >
                        PDF
                      </a>
                    ) : null}
                  </div>
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
                      <a
                        href={`/api/admin/sales/documents/${encodeURIComponent(quote.token)}/download`}
                        onClick={() => setOpenActionsId(null)}
                        className="text-[var(--admin-text)] hover:bg-gray-50"
                      >
                        הורדה
                      </a>
                      {quote.documentType === "agreement" ||
                      quote.adminPaymentConfirmed ? null : (
                        <AdminActionsItem
                          disabled={confirmingFor === quote.token}
                          onClick={() => {
                            setOpenActionsId(null);
                            void confirmPayment(quote.token);
                          }}
                        >
                          {confirmingFor === quote.token
                            ? "שומר..."
                            : "סמן: מאושר – תשלום בוצע"}
                        </AdminActionsItem>
                      )}
                      {quote.documentType === "agreement" ? null : (
                        <Link
                          href={`/admin/sales/quotes/${encodeURIComponent(quote.token)}/edit`}
                          onClick={() => setOpenActionsId(null)}
                          className="text-[var(--admin-text)] hover:bg-gray-50"
                        >
                          עריכת הצעה
                        </Link>
                      )}
                      {quote.customerDeleted ? null : quote.userLinkStatus === "broken" ? (
                        <Link
                          href={`/admin/sales/quotes/${encodeURIComponent(quote.token)}/edit`}
                          onClick={() => setOpenActionsId(null)}
                          className="text-[var(--admin-text)] hover:bg-gray-50"
                        >
                          קישור שבור — תיקון קישור
                        </Link>
                      ) : quote.convertedUserId || quote.userLinkStatus === "created" ? (
                        <Link
                          href={`/admin/users?q=${encodeURIComponent(quote.email || quote.convertedUserId || "")}`}
                          onClick={() => setOpenActionsId(null)}
                          className="text-[var(--admin-text)] hover:bg-gray-50"
                        >
                          משתמש הוקם — כניסה לכרטיס לקוח
                        </Link>
                      ) : quote.documentType === "agreement" ? null : (
                        <Link
                          href={`/admin/sales/quotes/${encodeURIComponent(quote.token)}/edit`}
                          onClick={() => setOpenActionsId(null)}
                          className="text-[var(--admin-text)] hover:bg-gray-50"
                        >
                          הקמת משתמש
                        </Link>
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
      {paymentsFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">תשלומים היסטוריים</h2>
                <p className="text-sm text-[var(--admin-muted)]">
                  {paymentsMeta || paymentsFor.fullName || "לקוח שנמחק"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentsFor(null)}
                className="rounded-lg px-3 py-1 text-sm font-bold text-[var(--admin-muted)] hover:bg-gray-100"
              >
                סגירה
              </button>
            </div>
            {paymentsLoading ? (
              <p className="text-sm">טוען תשלומים…</p>
            ) : payments.length === 0 ? (
              <p className="text-sm">{paymentsMeta || "אין תשלומים שמורים."}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-[var(--admin-muted)]">
                    <th className="py-2">סכום</th>
                    <th>תאריך</th>
                    <th>אמצעי</th>
                    <th>סטטוס</th>
                    <th>אסמכתה</th>
                    <th>מסמך</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment, index) => (
                    <tr key={`${payment.reference || "payment"}-${index}`} className="border-t">
                      <td className="py-2 font-bold">{formatMoney(payment.amount)}</td>
                      <td>{formatDate(payment.paidAt)}</td>
                      <td>{methodLabel(payment.method)}</td>
                      <td>{paymentStatusLabel(payment.status)}</td>
                      <td>{payment.reference || "—"}</td>
                      <td>
                        {payment.invoiceUrl ? (
                          <a href={payment.invoiceUrl} target="_blank" rel="noreferrer">
                            חשבונית
                          </a>
                        ) : null}{" "}
                        {payment.receiptUrl ? (
                          <a href={payment.receiptUrl} target="_blank" rel="noreferrer">
                            קבלה
                          </a>
                        ) : null}
                        {!payment.invoiceUrl && !payment.receiptUrl ? "—" : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}
    </AdminListPage>
  );
}
