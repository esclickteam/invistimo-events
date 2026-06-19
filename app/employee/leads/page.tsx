"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type StaffMember = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  staffType?: string;
};

type LeadFile = {
  _id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  eventDate?: string | Date;
  venueName?: string;
  city?: string;
  packageName?: string;
  totalPrice?: number;
  paidAmount?: number;
  balance?: number;
  status?: string;
  leadSource?: string;
  leadProvider?: string;
  leadStatus?: string;
  interestedService?: string;
  facebookLeadId?: string;
  campaignName?: string;
  adName?: string;
  formName?: string;
  source?: string;
  assignedStaffIds?: Array<string | StaffMember>;
  notes?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type LeadsResponse = {
  success?: boolean;
  leads?: LeadFile[];
  error?: string;
  message?: string;
};

const LEAD_STATUS_OPTIONS = [
  { value: "all", label: "כל הלידים" },
  { value: "new", label: "חדשים" },
  { value: "contacted", label: "נוצר קשר" },
  { value: "quote_sent", label: "נשלחה הצעה" },
  { value: "converted", label: "נסגרו" },
  { value: "lost", label: "לא רלוונטיים" },
];

function cleanText(value: unknown) {
  return String(value || "").trim();
}

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

function getLeadStatusLabel(status?: string) {
  switch (status) {
    case "new":
      return "חדש";
    case "contacted":
      return "נוצר קשר";
    case "quote_sent":
      return "נשלחה הצעה";
    case "converted":
      return "נסגר כלקוח";
    case "lost":
      return "לא רלוונטי";
    default:
      return "חדש";
  }
}

function getLeadStatusClass(status?: string) {
  switch (status) {
    case "new":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "contacted":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "quote_sent":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "converted":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "lost":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getLeadSourceLabel(source?: string, provider?: string) {
  const cleanSource = cleanText(source).toLowerCase();
  const cleanProvider = cleanText(provider).toLowerCase();

  if (cleanSource === "facebook" && cleanProvider === "make") {
    return "Facebook / Make";
  }

  if (cleanSource === "facebook") {
    return "Facebook";
  }

  if (cleanProvider === "make") {
    return "Make";
  }

  if (cleanSource) return source || "-";
  if (cleanProvider) return provider || "-";

  return "-";
}

function initials(name?: string) {
  const cleanName = cleanText(name);

  if (!cleanName) return "ל";

  const parts = cleanName.split(/\s+/).filter(Boolean);

  if (parts.length === 1) return parts[0].slice(0, 2);

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

function normalizePhoneForTel(phone?: string) {
  return cleanText(phone).replace(/[^\d+]/g, "");
}

function normalizePhoneForWhatsapp(phone?: string) {
  const digits = cleanText(phone).replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("972")) return digits;

  if (digits.startsWith("0")) return `972${digits.slice(1)}`;

  return digits;
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black ${className}`}
    >
      {children}
    </span>
  );
}

function InfoItem({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <div
        className={`mt-1 min-h-[1.35rem] break-words text-sm ${
          strong ? "font-black text-slate-950" : "font-bold text-slate-700"
        }`}
      >
        {value || "-"}
      </div>
    </div>
  );
}

export default function EmployeeLeadsPage() {
  const [leads, setLeads] = useState<LeadFile[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadLeads = useCallback(async () => {
    try {
      setRefreshing(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("q", search.trim());
      }

      const url = params.toString()
        ? `/api/employee/leads?${params.toString()}`
        : "/api/employee/leads";

      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = (await res.json().catch(() => null)) as LeadsResponse | null;

      if (!res.ok || !data?.success) {
        throw new Error(
          data?.message || data?.error || "שגיאה בטעינת הלידים"
        );
      }

      setLeads(Array.isArray(data.leads) ? data.leads : []);
    } catch (err) {
      console.error("LOAD EMPLOYEE LEADS FAILED:", err);
      setError(err instanceof Error ? err.message : "שגיאה בטעינת הלידים");
      setLeads([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLeads();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadLeads]);

  const filteredLeads = useMemo(() => {
    if (statusFilter === "all") return leads;

    return leads.filter((lead) => {
      return String(lead.leadStatus || "new") === statusFilter;
    });
  }, [leads, statusFilter]);

  const stats = useMemo(() => {
    const total = leads.length;
    const newLeads = leads.filter((lead) => (lead.leadStatus || "new") === "new").length;
    const contacted = leads.filter((lead) => lead.leadStatus === "contacted").length;
    const quoteSent = leads.filter((lead) => lead.leadStatus === "quote_sent").length;
    const converted = leads.filter((lead) => lead.leadStatus === "converted").length;

    return {
      total,
      newLeads,
      contacted,
      quoteSent,
      converted,
    };
  }, [leads]);

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8"
    >
      <div className="mx-auto w-full max-w-[1480px] space-y-6">
        <section className="overflow-hidden rounded-[2.2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700">
                אזור עובד
              </span>

              <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                הלידים שלי
              </h1>

              <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-slate-600">
                כאן מופיעים רק הלידים שהאדמין הקצה לך לטיפול. אפשר לפתוח כל ליד,
                לעדכן סטטוס טיפול, להוסיף הערות ובהמשך לנהל שיחת WhatsApp מתוך
                המערכת.
              </p>
            </div>

            <div className="flex flex-col gap-3 xl:w-[520px]">
              <div className="flex rounded-[1.4rem] border border-slate-200 bg-slate-50 p-2 shadow-sm">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="חיפוש לפי שם, טלפון, שירות, Facebook..."
                  className="h-12 min-w-0 flex-1 bg-transparent px-4 text-sm font-bold outline-none placeholder:text-slate-400"
                />

                <button
                  type="button"
                  onClick={() => void loadLeads()}
                  disabled={refreshing}
                  className="h-12 rounded-2xl bg-slate-950 px-6 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? "מרענן..." : "רענון"}
                </button>
              </div>

              <Link
                href="/employee"
                className="w-fit rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                חזרה לדשבורד עובד
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard title="סה״כ לידים" value={stats.total} />
          <StatCard title="חדשים" value={stats.newLeads} tone="amber" />
          <StatCard title="נוצר קשר" value={stats.contacted} tone="blue" />
          <StatCard title="נשלחה הצעה" value={stats.quoteSent} tone="indigo" />
          <StatCard title="נסגרו" value={stats.converted} tone="green" />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black">רשימת לידים לטיפול</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                לחיצה על “טיפול בליד” תפתח את עמוד הליד הספציפי.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {LEAD_STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                    statusFilter === option.value
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm font-black text-slate-600">
              טוען לידים...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
              <p className="text-lg font-black text-slate-800">
                אין לידים להצגה
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                ברגע שהאדמין יקצה לך ליד, הוא יופיע כאן.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {filteredLeads.map((lead) => {
                const leadId = String(lead._id);
                const telNumber = normalizePhoneForTel(lead.phone);
                const whatsappNumber = normalizePhoneForWhatsapp(lead.phone);

                return (
                  <article
                    key={leadId}
                    className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
                  >
                    <div className="grid gap-5 xl:grid-cols-[minmax(260px,1fr)_minmax(0,2.4fr)_auto] xl:items-center">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white">
                          {initials(lead.fullName)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-xl font-black text-slate-950">
                              {lead.fullName || "ליד ללא שם"}
                            </h3>

                            <Pill className={getLeadStatusClass(lead.leadStatus || "new")}>
                              {getLeadStatusLabel(lead.leadStatus || "new")}
                            </Pill>

                            <Pill className="border-blue-200 bg-blue-50 text-blue-700">
                              {getLeadSourceLabel(lead.leadSource, lead.leadProvider)}
                            </Pill>
                          </div>

                          <div className="mt-2 space-y-1 text-xs font-bold text-slate-500">
                            <p>תיק ליד: {leadId.slice(-6)}</p>
                            <p>נוצר: {formatDateTime(lead.createdAt)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <InfoItem label="טלפון" value={lead.phone || "-"} strong />
                        <InfoItem label="מייל" value={lead.email || "-"} />
                        <InfoItem label="תאריך אירוע" value={formatDate(lead.eventDate)} />
                        <InfoItem
                          label="שירות מעניין"
                          value={lead.interestedService || lead.packageName || "-"}
                          strong
                        />
                      </div>

                      <div className="grid gap-2 xl:min-w-[170px]">
                        <Link
                          href={`/employee/leads/${leadId}`}
                          className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-black"
                        >
                          טיפול בליד
                        </Link>

                        {telNumber ? (
                          <a
                            href={`tel:${telNumber}`}
                            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-black text-slate-700 transition hover:bg-slate-50"
                          >
                            התקשר
                          </a>
                        ) : null}

                        {whatsappNumber ? (
                          <a
                            href={`https://wa.me/${whatsappNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-2xl border border-green-200 bg-green-50 px-5 py-3 text-center text-sm font-black text-green-700 transition hover:bg-green-100"
                          >
                            WhatsApp
                          </a>
                        ) : null}
                      </div>
                    </div>

                    {lead.notes || lead.campaignName || lead.adName ? (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        {lead.campaignName ? (
                          <Pill className="border-slate-200 bg-slate-50 text-slate-600">
                            קמפיין: {lead.campaignName}
                          </Pill>
                        ) : null}

                        {lead.adName ? (
                          <Pill className="border-slate-200 bg-slate-50 text-slate-600">
                            מודעה: {lead.adName}
                          </Pill>
                        ) : null}

                        {lead.notes ? (
                          <Pill className="border-amber-200 bg-amber-50 text-amber-700">
                            יש הערות טיפול
                          </Pill>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  tone = "dark",
}: {
  title: string;
  value: React.ReactNode;
  tone?: "dark" | "amber" | "blue" | "indigo" | "green";
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber-700"
      : tone === "blue"
        ? "text-blue-700"
        : tone === "indigo"
          ? "text-indigo-700"
          : tone === "green"
            ? "text-emerald-700"
            : "text-slate-950";

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black text-slate-500">{title}</p>
      <p className={`mt-3 text-3xl font-black ${toneClass}`}>{value}</p>
    </div>
  );
}