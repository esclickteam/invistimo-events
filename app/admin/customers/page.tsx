"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type StaffMember = {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  staffType?: string;
};

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

type CustomersResponse = {
  success?: boolean;
  customers?: CustomerFile[];
  error?: string;
};

type StaffResponse = {
  success?: boolean;
  staff?: StaffMember[];
  error?: string;
};

type AssignResponse = {
  success?: boolean;
  customer?: CustomerFile;
  error?: string;
  message?: string;
};

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

function formatMoney(value?: number) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(amount);
}

function cleanText(value?: string | number | Date) {
  return String(value || "").trim();
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

function getLeadStatusLabel(status?: string) {
  switch (status) {
    case "new":
      return "חדש";
    case "contacted":
      return "נוצר קשר";
    case "quote_sent":
      return "נשלחה הצעה";
    case "converted":
      return "הומר ללקוח";
    case "lost":
      return "לא רלוונטי";
    default:
      return "חדש";
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

  return "-";
}

function getStatusClass(status?: string) {
  switch (status) {
    case "active":
    case "paid":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "quote_sent":
      return "bg-blue-50 text-blue-700 ring-blue-100";
    case "lead":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    case "completed":
      return "bg-slate-50 text-slate-700 ring-slate-100";
    case "cancelled":
      return "bg-red-50 text-red-700 ring-red-100";
    default:
      return "bg-stone-50 text-stone-700 ring-stone-100";
  }
}

function getLeadStatusClass(status?: string) {
  switch (status) {
    case "new":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    case "contacted":
      return "bg-blue-50 text-blue-700 ring-blue-100";
    case "quote_sent":
      return "bg-indigo-50 text-indigo-700 ring-indigo-100";
    case "converted":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "lost":
      return "bg-red-50 text-red-700 ring-red-100";
    default:
      return "bg-amber-50 text-amber-700 ring-amber-100";
  }
}

function isFacebookLead(customer: CustomerFile) {
  return (
    cleanText(customer.leadSource).toLowerCase() === "facebook" ||
    cleanText(customer.source).toLowerCase() === "facebook_lead_make" ||
    Boolean(customer.facebookLeadId)
  );
}

function isLeadCustomer(customer: CustomerFile) {
  return customer.status === "lead" || isFacebookLead(customer);
}

function getInitials(name?: string) {
  const cleanName = cleanText(name);

  if (!cleanName) return "ל";

  const parts = cleanName.split(/\s+/).filter(Boolean);

  if (parts.length === 1) return parts[0].slice(0, 2);

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

function getStaffId(staff: string | StaffMember) {
  return typeof staff === "string" ? staff : String(staff?._id || "");
}

function getAssignedStaff(customer: CustomerFile, staffList: StaffMember[]) {
  const firstAssigned = Array.isArray(customer.assignedStaffIds)
    ? customer.assignedStaffIds[0]
    : null;

  if (!firstAssigned) return null;

  if (typeof firstAssigned === "object") {
    return firstAssigned;
  }

  const assignedId = String(firstAssigned);

  return staffList.find((staff) => String(staff._id) === assignedId) || {
    _id: assignedId,
    name: "",
    email: "",
  };
}

function getStaffLabel(staff?: StaffMember | null) {
  if (!staff) return "לא משויך";
  return staff.name || staff.email || "עובד ללא שם";
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
    <div className="rounded-2xl border border-[#EFE3D4] bg-[#FFFCF7] px-4 py-3">
      <p className="text-[11px] font-black text-[#9A7A55]">{label}</p>
      <div
        className={`mt-1 min-h-[1.35rem] break-words text-sm ${
          strong ? "font-black text-[#3A271D]" : "font-bold text-[#5B4638]"
        }`}
      >
        {value || "-"}
      </div>
    </div>
  );
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
      className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerFile[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedStaffByCustomer, setSelectedStaffByCustomer] = useState<
    Record<string, string>
  >({});
  const [assigningCustomerId, setAssigningCustomerId] = useState("");
  const [assignMessageByCustomer, setAssignMessageByCustomer] = useState<
    Record<string, string>
  >({});

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("q", search.trim());
      }

      const url = params.toString()
        ? `/api/admin/customers?${params.toString()}`
        : "/api/admin/customers";

      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      const data = (await res.json()) as CustomersResponse;

      if (!res.ok || !data.success) {
        throw new Error(data.error || "שגיאה בטעינת לקוחות");
      }

      setCustomers(Array.isArray(data.customers) ? data.customers : []);
    } catch (err) {
      console.error("LOAD CUSTOMERS ERROR:", err);
      setError(err instanceof Error ? err.message : "שגיאה בטעינת לקוחות");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadStaff = useCallback(async () => {
    try {
      setStaffLoading(true);

      const res = await fetch("/api/admin/staff", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await res.json()) as StaffResponse;

      if (!res.ok || !data.success) {
        throw new Error(data.error || "שגיאה בטעינת עובדים");
      }

      setStaff(Array.isArray(data.staff) ? data.staff : []);
    } catch (err) {
      console.error("LOAD STAFF ERROR:", err);
      setStaff([]);
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCustomers();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const stats = useMemo(() => {
    const total = customers.length;
    const leads = customers.filter((customer) => isLeadCustomer(customer)).length;
    const facebookLeads = customers.filter((customer) =>
      isFacebookLead(customer)
    ).length;
    const active = customers.filter(
      (customer) => customer.status === "active"
    ).length;
    const paid = customers.filter((customer) => customer.status === "paid").length;
    const withCalls = customers.filter((customer) => customer.hasCallRounds).length;

    const assignedLeads = customers.filter((customer) => {
      return (
        isLeadCustomer(customer) &&
        Array.isArray(customer.assignedStaffIds) &&
        customer.assignedStaffIds.length > 0
      );
    }).length;

    const totalRevenue = customers.reduce((sum, customer) => {
      return sum + Number(customer.totalPrice || 0);
    }, 0);

    return {
      total,
      leads,
      facebookLeads,
      assignedLeads,
      active,
      paid,
      withCalls,
      totalRevenue,
    };
  }, [customers]);

  async function handleAssignStaff(customerId: string) {
    const staffId = selectedStaffByCustomer[customerId];

    if (!staffId) {
      setAssignMessageByCustomer((prev) => ({
        ...prev,
        [customerId]: "צריך לבחור עובד",
      }));
      return;
    }

    try {
      setAssigningCustomerId(customerId);
      setAssignMessageByCustomer((prev) => ({
        ...prev,
        [customerId]: "",
      }));

      const res = await fetch(
        `/api/admin/customers/${customerId}/assign-staff`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ staffId }),
        }
      );

      const data = (await res.json()) as AssignResponse;

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "שגיאה בשיוך עובד");
      }

      setAssignMessageByCustomer((prev) => ({
        ...prev,
        [customerId]: "הליד שויך לעובד בהצלחה",
      }));

      await loadCustomers();
    } catch (err) {
      console.error("ASSIGN STAFF ERROR:", err);
      setAssignMessageByCustomer((prev) => ({
        ...prev,
        [customerId]: err instanceof Error ? err.message : "שגיאה בשיוך עובד",
      }));
    } finally {
      setAssigningCustomerId("");
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#F7F1EA] px-3 py-6 text-[#3A271D] sm:px-5 lg:px-7"
    >
      <div className="w-full max-w-none space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-[#E8D8C4] bg-white shadow-sm">
          <div className="relative p-5 sm:p-7">
            <div className="pointer-events-none absolute left-0 top-0 h-28 w-28 rounded-br-[4rem] bg-[#FFF7EC]" />

            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="inline-flex rounded-full border border-[#E8D8C4] bg-[#FFFCF7] px-4 py-2 text-xs font-black text-[#B87920]">
                  ניהול לקוחות
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  לקוחות ותיקי לקוח
                </h1>

                <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-[#8A6A43]">
                  כאן רואים את כל הלקוחות והלידים במקום אחד. לידים ניתן להקצות
                  לעובד לטיפול, ואז בשלב הבא הם יופיעו לעובד באזור “הלידים שלי”.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 xl:w-[520px]">
                <div className="flex rounded-[1.4rem] border border-[#E8D8C4] bg-[#FFFCF7] p-2 shadow-sm">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="חיפוש לפי שם, טלפון, מייל, שירות, Facebook או Make..."
                    className="h-12 min-w-0 flex-1 bg-transparent px-4 text-sm font-bold outline-none placeholder:text-[#B9A28A]"
                  />

                  <button
                    type="button"
                    onClick={loadCustomers}
                    className="h-12 rounded-2xl bg-[#3A271D] px-6 text-sm font-black text-white transition hover:bg-[#24170f]"
                  >
                    רענון
                  </button>
                </div>

                <p className="px-2 text-xs font-bold text-[#9A7A55]">
                  עובדים נטענים מהמערכת. שיוך עובד מופיע רק בתיקים שהם לידים.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
          <StatCard title="סה״כ תיקים" value={stats.total} tone="dark" />
          <StatCard title="סה״כ לידים" value={stats.leads} tone="amber" />
          <StatCard
            title="לידים משויכים"
            value={stats.assignedLeads}
            tone="indigo"
          />
          <StatCard
            title="לידים מפייסבוק"
            value={stats.facebookLeads}
            tone="blue"
          />
          <StatCard title="לקוחות פעילים" value={stats.active} tone="green" />
          <StatCard title="עם סבבי שיחות" value={stats.withCalls} tone="orange" />
          <StatCard
            title="שווי עסקאות"
            value={formatMoney(stats.totalRevenue)}
            tone="gold"
          />
        </section>

        <section className="rounded-[2rem] border border-[#E8D8C4] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex flex-col gap-2 px-1 sm:px-2">
            <h2 className="text-2xl font-black">כל הלקוחות והלידים</h2>
            <p className="text-sm font-semibold leading-6 text-[#8A6A43]">
              פרטי ליד ושיוך לעובד מוצגים רק כאשר מדובר בליד.
            </p>
          </div>

          {error ? (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-black text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-[1.5rem] border border-[#EFE3D4] bg-[#FFFCF7] px-5 py-12 text-center text-sm font-black text-[#8A6A43]">
              טוען לקוחות ולידים...
            </div>
          ) : customers.length === 0 ? (
            <div className="rounded-[1.5rem] border border-[#EFE3D4] bg-[#FFFCF7] px-5 py-12 text-center text-sm font-black text-[#8A6A43]">
              לא נמצאו לקוחות או לידים.
            </div>
          ) : (
            <div className="grid gap-4">
              {customers.map((customer) => {
                const customerId = String(customer._id);
                const userId = String(customer.userId || "");
                const facebookLead = isFacebookLead(customer);
                const leadCustomer = isLeadCustomer(customer);
                const interestedService = cleanText(customer.interestedService);
                const leadSourceLabel = getLeadSourceLabel(
                  customer.leadSource,
                  customer.leadProvider
                );
                const assignedStaff = getAssignedStaff(customer, staff);
                const selectedStaffId =
                  selectedStaffByCustomer[customerId] ||
                  getStaffId(assignedStaff || "");

                return (
                  <article
                    key={customerId}
                    className="rounded-[2rem] border border-[#E8D8C4] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
                  >
                    <div className="grid gap-5 xl:grid-cols-[minmax(260px,1.1fr)_minmax(0,3fr)_auto] xl:items-center">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#3A271D] text-lg font-black text-white shadow-sm">
                          {getInitials(customer.fullName)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-xl font-black text-[#3A271D]">
                              {customer.fullName || "לקוח ללא שם"}
                            </h3>

                            <Pill className={getStatusClass(customer.status)}>
                              {getStatusLabel(customer.status)}
                            </Pill>

                            {facebookLead ? (
                              <Pill className="bg-blue-50 text-blue-700 ring-blue-100">
                                ליד מפייסבוק
                              </Pill>
                            ) : null}

                            {leadCustomer && assignedStaff ? (
                              <Pill className="bg-emerald-50 text-emerald-700 ring-emerald-100">
                                משויך לעובד
                              </Pill>
                            ) : null}
                          </div>

                          <div className="mt-2 space-y-1 text-xs font-bold text-[#9A7A55]">
                            <p>תיק לקוח: {customerId.slice(-6)}</p>
                            <p>נוצר: {formatDateTime(customer.createdAt)}</p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${
                          leadCustomer ? "xl:grid-cols-6" : "xl:grid-cols-5"
                        }`}
                      >
                        <InfoItem label="טלפון" value={customer.phone || "-"} strong />
                        <InfoItem label="מייל" value={customer.email || "-"} />
                        <InfoItem
                          label="תאריך אירוע"
                          value={formatDate(customer.eventDate)}
                        />

                        {leadCustomer ? (
                          <>
                            <InfoItem
                              label="שירות מעניין"
                              value={interestedService || "-"}
                              strong
                            />

                            <InfoItem
                              label="מקור ליד"
                              value={
                                leadSourceLabel !== "-" ? (
                                  <div className="space-y-1">
                                    <div>{leadSourceLabel}</div>
                                    {customer.facebookLeadId ? (
                                      <div className="text-[11px] text-[#9A7A55]">
                                        Lead ID:{" "}
                                        {String(customer.facebookLeadId).slice(-8)}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : (
                                  "-"
                                )
                              }
                            />

                            <InfoItem
                              label="סטטוס ליד"
                              value={
                                <Pill
                                  className={getLeadStatusClass(
                                    customer.leadStatus || "new"
                                  )}
                                >
                                  {getLeadStatusLabel(customer.leadStatus || "new")}
                                </Pill>
                              }
                            />
                          </>
                        ) : (
                          <>
                            <InfoItem
                              label="חבילה / שירות"
                              value={customer.packageName || "-"}
                              strong
                            />

                            <InfoItem
                              label="סטטוס"
                              value={
                                <Pill className={getStatusClass(customer.status)}>
                                  {getStatusLabel(customer.status)}
                                </Pill>
                              }
                            />
                          </>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 xl:min-w-[150px]">
                        <Link
                          href={`/admin/customers/${customerId}`}
                          className="rounded-2xl bg-[#3A271D] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#24170f]"
                        >
                          תיק לקוח
                        </Link>

                        {userId ? (
                          <Link
                            href={`/admin/users?impersonate=${userId}`}
                            className="rounded-2xl border border-[#D9C3A8] bg-white px-5 py-3 text-center text-sm font-black text-[#3A271D] transition hover:bg-[#FFF7EC]"
                          >
                            כניסה ללקוח
                          </Link>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="cursor-not-allowed rounded-2xl border border-[#E8D8C4] bg-[#F7F1EA] px-5 py-3 text-center text-sm font-black text-[#B9A28A]"
                          >
                            אין משתמש
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 border-t border-[#F1E7DA] pt-4 sm:grid-cols-2 lg:grid-cols-4">
                      <InfoItem
                        label={leadCustomer ? "שירות מעניין" : "חבילה / שירות"}
                        value={
                          leadCustomer
                            ? interestedService || "-"
                            : customer.packageName || "-"
                        }
                      />

                      <InfoItem
                        label="סכום עסקה"
                        value={formatMoney(customer.totalPrice)}
                        strong
                      />

                      <InfoItem label="יתרה" value={formatMoney(customer.balance)} />

                      <InfoItem
                        label="סבבי שיחות"
                        value={
                          customer.hasCallRounds
                            ? `פעיל · ${customer.allowedCallRounds || 3} סבבים`
                            : "לא פעיל"
                        }
                      />
                    </div>

                    {leadCustomer ? (
                      <div className="mt-4 rounded-[1.5rem] border border-[#E8D8C4] bg-[#FFFCF7] p-4">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                          <div>
                            <h4 className="text-base font-black text-[#3A271D]">
                              הקצאת ליד לעובד
                            </h4>
                            <p className="mt-1 text-xs font-bold leading-5 text-[#8A6A43]">
                              בחרי עובד שיטפל בליד. לאחר השיוך הליד יופיע אצל
                              העובד באזור הלידים שלו.
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <Pill className="bg-white text-[#8A6A43] ring-[#E8D8C4]">
                                עובד נוכחי: {getStaffLabel(assignedStaff)}
                              </Pill>
                            </div>
                          </div>

                          <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
                            <select
                              value={selectedStaffId}
                              onChange={(event) =>
                                setSelectedStaffByCustomer((prev) => ({
                                  ...prev,
                                  [customerId]: event.target.value,
                                }))
                              }
                              disabled={staffLoading || assigningCustomerId === customerId}
                              className="h-12 min-w-[240px] rounded-2xl border border-[#D9C3A8] bg-white px-4 text-sm font-black text-[#3A271D] outline-none transition focus:border-[#C58B2B]"
                            >
                              <option value="">
                                {staffLoading ? "טוען עובדים..." : "בחר עובד"}
                              </option>

                              {staff.map((staffMember) => (
                                <option
                                  key={staffMember._id}
                                  value={String(staffMember._id)}
                                >
                                  {staffMember.name ||
                                    staffMember.email ||
                                    "עובד ללא שם"}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => handleAssignStaff(customerId)}
                              disabled={
                                assigningCustomerId === customerId ||
                                staffLoading ||
                                !selectedStaffId
                              }
                              className={`h-12 rounded-2xl px-5 text-sm font-black transition ${
                                assigningCustomerId === customerId ||
                                staffLoading ||
                                !selectedStaffId
                                  ? "cursor-not-allowed bg-[#E8D8C4] text-[#9A7A55]"
                                  : "bg-[#3A271D] text-white hover:bg-[#24170f]"
                              }`}
                            >
                              {assigningCustomerId === customerId
                                ? "משייך..."
                                : "הקצה ליד"}
                            </button>
                          </div>
                        </div>

                        {assignMessageByCustomer[customerId] ? (
                          <div className="mt-3 rounded-2xl border border-[#E8D8C4] bg-white px-4 py-3 text-xs font-black text-[#3A271D]">
                            {assignMessageByCustomer[customerId]}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {customer.venueName ||
                    customer.city ||
                    customer.campaignName ||
                    customer.adName ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {customer.venueName || customer.city ? (
                          <Pill className="bg-[#FFF7EC] text-[#B87920] ring-[#E8D8C4]">
                            {[customer.venueName, customer.city]
                              .filter(Boolean)
                              .join(" · ")}
                          </Pill>
                        ) : null}

                        {leadCustomer && customer.campaignName ? (
                          <Pill className="bg-stone-50 text-stone-700 ring-stone-100">
                            קמפיין: {customer.campaignName}
                          </Pill>
                        ) : null}

                        {leadCustomer && customer.adName ? (
                          <Pill className="bg-stone-50 text-stone-700 ring-stone-100">
                            מודעה: {customer.adName}
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
  tone,
}: {
  title: string;
  value: React.ReactNode;
  tone: "dark" | "amber" | "blue" | "green" | "orange" | "gold" | "indigo";
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber-700"
      : tone === "blue"
        ? "text-blue-700"
        : tone === "green"
          ? "text-emerald-700"
          : tone === "orange"
            ? "text-orange-700"
            : tone === "gold"
              ? "text-[#B87920]"
              : tone === "indigo"
                ? "text-indigo-700"
                : "text-[#3A271D]";

  return (
    <div className="rounded-[1.5rem] border border-[#E8D8C4] bg-white p-5 shadow-sm">
      <p className="text-xs font-black text-[#8A6A43]">{title}</p>
      <p className={`mt-3 text-3xl font-black ${toneClass}`}>{value}</p>
    </div>
  );
}