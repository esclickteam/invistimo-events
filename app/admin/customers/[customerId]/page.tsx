
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type CustomerFile = {
  _id: string;
  userId?: string;
  invitationId?: string;

  fullName?: string;
  email?: string;
  phone?: string;

  eventDate?: string | Date;
  venueName?: string;
  city?: string;

  packageName?: string;
  packageBasePrice?: number;
  packageTargetPriceWithCalls?: number;

  hasCallRounds?: boolean;
  allowedCallRounds?: number;

  totalPrice?: number;
  paidAmount?: number;
  balance?: number;

  status?: string;
  notes?: string;

  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type QuoteItem = {
  title?: string;
  description?: string;
  price?: number;
};

type CustomerQuote = {
  _id: string;
  customerFileId?: string;
  userId?: string;
  quoteNumber?: string;
  items?: QuoteItem[];
  total?: number;
  validUntil?: string | Date;
  status?: string;
  publicToken?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type CustomerAgreement = {
  _id: string;
  customerFileId?: string;
  userId?: string;
  title?: string;
  amount?: number;
  status?: string;
  signedAt?: string | Date;
  signerName?: string;
  signerIdNumber?: string;
  signerEmail?: string;
  signerPhone?: string;
  signatureText?: string;
  signatureImageUrl?: string;
  ipAddress?: string;
  publicToken?: string;
  pdfUrl?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type CustomerResponse = {
  success?: boolean;
  customer?: CustomerFile;
  quotes?: CustomerQuote[];
  agreements?: CustomerAgreement[];
  error?: string;
};

type UpgradeResponse = {
  success?: boolean;
  upgradeAmount?: number;
  customer?: CustomerFile;
  error?: string;
};

type ActiveTab =
  | "overview"
  | "package"
  | "quotes"
  | "agreements"
  | "calls"
  | "notes";

function formatDate(value?: string | Date) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTime(value?: string | Date) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateTime(value?: string | Date) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value?: number) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "lead":
      return "ליד";
    case "quote_sent":
      return "נשלחה הצעה";
    case "paid":
      return "שולם";
    case "active":
      return "פעיל";
    case "completed":
      return "הסתיים";
    case "cancelled":
      return "בוטל";
    default:
      return "לא הוגדר";
  }
}

function getAgreementStatusLabel(status?: string) {
  switch (status) {
    case "draft":
      return "טיוטה";
    case "sent":
      return "נשלח לחתימה";
    case "signed":
      return "נחתם";
    case "cancelled":
      return "בוטל";
    default:
      return "לא הוגדר";
  }
}

function getQuoteStatusLabel(status?: string) {
  switch (status) {
    case "draft":
      return "טיוטה";
    case "sent":
      return "נשלחה";
    case "opened":
      return "נפתחה";
    case "approved":
      return "אושרה";
    case "expired":
      return "פג תוקף";
    case "cancelled":
      return "בוטלה";
    case "converted":
      return "הומרה להסכם";
    default:
      return "לא הוגדר";
  }
}

function getPillClass(type?: string) {
  switch (type) {
    case "active":
    case "paid":
    case "signed":
    case "approved":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "sent":
    case "opened":
    case "quote_sent":
      return "bg-blue-50 text-blue-700 ring-blue-100";
    case "lead":
    case "draft":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    case "cancelled":
    case "expired":
      return "bg-red-50 text-red-700 ring-red-100";
    default:
      return "bg-stone-50 text-stone-700 ring-stone-100";
  }
}

function safeId(value: unknown) {
  return String(value || "").trim();
}

export default function AdminCustomerFilePage() {
  const params = useParams();
  const router = useRouter();

  const customerId = safeId(params?.customerId);

  const [customer, setCustomer] = useState<CustomerFile | null>(null);
  const [quotes, setQuotes] = useState<CustomerQuote[]>([]);
  const [agreements, setAgreements] = useState<CustomerAgreement[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [upgradingCalls, setUpgradingCalls] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");

  const loadCustomer = useCallback(async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = (await res.json()) as CustomerResponse;

      if (!res.ok || !data.success || !data.customer) {
        throw new Error(data.error || "שגיאה בטעינת תיק לקוח");
      }

      setCustomer(data.customer);
      setQuotes(Array.isArray(data.quotes) ? data.quotes : []);
      setAgreements(Array.isArray(data.agreements) ? data.agreements : []);
    } catch (err) {
      console.error("LOAD CUSTOMER FILE ERROR:", err);
      setError(err instanceof Error ? err.message : "שגיאה בטעינת תיק לקוח");
      setCustomer(null);
      setQuotes([]);
      setAgreements([]);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  const upgradeAmount = useMemo(() => {
    if (!customer) return 0;

    const currentPackagePrice = Number(
      customer.packageBasePrice || customer.totalPrice || 0
    );

    const targetPackagePrice = Number(customer.packageTargetPriceWithCalls || 0);

    return Math.max(0, targetPackagePrice - currentPackagePrice);
  }, [customer]);

  const canUpgradeCalls = useMemo(() => {
    if (!customer) return false;
    if (customer.hasCallRounds) return false;

    const targetPackagePrice = Number(customer.packageTargetPriceWithCalls || 0);
    const currentPackagePrice = Number(
      customer.packageBasePrice || customer.totalPrice || 0
    );

    return targetPackagePrice > currentPackagePrice;
  }, [customer]);

  const stats = useMemo(() => {
    const signedAgreements = agreements.filter(
      (agreement) => agreement.status === "signed" || agreement.signedAt
    ).length;

    const sentQuotes = quotes.filter(
      (quote) => quote.status === "sent" || quote.status === "opened"
    ).length;

    return {
      quotesCount: quotes.length,
      agreementsCount: agreements.length,
      signedAgreements,
      sentQuotes,
    };
  }, [agreements, quotes]);

  async function handleUpgradeCalls() {
    if (!customerId || !customer) return;

    const approved = window.confirm(
      `להוסיף סבבי שיחות ללקוח?\n\nההפרש לתשלום הוא ${formatMoney(
        upgradeAmount
      )}.\n\nהחישוב מתבצע לפי ההפרש בין החבילה הנוכחית לחבילה עם סבבי שיחות.`
    );

    if (!approved) return;

    try {
      setUpgradingCalls(true);
      setUpgradeMessage("");

      const res = await fetch(
        `/api/admin/customers/${customerId}/call-rounds-upgrade`,
        {
          method: "POST",
        }
      );

      const data = (await res.json()) as UpgradeResponse;

      if (!res.ok || !data.success) {
        throw new Error(data.error || "שגיאה בהוספת סבבי שיחות");
      }

      if (data.customer) {
        setCustomer(data.customer);
      }

      setUpgradeMessage(
        `סבבי השיחות נוספו בהצלחה. ההפרש לתשלום: ${formatMoney(
          data.upgradeAmount || upgradeAmount
        )}`
      );

      await loadCustomer();
    } catch (err) {
      console.error("UPGRADE CALL ROUNDS ERROR:", err);
      setUpgradeMessage(
        err instanceof Error ? err.message : "שגיאה בהוספת סבבי שיחות"
      );
    } finally {
      setUpgradingCalls(false);
    }
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#F7F1EA] px-4 py-8 text-[#3A271D] sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-[#E8D8C4] bg-white p-8 text-center text-sm font-black text-[#8A6A43] shadow-sm">
          טוען תיק לקוח...
        </div>
      </main>
    );
  }

  if (error || !customer) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#F7F1EA] px-4 py-8 text-[#3A271D] sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-red-100 bg-white p-8 shadow-sm">
          <p className="text-lg font-black text-red-700">
            {error || "תיק לקוח לא נמצא"}
          </p>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-2xl border border-[#D9C3A8] bg-white px-5 py-3 text-sm font-black text-[#3A271D]"
            >
              חזרה
            </button>

            <Link
              href="/admin/customers"
              className="rounded-2xl bg-[#3A271D] px-5 py-3 text-sm font-black text-white"
            >
              לכל הלקוחות
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const userId = safeId(customer.userId);
  const customerName = customer.fullName || "לקוח ללא שם";

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: "overview", label: "סקירה" },
    { id: "package", label: "חבילה ושירותים" },
    { id: "quotes", label: "הצעות מחיר" },
    { id: "agreements", label: "הסכמים" },
    { id: "calls", label: "סבבי שיחות" },
    { id: "notes", label: "הערות" },
  ];

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#F7F1EA] px-4 py-6 text-[#3A271D] sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-[#E8D8C4] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <Link
                href="/admin/customers"
                className="text-sm font-black text-[#B87920] hover:underline"
              >
                ← חזרה לכל הלקוחות
              </Link>

              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                תיק לקוח · {customerName}
              </h1>

              <p className="mt-2 text-sm font-semibold leading-6 text-[#8A6A43]">
                כל המידע על הלקוח: חבילה, הצעות מחיר, הסכמים, חתימות, תשלומים
                וסבבי שיחות.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadCustomer}
                className="rounded-2xl border border-[#D9C3A8] bg-white px-5 py-3 text-sm font-black text-[#3A271D] transition hover:bg-[#FFF7EC]"
              >
                רענון
              </button>

              {userId ? (
                <Link
                  href={`/admin/users?impersonate=${userId}`}
                  className="rounded-2xl bg-[#3A271D] px-5 py-3 text-sm font-black text-white transition hover:bg-[#24170f]"
                >
                  כניסה ללקוח עצמו
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-2xl border border-[#E8D8C4] bg-[#F7F1EA] px-5 py-3 text-sm font-black text-[#B9A28A]"
                >
                  אין משתמש מחובר
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[1.5rem] border border-[#E8D8C4] bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-[#8A6A43]">סכום עסקה</p>
            <p className="mt-3 text-3xl font-black text-[#B87920]">
              {formatMoney(customer.totalPrice)}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[#E8D8C4] bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-[#8A6A43]">שולם</p>
            <p className="mt-3 text-3xl font-black text-emerald-700">
              {formatMoney(customer.paidAmount)}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[#E8D8C4] bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-[#8A6A43]">יתרה</p>
            <p className="mt-3 text-3xl font-black text-orange-700">
              {formatMoney(customer.balance)}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[#E8D8C4] bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-[#8A6A43]">הסכמים חתומים</p>
            <p className="mt-3 text-3xl font-black text-blue-700">
              {stats.signedAgreements}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[#E8D8C4] bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-[#8A6A43]">סבבי שיחות</p>
            <p className="mt-3 text-3xl font-black text-[#3A271D]">
              {customer.hasCallRounds ? customer.allowedCallRounds || 3 : 0}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-[#E8D8C4] bg-white shadow-sm">
          <div className="overflow-x-auto border-b border-[#EFE3D4] bg-[#FFFBF5] px-3 py-3">
            <div className="flex min-w-max gap-2">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                      isActive
                        ? "bg-[#3A271D] text-white shadow-sm"
                        : "bg-white text-[#8A6A43] ring-1 ring-[#E8D8C4] hover:bg-[#FFF7EC]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {activeTab === "overview" ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black">סקירה כללית</h2>
                  <p className="mt-1 text-sm font-semibold text-[#8A6A43]">
                    פרטי הלקוח והאירוע.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <InfoCard title="שם לקוח" value={customerName} />
                  <InfoCard title="מייל" value={customer.email || "-"} />
                  <InfoCard title="טלפון" value={customer.phone || "-"} />
                  <InfoCard title="תאריך אירוע" value={formatDate(customer.eventDate)} />
                  <InfoCard title="אולם / מקום" value={customer.venueName || "-"} />
                  <InfoCard title="עיר" value={customer.city || "-"} />
                  <InfoCard title="חבילה" value={customer.packageName || "-"} />
                  <InfoCard
                    title="סטטוס"
                    value={getStatusLabel(customer.status)}
                    pillClass={getPillClass(customer.status)}
                  />
                  <InfoCard
                    title="נוצר בתאריך"
                    value={formatDateTime(customer.createdAt)}
                  />
                </div>
              </div>
            ) : null}

            {activeTab === "package" ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black">חבילה ושירותים</h2>
                  <p className="mt-1 text-sm font-semibold text-[#8A6A43]">
                    מה הלקוח רכש, מה פעיל, ומה אפשר להוסיף לפי הפרש.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <InfoCard title="שם חבילה" value={customer.packageName || "-"} />
                  <InfoCard
                    title="מחיר חבילה קיימת"
                    value={formatMoney(customer.packageBasePrice || customer.totalPrice)}
                  />
                  <InfoCard
                    title="חבילה עם סבבי שיחות"
                    value={
                      customer.packageTargetPriceWithCalls
                        ? formatMoney(customer.packageTargetPriceWithCalls)
                        : "לא הוגדר"
                    }
                  />
                </div>

                <div className="rounded-[1.5rem] border border-[#E8D8C4] bg-[#FFFCF7] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-lg font-black">שדרוג לסבבי שיחות</h3>
                      <p className="mt-1 text-sm font-semibold text-[#8A6A43]">
                        ההפרש מחושב לפי מחיר החבילה עם שיחות פחות מחיר החבילה
                        הנוכחית, לא לפי כמה הלקוח שילם בפועל.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#8A6A43] ring-1 ring-[#E8D8C4]">
                          חבילה קיימת:{" "}
                          {formatMoney(customer.packageBasePrice || customer.totalPrice)}
                        </span>

                        <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#8A6A43] ring-1 ring-[#E8D8C4]">
                          עם שיחות:{" "}
                          {customer.packageTargetPriceWithCalls
                            ? formatMoney(customer.packageTargetPriceWithCalls)
                            : "לא הוגדר"}
                        </span>

                        <span className="rounded-full bg-[#FFF7EC] px-4 py-2 text-xs font-black text-[#B87920] ring-1 ring-[#E8D8C4]">
                          הפרש לתשלום: {formatMoney(upgradeAmount)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleUpgradeCalls}
                      disabled={!canUpgradeCalls || upgradingCalls}
                      className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                        canUpgradeCalls && !upgradingCalls
                          ? "bg-[#3A271D] text-white hover:bg-[#24170f]"
                          : "cursor-not-allowed bg-[#E8D8C4] text-[#9A7A55]"
                      }`}
                    >
                      {customer.hasCallRounds
                        ? "סבבי שיחות כבר פעילים"
                        : upgradingCalls
                          ? "מוסיף..."
                          : "הוסף סבבי שיחות"}
                    </button>
                  </div>

                  {upgradeMessage ? (
                    <div className="mt-4 rounded-2xl border border-[#E8D8C4] bg-white p-4 text-sm font-black text-[#3A271D]">
                      {upgradeMessage}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {activeTab === "quotes" ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black">הצעות מחיר</h2>
                  <p className="mt-1 text-sm font-semibold text-[#8A6A43]">
                    כל ההצעות שנוצרו ללקוח.
                  </p>
                </div>

                <TableShell
                  emptyText="אין הצעות מחיר ללקוח הזה."
                  headers={["מספר הצעה", "תאריך", "תוקף עד", "סכום", "סטטוס", "פעולות"]}
                  isEmpty={quotes.length === 0}
                >
                  {quotes.map((quote) => (
                    <tr
                      key={quote._id}
                      className="border-b border-[#F1E7DA] text-sm hover:bg-[#FFFCF7]"
                    >
                      <td className="px-5 py-4 font-black">
                        {quote.quoteNumber || quote._id.slice(-6)}
                      </td>
                      <td className="px-5 py-4 font-bold text-[#5B4638]">
                        {formatDate(quote.createdAt)}
                      </td>
                      <td className="px-5 py-4 font-bold text-[#5B4638]">
                        {formatDate(quote.validUntil)}
                      </td>
                      <td className="px-5 py-4 font-black text-[#B87920]">
                        {formatMoney(quote.total)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${getPillClass(
                            quote.status
                          )}`}
                        >
                          {getQuoteStatusLabel(quote.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {quote.publicToken ? (
                          <Link
                            href={`/quote/${quote.publicToken}`}
                            target="_blank"
                            className="rounded-xl border border-[#D9C3A8] bg-white px-4 py-2 text-xs font-black text-[#3A271D] hover:bg-[#FFF7EC]"
                          >
                            צפייה
                          </Link>
                        ) : (
                          <span className="text-xs font-black text-[#B9A28A]">
                            אין קישור
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </TableShell>
              </div>
            ) : null}

            {activeTab === "agreements" ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black">הסכמים</h2>
                  <p className="mt-1 text-sm font-semibold text-[#8A6A43]">
                    כאן רואים תאריך חתימה, שעת חתימה וייצוא PDF חתום.
                  </p>
                </div>

                <TableShell
                  emptyText="אין הסכמים ללקוח הזה."
                  headers={[
                    "הסכם",
                    "נוצר",
                    "סטטוס",
                    "תאריך חתימה",
                    "שעת חתימה",
                    "סכום",
                    "פעולות",
                  ]}
                  isEmpty={agreements.length === 0}
                >
                  {agreements.map((agreement) => {
                    const isSigned =
                      agreement.status === "signed" || Boolean(agreement.signedAt);

                    return (
                      <tr
                        key={agreement._id}
                        className="border-b border-[#F1E7DA] text-sm hover:bg-[#FFFCF7]"
                      >
                        <td className="px-5 py-4">
                          <div className="font-black text-[#3A271D]">
                            {agreement.title || "הסכם שירותים"}
                          </div>
                          <div className="mt-1 text-xs font-bold text-[#9A7A55]">
                            {agreement.signerName || customerName}
                          </div>
                        </td>

                        <td className="px-5 py-4 font-bold text-[#5B4638]">
                          {formatDate(agreement.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${getPillClass(
                              isSigned ? "signed" : agreement.status
                            )}`}
                          >
                            {isSigned
                              ? "נחתם"
                              : getAgreementStatusLabel(agreement.status)}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-bold text-[#5B4638]">
                          {formatDate(agreement.signedAt)}
                        </td>

                        <td className="px-5 py-4 font-bold text-[#5B4638]">
                          {formatTime(agreement.signedAt)}
                        </td>

                        <td className="px-5 py-4 font-black text-[#B87920]">
                          {formatMoney(agreement.amount)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            {agreement.publicToken ? (
                              <Link
                                href={`/agreement/${agreement.publicToken}`}
                                target="_blank"
                                className="rounded-xl border border-[#D9C3A8] bg-white px-4 py-2 text-xs font-black text-[#3A271D] hover:bg-[#FFF7EC]"
                              >
                                צפייה
                              </Link>
                            ) : (
                              <span className="rounded-xl border border-[#E8D8C4] bg-[#F7F1EA] px-4 py-2 text-xs font-black text-[#B9A28A]">
                                אין קישור
                              </span>
                            )}

                            <Link
                              href={`/api/admin/agreements/pdf?agreementId=${agreement._id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl bg-[#3A271D] px-4 py-2 text-xs font-black text-white hover:bg-[#24170f]"
                            >
                              PDF חתום
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </TableShell>
              </div>
            ) : null}

            {activeTab === "calls" ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black">סבבי שיחות</h2>
                  <p className="mt-1 text-sm font-semibold text-[#8A6A43]">
                    ניהול שירות סבבי השיחות של הלקוח.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <InfoCard
                    title="סטטוס סבבי שיחות"
                    value={customer.hasCallRounds ? "פעיל" : "לא פעיל"}
                    pillClass={
                      customer.hasCallRounds
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                        : "bg-stone-50 text-stone-700 ring-stone-100"
                    }
                  />
                  <InfoCard
                    title="מספר סבבים"
                    value={String(customer.hasCallRounds ? customer.allowedCallRounds || 3 : 0)}
                  />
                  <InfoCard
                    title="הפרש לשדרוג"
                    value={formatMoney(upgradeAmount)}
                  />
                </div>

                <div className="rounded-[1.5rem] border border-[#E8D8C4] bg-[#FFFCF7] p-5">
                  <h3 className="text-lg font-black">הוספת סבבי שיחות</h3>

                  <p className="mt-2 text-sm font-semibold leading-6 text-[#8A6A43]">
                    אם הלקוח מוסיף סבבי שיחות אחרי שכבר קנה חבילה, הוא משלם רק
                    את ההפרש בין החבילה הראשונה לחבילה עם שיחות.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#8A6A43] ring-1 ring-[#E8D8C4]">
                      חבילה קיימת:{" "}
                      {formatMoney(customer.packageBasePrice || customer.totalPrice)}
                    </span>

                    <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#8A6A43] ring-1 ring-[#E8D8C4]">
                      חבילה עם שיחות:{" "}
                      {customer.packageTargetPriceWithCalls
                        ? formatMoney(customer.packageTargetPriceWithCalls)
                        : "לא הוגדר"}
                    </span>

                    <span className="rounded-full bg-[#FFF7EC] px-4 py-2 text-xs font-black text-[#B87920] ring-1 ring-[#E8D8C4]">
                      לתשלום: {formatMoney(upgradeAmount)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleUpgradeCalls}
                    disabled={!canUpgradeCalls || upgradingCalls}
                    className={`mt-5 rounded-2xl px-5 py-3 text-sm font-black transition ${
                      canUpgradeCalls && !upgradingCalls
                        ? "bg-[#3A271D] text-white hover:bg-[#24170f]"
                        : "cursor-not-allowed bg-[#E8D8C4] text-[#9A7A55]"
                    }`}
                  >
                    {customer.hasCallRounds
                      ? "סבבי שיחות כבר פעילים"
                      : upgradingCalls
                        ? "מוסיף..."
                        : "הוסף סבבי שיחות לפי ההפרש"}
                  </button>

                  {upgradeMessage ? (
                    <div className="mt-4 rounded-2xl border border-[#E8D8C4] bg-white p-4 text-sm font-black text-[#3A271D]">
                      {upgradeMessage}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {activeTab === "notes" ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black">הערות פנימיות</h2>
                  <p className="mt-1 text-sm font-semibold text-[#8A6A43]">
                    הערות שנשמרו בתיק הלקוח.
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-[#E8D8C4] bg-[#FFFCF7] p-5 text-sm font-bold leading-7 text-[#3A271D]">
                  {customer.notes?.trim() ? customer.notes : "אין הערות ללקוח הזה."}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({
  title,
  value,
  pillClass,
}: {
  title: string;
  value: string;
  pillClass?: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[#E8D8C4] bg-white p-5 shadow-sm">
      <p className="text-xs font-black text-[#8A6A43]">{title}</p>

      {pillClass ? (
        <span
          className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-black ring-1 ${pillClass}`}
        >
          {value}
        </span>
      ) : (
        <p className="mt-3 break-words text-lg font-black text-[#3A271D]">
          {value}
        </p>
      )}
    </div>
  );
}

function TableShell({
  headers,
  children,
  isEmpty,
  emptyText,
}: {
  headers: string[];
  children: React.ReactNode;
  isEmpty: boolean;
  emptyText: string;
}) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#E8D8C4] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] border-collapse text-right">
          <thead>
            <tr className="border-b border-[#EFE3D4] bg-[#FFFBF5] text-xs font-black text-[#8A6A43]">
              {headers.map((header) => (
                <th key={header} className="px-5 py-4">
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isEmpty ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-5 py-12 text-center text-sm font-black text-[#8A6A43]"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}