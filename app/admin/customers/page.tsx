"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminActionsItem,
  AdminActionsMenu,
  AdminFilterBar,
  AdminListPage,
  AdminLoadingState,
  AdminTableShell,
} from "@/app/components/admin/ui/AdminUI";

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

  if (
    cleanSource === "website" ||
    cleanSource === "website_support" ||
    cleanProvider === "website" ||
    cleanProvider === "support_widget"
  ) {
    return "אתר";
  }

  if (cleanSource) {
    return source || "-";
  }

  if (cleanProvider) {
    return provider || "-";
  }

  return "-";
}

function getStatusClass(status?: string) {
  switch (status) {
    case "active":
    case "paid":
      return "bg-emerald-50 text-emerald-700";
    case "quote_sent":
      return "bg-blue-50 text-blue-700";
    case "lead":
      return "bg-amber-50 text-amber-700";
    case "completed":
      return "bg-slate-50 text-slate-700";
    case "cancelled":
      return "bg-red-50 text-red-700";
    default:
      return "bg-stone-50 text-stone-700";
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
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [assignRowId, setAssignRowId] = useState<string | null>(null);

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
    <AdminListPage>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-[var(--admin-muted)]">
          לידים ולקוחות במקום אחד · {stats.total} תיקים · {stats.leads} לידים ·{" "}
          {formatMoney(stats.totalRevenue)} שווי
        </p>
        <button
          type="button"
          onClick={loadCustomers}
          className="inline-flex h-9 items-center rounded-[var(--admin-radius-sm)] bg-[var(--admin-brand)] px-3.5 text-xs font-bold text-white hover:bg-[var(--admin-brand-hover)]"
        >
          רענון
        </button>
      </div>

      <AdminFilterBar>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="חיפוש לפי שם, טלפון, מייל, שירות, Facebook או Make..."
          className="admin-input h-10 min-w-0 flex-1"
        />
      </AdminFilterBar>

      {error ? (
        <div className="rounded-[var(--admin-radius)] border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <AdminLoadingState text="טוען לקוחות ולידים…" />
      ) : (
        <AdminTableShell
          headers={[
            "שם",
            "אימייל",
            "טלפון",
            "תאריך אירוע",
            "סטטוס",
            "חבילה / שירות",
            "סכום",
            "מקור",
            "עובד",
            "פעולות",
          ]}
          isEmpty={customers.length === 0}
          empty="לא נמצאו לקוחות או לידים."
          footer={
            <>
              <span>
                מוצגים {customers.length} תיקים · פעילים {stats.active} · עם
                שיחות {stats.withCalls}
              </span>
              <span>
                לידים משויכים {stats.assignedLeads} · פייסבוק{" "}
                {stats.facebookLeads}
              </span>
            </>
          }
        >
          {customers.map((customer) => {
            const customerId = String(customer._id);
            const userId = String(customer.userId || "");
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
            const open = openActionsId === customerId;
            const packageOrService = leadCustomer
              ? interestedService || "—"
              : customer.packageName || "—";

            return (
              <tr
                key={customerId}
                className={open || assignRowId === customerId ? "actions-open" : undefined}
              >
                <td>
                  <span
                    className="cell-clip font-bold"
                    title={customer.fullName || ""}
                  >
                    {customer.fullName || "לקוח ללא שם"}
                  </span>
                </td>
                <td>
                  <span
                    className="cell-clip-wide text-[var(--admin-muted)]"
                    title={customer.email || ""}
                  >
                    {customer.email || "—"}
                  </span>
                </td>
                <td dir="ltr">{customer.phone || "—"}</td>
                <td>{formatDate(customer.eventDate)}</td>
                <td>
                  <span
                    className={`admin-row-badge ${getStatusClass(customer.status)}`}
                    title={
                      leadCustomer
                        ? getLeadStatusLabel(customer.leadStatus || "new")
                        : undefined
                    }
                  >
                    {getStatusLabel(customer.status)}
                  </span>
                </td>
                <td>
                  <span className="cell-clip" title={packageOrService}>
                    {packageOrService}
                  </span>
                </td>
                <td className="font-bold">
                  {formatMoney(customer.totalPrice)}
                </td>
                <td>
                  <span className="cell-clip-sm" title={leadSourceLabel}>
                    {leadCustomer ? leadSourceLabel : "—"}
                  </span>
                </td>
                <td>
                  <span
                    className="cell-clip-sm"
                    title={getStaffLabel(assignedStaff)}
                  >
                    {leadCustomer ? getStaffLabel(assignedStaff) : "—"}
                  </span>
                </td>
                <td className="admin-actions-cell">
                  <AdminActionsMenu
                    open={open}
                    onToggle={() =>
                      setOpenActionsId(open ? null : customerId)
                    }
                    onClose={() => setOpenActionsId(null)}
                  >
                    <Link
                      href={`/admin/customers/${customerId}`}
                      onClick={() => setOpenActionsId(null)}
                      className="text-[var(--admin-text)] hover:bg-gray-50"
                    >
                      תיק לקוח
                    </Link>
                    {userId ? (
                      <Link
                        href={`/admin/users?impersonate=${userId}`}
                        onClick={() => setOpenActionsId(null)}
                        className="text-[var(--admin-text)] hover:bg-gray-50"
                      >
                        כניסה ללקוח
                      </Link>
                    ) : (
                      <AdminActionsItem disabled>
                        אין משתמש מקושר
                      </AdminActionsItem>
                    )}
                    {leadCustomer ? (
                      <AdminActionsItem
                        onClick={() => {
                          setOpenActionsId(null);
                          setAssignRowId(customerId);
                        }}
                      >
                        הקצאת ליד לעובד
                      </AdminActionsItem>
                    ) : null}
                  </AdminActionsMenu>

                  {assignRowId === customerId ? (
                    <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-[280px] rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] bg-white p-3 shadow-md">
                      <p className="mb-2 text-[11px] font-bold text-[var(--admin-muted)]">
                        שיוך ליד · נוצר {formatDateTime(customer.createdAt)}
                      </p>
                      <select
                        value={selectedStaffId}
                        onChange={(event) =>
                          setSelectedStaffByCustomer((prev) => ({
                            ...prev,
                            [customerId]: event.target.value,
                          }))
                        }
                        disabled={
                          staffLoading || assigningCustomerId === customerId
                        }
                        className="admin-select mb-2 h-9"
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
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleAssignStaff(customerId)}
                          disabled={
                            assigningCustomerId === customerId ||
                            staffLoading ||
                            !selectedStaffId
                          }
                          className="inline-flex h-8 flex-1 items-center justify-center rounded-[var(--admin-radius-sm)] bg-[var(--admin-brand)] text-xs font-bold text-white disabled:opacity-50"
                        >
                          {assigningCustomerId === customerId
                            ? "משייך..."
                            : "הקצה"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssignRowId(null)}
                          className="inline-flex h-8 items-center justify-center rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] px-3 text-xs font-bold"
                        >
                          סגור
                        </button>
                      </div>
                      {assignMessageByCustomer[customerId] ? (
                        <p className="mt-2 text-[11px] font-bold text-[var(--admin-text)]">
                          {assignMessageByCustomer[customerId]}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </AdminTableShell>
      )}
    </AdminListPage>
  );
}