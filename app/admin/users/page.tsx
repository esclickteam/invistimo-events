"use client";

import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import CreateUserModal from "./CreateUserModal";
import {
  Search,
  Users,
  CalendarDays,
  UserRound,
  ShieldCheck,
  Crown,
  Phone,
  Pencil,
  Trash2,
  LogIn,
  X,
  Save,
  Sparkles,
  CreditCard,
  CheckCircle2,
  UserPlus,
  Loader2,
  ArrowUpCircle,
  PlusCircle,
  Banknote,
  ExternalLink,
} from "lucide-react";

/* =========================
   TYPES
========================= */
type AdminRole = "admin" | "user" | "producer" | "staff" | "client" | string;

type AdminUser = {
  _id: string;
  name?: string;
  email: string;
  role: AdminRole;

  plan?: string;
  packageName?: string;
  priceKey?: string;

  guests?: number;
  maxGuests?: number;
  smsLimit?: number;
  maxMessages?: number;

  includeCalls?: boolean;
  callsRounds?: number;
  callsAddonPrice?: number;

  includeCreditGifts?: boolean;
  creditGiftsAddonPrice?: number;

  includeDigitalSeating?: boolean;
  includeEventManagement?: boolean;
  includeCustomDesign?: boolean;

  paidAmount?: number;
  totalPaid?: number;
  createdAt?: string;
  eventDate?: string;

  assignedProducerId?: string | null;
  assignedStaffIds?: string[];

  assignedProducerEmail?: string;
  assignedStaffEmail?: string;

  messageRounds?: AdminMessageRounds;
};

type MessageRoundStatus = {
  key: string;
  label: string;
  done: boolean;
  blocked: boolean;
  sentAt?: string | null;
  scheduledAt?: string | null;
};

type AdminMessageRounds = {
  rsvp: MessageRoundStatus[];
  reminder: MessageRoundStatus[];
  thankyou: MessageRoundStatus[];
};

type Assignee = {
  _id: string;
  name?: string;
  email?: string;
};

type AdminPricingPlan = {
  key: string;
  label: string;
  includeCalls?: boolean;
  includeCreditGifts?: boolean;
  includeDigitalSeating?: boolean;
  includeEventManagement?: boolean;
  includeCustomDesign?: boolean;
};

type AdminRecordOption = {
  key?: string;
  label: string;
  records: number;
  sms?: number;
  prices: Record<string, number>;
};

type EditFormState = {
  name: string;
  email: string;
  eventDate: string;
  assignedProducerId: string | null;
  assignedStaffIds: string[];
};

type UpgradeFormState = {
  plan: string;
  includeCalls: boolean;
  includeCreditGifts: boolean;
  includeDigitalSeating: boolean;
  includeEventManagement: boolean;
  includeCustomDesign: boolean;
};

type UpgradePaymentMode = "manual_paid" | "stripe";

/* =========================
   CONSTS
========================= */
const AUTO_REFRESH_MS = 10000;

const ADDONS = [
  {
    key: "includeCalls",
    label: "שירות שיחות",
    price: 0,
  },
  {
    key: "includeCreditGifts",
    label: "מתנות באשראי",
    price: 0,
  },
  {
    key: "includeDigitalSeating",
    label: "הושבה דיגיטלית",
    price: 0,
  },
  {
    key: "includeEventManagement",
    label: "מערכת ניהול אירוע",
    price: 0,
  },
  {
    key: "includeCustomDesign",
    label: "עיצוב בהתאמה אישית",
    price: 0,
  },
] as const;

/* =========================
   HELPERS
========================= */
function formatDate(value?: string) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("he-IL");
  } catch {
    return "—";
  }
}

function formatDateInput(value?: string) {
  if (!value) return "";

  try {
    return new Date(value).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function formatMoney(value?: number) {
  return `${Number(value || 0).toLocaleString("he-IL")} ₪`;
}

function normalizeText(value?: string) {
  return String(value || "").trim().toLowerCase();
}

function getPlanKey(user: AdminUser) {
  return user.priceKey || user.plan || user.packageName || "";
}

function getPlanInfo(planKey?: string, pricingPlans?: AdminPricingPlan[]) {
  if (!planKey) return null;

  return (
    pricingPlans?.find((p) => p.key === planKey) ||
    pricingPlans?.find((p) => p.label === planKey) ||
    null
  );
}

function getPlanLabel(user: AdminUser, pricingPlans?: AdminPricingPlan[]) {
  const planKey = getPlanKey(user);
  const plan = getPlanInfo(planKey, pricingPlans);

  return plan?.label || user.packageName || user.plan || user.priceKey || "—";
}

function getUserRecords(user: AdminUser) {
  return Number(user.maxGuests || user.guests || 0);
}

function getUserSmsLimit(user: AdminUser) {
  return Number(user.smsLimit || user.maxMessages || 0);
}

function getRecordOptionForUser(
  user: AdminUser,
  recordOptions?: AdminRecordOption[]
) {
  const records = getUserRecords(user);

  if (!recordOptions?.length) return null;

  const sortedOptions = [...recordOptions].sort(
    (a, b) => Number(a.records) - Number(b.records)
  );

  const exact = sortedOptions.find(
    (option) => Number(option.records) === records
  );

  if (exact) return exact;

  const lowerOptions = sortedOptions.filter(
    (option) => Number(option.records) < records
  );

  return lowerOptions[lowerOptions.length - 1] || sortedOptions[0];
}

function getPriceForRecordOption(
  planKey: string,
  recordOption?: AdminRecordOption | null
) {
  if (!planKey || !recordOption) return 0;

  return Number(recordOption.prices?.[planKey] || 0);
}

function getPriceByPlanAndRecords(
  planKey: string,
  records: number,
  recordOptions?: AdminRecordOption[]
) {
  if (!planKey || !records || !recordOptions?.length) return 0;

  const option =
    recordOptions.find((item) => Number(item.records) === Number(records)) ||
    recordOptions.find((item) => Number(item.records) >= Number(records)) ||
    recordOptions[recordOptions.length - 1];

  return getPriceForRecordOption(planKey, option);
}

function getCallsStatus(user: AdminUser) {
  if (!user.includeCalls) return "לא פעיל";

  if (
    typeof user.callsAddonPrice === "number" &&
    user.callsAddonPrice > 0
  ) {
    return `פעיל · ${formatMoney(user.callsAddonPrice)}`;
  }

  return "פעיל";
}

function getRoleLabel(role: AdminRole) {
  const labels: Record<string, string> = {
    admin: "אדמין",
    user: "משתמש",
    producer: "מפיק",
    staff: "עובד",
    client: "לקוח",
  };

  return labels[role] || role || "—";
}

function getAddonValue(user: AdminUser, key: (typeof ADDONS)[number]["key"]) {
  return Boolean(user[key]);
}

function getUserTotalPaid(user: AdminUser) {
  return Number(user.totalPaid || user.paidAmount || 0);
}

function getPurchasedItems(
  user: AdminUser,
  pricingPlans?: AdminPricingPlan[],
  recordOptions?: AdminRecordOption[]
) {
  const records = getUserRecords(user);
  const recordOption = getRecordOptionForUser(user, recordOptions);

  return [
    {
      label: "חבילה",
      value: getPlanLabel(user, pricingPlans),
      active: true,
    },
    {
      label: "כמות רשומות / אורחים",
      value: recordOption?.label || String(records || 0),
      active: true,
    },
    {
      label: "כמות הודעות SMS",
      value: String(getUserSmsLimit(user) || recordOption?.sms || 0),
      active: true,
    },
    {
      label: "שירות שיחות",
      value: getCallsStatus(user),
      active: Boolean(user.includeCalls),
    },
    {
      label: "מתנות באשראי",
      value: user.includeCreditGifts ? "פעיל" : "לא פעיל",
      active: Boolean(user.includeCreditGifts),
    },
    {
      label: "הושבה דיגיטלית",
      value: user.includeDigitalSeating ? "פעיל" : "לא פעיל",
      active: Boolean(user.includeDigitalSeating),
    },
    {
      label: "מערכת ניהול אירוע",
      value: user.includeEventManagement ? "פעיל" : "לא פעיל",
      active: Boolean(user.includeEventManagement),
    },
    {
      label: "עיצוב בהתאמה אישית",
      value: user.includeCustomDesign ? "פעיל" : "לא פעיל",
      active: Boolean(user.includeCustomDesign),
    },
  ];
}

function getDefaultMessageRounds(): AdminMessageRounds {
  return {
    rsvp: [1, 2, 3].map((round) => ({
      key: `rsvp_${round}`,
      label: `אישורי הגעה סבב ${round}`,
      done: false,
      blocked: false,
      sentAt: null,
      scheduledAt: null,
    })),
    reminder: [
      {
        key: "reminder",
        label: "סבב תזכורת",
        done: false,
        blocked: false,
        sentAt: null,
        scheduledAt: null,
      },
    ],
    thankyou: [
      {
        key: "thankyou",
        label: "סבב תודה",
        done: false,
        blocked: false,
        sentAt: null,
        scheduledAt: null,
      },
    ],
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return null;

  try {
    return new Date(value).toLocaleString("he-IL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
}

/* =========================
   PAGE
========================= */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pricingPlans, setPricingPlans] = useState<AdminPricingPlan[]>([]);
  const [recordOptions, setRecordOptions] = useState<AdminRecordOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [openCreate, setOpenCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [upgradingUser, setUpgradingUser] = useState<AdminUser | null>(null);

  const [producers, setProducers] = useState<Assignee[]>([]);
  const [staff, setStaff] = useState<Assignee[]>([]);

  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("future");

  async function loadUsers(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const res = await fetch("/api/admin/users", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed loading users:", err);
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  async function loadPackages() {
    try {
      const res = await fetch("/api/admin/packages", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!data.success) {
        setPricingPlans([]);
        setRecordOptions([]);
        return;
      }

      setPricingPlans(Array.isArray(data.plans) ? data.plans : []);
      setRecordOptions(
        Array.isArray(data.recordOptions) ? data.recordOptions : []
      );
    } catch (err) {
      console.error("Failed loading admin packages:", err);
      setPricingPlans([]);
      setRecordOptions([]);
    }
  }

  async function loadAssignees() {
    try {
      const res = await fetch("/api/admin/assignees", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (data.success) {
        setProducers(data.producers || []);
        setStaff(data.staff || []);
      }
    } catch (err) {
      console.error("Failed loading assignees:", err);
    }
  }

  async function impersonateUser(userId: string) {
    setImpersonating(userId);

    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (!data.success) {
        alert("כניסה בהתחזות נכשלה");
        return;
      }

      if (data.role === "producer") {
        window.location.href = "/producer/dashboard";
      } else if (data.role === "staff") {
        window.location.href = "/producer-staff/dashboard";
      } else {
        window.location.href = "/dashboard";
      }
    } finally {
      setImpersonating(null);
    }
  }

  async function removeUser(userId: string) {
    const confirmed = confirm("האם למחוק את המשתמש לצמיתות?");

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!data.success) {
        alert("מחיקת המשתמש נכשלה");
        return;
      }

      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (error) {
      console.error(error);
      alert("אירעה שגיאה במחיקה");
    }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("adminHiddenUsers");

    if (stored) {
      try {
        setHiddenUserIds(JSON.parse(stored));
      } catch {
        setHiddenUserIds([]);
      }
    }

    loadUsers(true);
    loadPackages();
    loadAssignees();

    const intervalId = window.setInterval(() => {
      loadUsers(false);
      loadPackages();
    }, AUTO_REFRESH_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return users
      .filter((u) => !hiddenUserIds.includes(u._id))
      .filter((u) => {
        const q = normalizeText(search);

        const matchesSearch =
          !q ||
          normalizeText(u.name).includes(q) ||
          normalizeText(u.email).includes(q) ||
          normalizeText(getPlanLabel(u, pricingPlans)).includes(q);

        const matchesRole = roleFilter === "all" || u.role === roleFilter;

        let matchesEvent = true;

        if (eventFilter === "future") {
          matchesEvent = !!u.eventDate && new Date(u.eventDate) >= today;
        }

        if (eventFilter === "past") {
          matchesEvent = !!u.eventDate && new Date(u.eventDate) < today;
        }

        if (eventFilter === "noDate") {
          matchesEvent = !u.eventDate;
        }

        return matchesSearch && matchesRole && matchesEvent;
      });
  }, [
    users,
    hiddenUserIds,
    search,
    roleFilter,
    eventFilter,
    pricingPlans,
  ]);

  const stats = useMemo(() => {
    return {
      total: filteredUsers.length,
      calls: filteredUsers.filter((u) => u.includeCalls).length,
      future: filteredUsers.filter(
        (u) => u.eventDate && new Date(u.eventDate) >= new Date()
      ).length,
    };
  }, [filteredUsers]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[#6B5A48]">
        <Loader2 className="ml-2 animate-spin" size={22} />
        טוען משתמשים…
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F6F4F1] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section
          className="
            rounded-[32px]
            border border-[#E7D8C6]
            bg-gradient-to-br from-[#FFFDF8] to-[#F3E7D8]
            p-5 md:p-7
            shadow-[0_18px_55px_rgba(60,43,25,0.08)]
          "
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div
                className="
                  mb-3 inline-flex items-center gap-2
                  rounded-full
                  bg-white/70
                  px-4 py-2
                  text-xs font-black
                  text-[#8A6A43]
                  ring-1 ring-[#E7D8C6]
                "
              >
                <ShieldCheck size={15} />
                Admin Panel
              </div>

              <h1 className="text-3xl font-black text-[#352618] md:text-5xl">
                ניהול משתמשים
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#7B6754]">
                ניהול לקוחות, חבילות, הרשאות, מטפלים, שדרוגים וכניסה בהתחזות.
              </p>
            </div>

            <button
              onClick={() => setOpenCreate(true)}
              className="
                flex h-12 items-center justify-center gap-2
                rounded-2xl
                bg-[#24190F]
                px-5
                text-sm font-black
                text-white
                shadow-[0_12px_30px_rgba(36,25,15,0.22)]
                transition
                hover:bg-black
              "
            >
              <UserPlus size={18} />
              יצירת משתמש
            </button>
          </div>
        </section>

        <section
          className="
            rounded-[28px]
            border border-[#E7D8C6]
            bg-white
            p-4 md:p-5
            shadow-[0_14px_40px_rgba(60,43,25,0.06)]
          "
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px_180px]">
            <div
              className="
                flex h-12 items-center gap-3
                rounded-2xl
                border border-[#E7D8C6]
                bg-[#FFFDF8]
                px-4
              "
            >
              <Search size={18} className="text-[#9A7A52]" />
              <input
                type="text"
                placeholder="חיפוש לפי שם, אימייל או חבילה..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="
                  w-full bg-transparent
                  text-sm font-semibold
                  text-[#3A2A1C]
                  outline-none
                  placeholder:text-[#B6A28C]
                "
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="
                h-12 rounded-2xl
                border border-[#E7D8C6]
                bg-[#FFFDF8]
                px-4
                text-sm font-bold
                text-[#3A2A1C]
                outline-none
              "
            >
              <option value="all">כל המשתמשים</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="producer">Producer</option>
              <option value="staff">Staff</option>
              <option value="client">Client</option>
            </select>

            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="
                h-12 rounded-2xl
                border border-[#E7D8C6]
                bg-[#FFFDF8]
                px-4
                text-sm font-bold
                text-[#3A2A1C]
                outline-none
              "
            >
              <option value="future">אירועים עתידיים</option>
              <option value="past">אירועים שעברו</option>
              <option value="noDate">ללא תאריך</option>
              <option value="all">הכל</option>
            </select>

            <div
              className="
                flex h-12 items-center justify-center
                rounded-2xl
                bg-[#F6EBDD]
                px-4
                text-sm font-black
                text-[#8A5A24]
              "
            >
              נמצאו {stats.total} משתמשים
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoCard
            title="משתמשים מוצגים"
            value={String(stats.total)}
            icon={<Users size={22} />}
          />

          <InfoCard
            title="שירות שיחות פעיל"
            value={String(stats.calls)}
            icon={<Phone size={22} />}
          />

          <InfoCard
            title="אירועים עתידיים"
            value={String(stats.future)}
            icon={<CalendarDays size={22} />}
          />
        </section>

        <section
          className="
            hidden overflow-hidden rounded-[28px]
            border border-[#E7D8C6]
            bg-white
            shadow-[0_18px_55px_rgba(60,43,25,0.07)]
            xl:block
          "
        >
          <table className="min-w-full text-right">
            <thead className="bg-[#FFF9EF] text-xs font-black text-[#7B6754]">
              <tr>
                <th className="p-4">שם</th>
                <th className="p-4">אימייל</th>
                <th className="p-4">תפקיד</th>
                <th className="p-4">חבילה</th>
                <th className="p-4">רשומות</th>
                <th className="p-4">תאריך אירוע</th>
                <th className="p-4">מפיק מטפל</th>
                <th className="p-4">עובד מטפל</th>
                <th className="p-4">שירות שיחות</th>
                <th className="p-4">פעולות</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EFE2D1]">
              {filteredUsers.map((u) => (
                <tr key={u._id} className="text-sm hover:bg-[#FFFDF8]">
                  <td className="p-4 font-black text-[#3A2A1C]">
                    {u.name || "—"}
                  </td>

                  <td className="p-4 text-[#6B5A48]">{u.email}</td>

                  <td className="p-4">
                    <RoleBadge role={u.role} />
                  </td>

                  <td className="p-4 font-bold text-[#6B5A48]">
                    {getPlanLabel(u, pricingPlans)}
                  </td>

                  <td className="p-4 font-black text-[#3A2A1C]">
                    {getUserRecords(u)}
                  </td>

                  <td className="p-4 text-[#6B5A48]">
                    {formatDate(u.eventDate)}
                  </td>

                  <td className="p-4 text-[#6B5A48]">
                    {producers.find((p) => p._id === u.assignedProducerId)
                      ?.name || "—"}
                  </td>

                  <td className="p-4 text-[#6B5A48]">
                    {staff.find((s) => s._id === u.assignedStaffIds?.[0])
                      ?.name || "—"}
                  </td>

                  <td className="p-4">
                    <StatusBadge active={Boolean(u.includeCalls)}>
                      {getCallsStatus(u)}
                    </StatusBadge>
                  </td>

                  <td className="p-4">
                    <div className="grid w-[230px] grid-cols-2 gap-2">
                      <ActionButton
                        onClick={() => setEditingUser(u)}
                        icon={<Pencil size={14} />}
                      >
                        עריכה
                      </ActionButton>

                      <ActionButton
                        onClick={() => setUpgradingUser(u)}
                        icon={<ArrowUpCircle size={14} />}
                        tone="gold"
                      >
                        שדרוג
                      </ActionButton>

                      {u.role !== "admin" && (
                        <ActionButton
                          onClick={() => impersonateUser(u._id)}
                          icon={
                            impersonating === u._id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <LogIn size={14} />
                            )
                          }
                          tone="blue"
                        >
                          התחזות
                        </ActionButton>
                      )}

                      {u.role !== "admin" && (
                        <ActionButton
                          onClick={() => removeUser(u._id)}
                          icon={<Trash2 size={14} />}
                          tone="red"
                        >
                          מחק
                        </ActionButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[#7B6754]">
                    לא נמצאו משתמשים
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:hidden">
          {filteredUsers.map((u) => (
            <div
              key={u._id}
              className="
                rounded-[26px]
                border border-[#E7D8C6]
                bg-white
                p-4
                shadow-[0_14px_40px_rgba(60,43,25,0.06)]
              "
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-black text-[#3A2A1C]">
                    {u.name || "—"}
                  </div>

                  <div className="mt-1 text-sm font-semibold text-[#7B6754]">
                    {u.email}
                  </div>
                </div>

                <RoleBadge role={u.role} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <MiniDetail
                  label="חבילה"
                  value={getPlanLabel(u, pricingPlans)}
                />
                <MiniDetail
                  label="רשומות"
                  value={String(getUserRecords(u))}
                />
                <MiniDetail
                  label="תאריך אירוע"
                  value={formatDate(u.eventDate)}
                />
                <MiniDetail label="שיחות" value={getCallsStatus(u)} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <ActionButton
                  onClick={() => setEditingUser(u)}
                  icon={<Pencil size={14} />}
                >
                  עריכה
                </ActionButton>

                <ActionButton
                  onClick={() => setUpgradingUser(u)}
                  icon={<ArrowUpCircle size={14} />}
                  tone="gold"
                >
                  שדרוג
                </ActionButton>

                {u.role !== "admin" && (
                  <ActionButton
                    onClick={() => impersonateUser(u._id)}
                    icon={<LogIn size={14} />}
                    tone="blue"
                  >
                    התחזות
                  </ActionButton>
                )}

                {u.role !== "admin" && (
                  <ActionButton
                    onClick={() => removeUser(u._id)}
                    icon={<Trash2 size={14} />}
                    tone="red"
                  >
                    מחק
                  </ActionButton>
                )}
              </div>
            </div>
          ))}
        </section>
      </div>

      {openCreate && (
        <CreateUserModal
          onClose={() => {
            setOpenCreate(false);
            loadUsers(false);
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          pricingPlans={pricingPlans}
          recordOptions={recordOptions}
          producers={producers}
          staff={staff}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            loadUsers(false);
          }}
        />
      )}

      {upgradingUser && (
        <UpgradeUserModal
          user={upgradingUser}
          pricingPlans={pricingPlans}
          recordOptions={recordOptions}
          onClose={() => setUpgradingUser(null)}
          onSaved={() => {
            setUpgradingUser(null);
            loadUsers(false);
          }}
        />
      )}
    </div>
  );
}

/* =========================
   EDIT USER MODAL
========================= */
function EditUserModal({
  user,
  pricingPlans,
  recordOptions,
  producers,
  staff,
  onClose,
  onSaved,
}: {
  user: AdminUser;
  pricingPlans: AdminPricingPlan[];
  recordOptions: AdminRecordOption[];
  producers: Assignee[];
  staff: Assignee[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<EditFormState>({
    name: user.name || "",
    email: user.email || "",
    eventDate: formatDateInput(user.eventDate),
    assignedProducerId: user.assignedProducerId || null,
    assignedStaffIds: user.assignedStaffIds || [],
  });

  async function saveChanges() {
    try {
      setSaving(true);

      await fetch(`/api/admin/users/${user._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          eventDate: form.eventDate,
        }),
      });

      await fetch(`/api/admin/users/${user._id}/assignees`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignedProducerId: form.assignedProducerId,
          assignedStaffIds: form.assignedStaffIds,
        }),
      });

      onSaved();
    } catch (err) {
      console.error(err);
      alert("שמירת השינויים נכשלה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title="עריכת משתמש"
      subtitle="עריכת פרטי לקוח, הרשאות ומטפלים"
      onClose={onClose}
    >
      <div className="space-y-7">
        <section
          className="
            rounded-[26px]
            border border-[#E7D8C6]
            bg-[#FFFDF8]
            p-5
          "
        >
          <div className="mb-4 flex items-center gap-2">
            <CreditCard size={20} className="text-[#B97821]" />
            <h3 className="text-lg font-black text-[#3A2A1C]">
              מה הלקוח רכש
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {getPurchasedItems(user, pricingPlans, recordOptions).map(
              (item) => (
                <div
                  key={item.label}
                  className="
                    flex items-center justify-between gap-3
                    rounded-2xl
                    border border-[#EFE2D1]
                    bg-white
                    px-4 py-3
                    text-sm
                  "
                >
                  <span className="font-bold text-[#7B6754]">
                    {item.label}
                  </span>

                  <span
                    className={`font-black ${
                      item.active ? "text-[#3A2A1C]" : "text-[#9B9187]"
                    }`}
                  >
                    {item.value}
                  </span>
                </div>
              )
            )}
          </div>

          <div
            className="
              mt-4 flex items-center justify-between
              rounded-2xl
              bg-[#FFF2D8]
              px-4 py-3
            "
          >
            <span className="font-black text-[#7B6754]">סה״כ ששולם</span>
            <span className="text-2xl font-black text-[#B97821]">
              {formatMoney(getUserTotalPaid(user))}
            </span>
          </div>
        </section>

        <AdminMessageRoundsPanel
          user={user}
          onChanged={onSaved}
        />

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <InputField
            label="שם מלא"
            value={form.name}
            onChange={(value) => setForm((p) => ({ ...p, name: value }))}
          />

          <InputField
            label="אימייל"
            type="email"
            value={form.email}
            onChange={(value) => setForm((p) => ({ ...p, email: value }))}
          />

          <InputField
            label="תאריך אירוע"
            type="date"
            value={form.eventDate}
            onChange={(value) => setForm((p) => ({ ...p, eventDate: value }))}
          />
        </section>

        <section className="border-t border-[#EFE2D1] pt-6">
          <h3 className="mb-4 text-lg font-black text-[#3A2A1C]">מטפלים</h3>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-black text-[#6B5A48]">
                מפיק מטפל
              </span>

              <select
                className="
                  h-12 w-full rounded-2xl
                  border border-[#E7D8C6]
                  bg-white px-4
                  text-sm font-bold
                  outline-none
                "
                value={form.assignedProducerId ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    assignedProducerId: e.target.value || null,
                  }))
                }
              >
                <option value="">ללא מפיק</option>

                {producers.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name || p.email}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-black text-[#6B5A48]">
                עובדים מטפלים
              </span>

              <select
                multiple
                className="
                  h-36 w-full rounded-2xl
                  border border-[#E7D8C6]
                  bg-white px-4 py-3
                  text-sm font-bold
                  outline-none
                "
                value={form.assignedStaffIds}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    assignedStaffIds: Array.from(
                      e.target.selectedOptions,
                      (o) => o.value
                    ),
                  }))
                }
              >
                {staff.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name || s.email}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      </div>

      <ModalFooter>
        <button
          onClick={onClose}
          className="h-12 rounded-2xl bg-[#ECE7E1] px-6 font-black text-[#6B5A48]"
        >
          ביטול
        </button>

        <button
          onClick={saveChanges}
          disabled={saving}
          className="
            flex h-12 items-center justify-center gap-2
            rounded-2xl bg-black px-7
            font-black text-white
            disabled:opacity-50
          "
        >
          {saving ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Save size={18} />
          )}
          שמור שינויים
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

/* =========================
   MESSAGE ROUNDS PANEL
========================= */
function AdminMessageRoundsPanel({
  user,
  onChanged,
}: {
  user: AdminUser;
  onChanged: () => void;
}) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const rounds = user.messageRounds || getDefaultMessageRounds();

  async function updateRound(action: "reset" | "block" | "unblock", key: string) {
    const confirmText =
      action === "reset"
        ? "לפתוח מחדש את הסבב הזה?"
        : action === "block"
          ? "לחסום את הסבב הזה?"
          : "לבטל חסימה לסבב הזה?";

    if (!confirm(confirmText)) return;

    try {
      setLoadingKey(`${action}-${key}`);

      const res = await fetch(`/api/admin/users/${user._id}/message-rounds`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          key,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        alert("עדכון הסבב נכשל");
        return;
      }

      onChanged();
    } catch (err) {
      console.error(err);
      alert("שגיאה בעדכון הסבב");
    } finally {
      setLoadingKey(null);
    }
  }

  const sections = [
    {
      title: "אישורי הגעה",
      subtitle: "לפי סבב, בלי קשר אם נשלח ב־WhatsApp או SMS",
      items: rounds.rsvp,
    },
    {
      title: "סבב תזכורת",
      subtitle: "תזכורת / מספר שולחן",
      items: rounds.reminder,
    },
    {
      title: "סבב תודה",
      subtitle: "הודעת תודה לאחר האירוע",
      items: rounds.thankyou,
    },
  ];

  return (
    <section
      className="
        rounded-[26px]
        border border-[#E7D8C6]
        bg-white
        p-5
      "
    >
      <div className="mb-5">
        <h3 className="text-lg font-black text-[#3A2A1C]">
          סבבי הודעות
        </h3>

        <p className="mt-1 text-xs font-bold text-[#8A7867]">
          אישורי הגעה סבב 1–3, תזכורת ותודה — כולל סטטוס, פתיחה מחדש וחסימה.
        </p>
      </div>

      <div className="space-y-5">
        {sections.map((section) => (
          <div
            key={section.title}
            className="
              rounded-2xl
              border border-[#EFE2D1]
              bg-[#FFFDF8]
              p-4
            "
          >
            <div className="mb-3">
              <div className="font-black text-[#3A2A1C]">
                {section.title}
              </div>

              <div className="mt-1 text-xs font-bold text-[#8A7867]">
                {section.subtitle}
              </div>
            </div>

            <div className="space-y-3">
              {section.items.map((round) => {
                const isLoading =
                  loadingKey === `reset-${round.key}` ||
                  loadingKey === `block-${round.key}` ||
                  loadingKey === `unblock-${round.key}`;

                const sentAtText = formatDateTime(round.sentAt);
                const scheduledAtText = formatDateTime(round.scheduledAt);

                return (
                  <div
                    key={round.key}
                    className="
                      flex flex-col gap-3
                      rounded-2xl
                      border border-[#EFE2D1]
                      bg-white
                      px-4 py-3
                      md:flex-row
                      md:items-center
                      md:justify-between
                    "
                  >
                    <div>
                      <div className="font-black text-[#3A2A1C]">
                        {round.label}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                        <span
                          className={`
                            rounded-full px-3 py-1
                            ${
                              round.done
                                ? "bg-[#EAF8EF] text-[#1F9A55]"
                                : "bg-[#F6F1EA] text-[#7B6754]"
                            }
                          `}
                        >
                          {round.done ? "בוצע" : "טרם בוצע"}
                        </span>

                        {round.blocked && (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-red-600">
                            חסום
                          </span>
                        )}

                        {scheduledAtText && !round.done && (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-600">
                            מתוזמן · {scheduledAtText}
                          </span>
                        )}

                        {sentAtText && round.done && (
                          <span className="rounded-full bg-[#FFF2D8] px-3 py-1 text-[#9A651B]">
                            נשלח · {sentAtText}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:w-[240px]">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => updateRound("reset", round.key)}
                        className="
                          h-9 rounded-full
                          bg-[#B97821]
                          px-4
                          text-xs font-black
                          text-white
                          disabled:opacity-50
                        "
                      >
                        פתיחה מחדש
                      </button>

                      {round.blocked ? (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => updateRound("unblock", round.key)}
                          className="
                            h-9 rounded-full
                            bg-[#2F3742]
                            px-4
                            text-xs font-black
                            text-white
                            disabled:opacity-50
                          "
                        >
                          בטל חסימה
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => updateRound("block", round.key)}
                          className="
                            h-9 rounded-full
                            bg-red-600
                            px-4
                            text-xs font-black
                            text-white
                            disabled:opacity-50
                          "
                        >
                          חסימה
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =========================
   UPGRADE MODAL
========================= */
function UpgradeUserModal({
  user,
  pricingPlans,
  recordOptions,
  onClose,
  onSaved,
}: {
  user: AdminUser;
  pricingPlans: AdminPricingPlan[];
  recordOptions: AdminRecordOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const [paymentMode, setPaymentMode] =
    useState<UpgradePaymentMode>("manual_paid");

  const currentPlanKey = user.priceKey || user.plan || "";
  const currentRecords = getUserRecords(user);
  const currentRecordOption = getRecordOptionForUser(user, recordOptions);

  const currentPlan =
    pricingPlans.find((plan) => plan.key === currentPlanKey) || null;

  const [form, setForm] = useState<UpgradeFormState>({
    plan: currentPlanKey || pricingPlans[0]?.key || "",
    includeCalls: Boolean(user.includeCalls),
    includeCreditGifts: Boolean(user.includeCreditGifts),
    includeDigitalSeating: Boolean(user.includeDigitalSeating),
    includeEventManagement: Boolean(user.includeEventManagement),
    includeCustomDesign: Boolean(user.includeCustomDesign),
  });

  const [selectedRecords, setSelectedRecords] = useState<number>(
    currentRecordOption?.records || currentRecords || 0
  );

  const initialExtraRecords = Math.max(
    0,
    currentRecords - Number(currentRecordOption?.records || currentRecords || 0)
  );

  const [extraRecords, setExtraRecords] = useState(initialExtraRecords);
  const [extraRecordsAmount, setExtraRecordsAmount] = useState(0);
  const [manualTotalToPay, setManualTotalToPay] = useState(0);

  const selectedPlan =
    pricingPlans.find((plan) => plan.key === form.plan) || null;

  const selectedRecordOption =
    recordOptions.find(
      (option) => Number(option.records) === Number(selectedRecords)
    ) || null;

  const currentPackagePrice = getPriceForRecordOption(
    currentPlanKey,
    currentRecordOption
  );

  const selectedPackagePrice = getPriceForRecordOption(
    form.plan,
    selectedRecordOption
  );

  const packageDiff = Math.max(
    0,
    selectedPackagePrice - currentPackagePrice
  );

  const addonsDiff = ADDONS.reduce((sum, addon) => {
    const isSelected = Boolean(form[addon.key]);
    const alreadyOwned = getAddonValue(user, addon.key);

    if (!isSelected || alreadyOwned) return sum;

    return sum + addon.price;
  }, 0);

  const calculatedTotalToPay =
    packageDiff + addonsDiff + Number(extraRecordsAmount || 0);

  useEffect(() => {
    setManualTotalToPay(calculatedTotalToPay);
  }, [calculatedTotalToPay]);

  const finalRecords =
    Number(selectedRecords || 0) + Number(extraRecords || 0);

  const finalSmsLimit = Number(
    selectedRecordOption?.sms || user.smsLimit || user.maxMessages || 0
  );

  const canSubmit =
    Boolean(form.plan) &&
    Boolean(selectedRecords) &&
    manualTotalToPay >= 0;

  async function saveManualPaidUpgrade() {
    const res = await fetch(`/api/admin/users/${user._id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan: form.plan,
        priceKey: form.plan,
        packageName: selectedPlan?.label || form.plan,

        guests: finalRecords,
        maxGuests: finalRecords,
        smsLimit: finalSmsLimit,
        maxMessages: finalSmsLimit,

        includeCalls: form.includeCalls,
        includeCreditGifts: form.includeCreditGifts,
        includeDigitalSeating: form.includeDigitalSeating,
        includeEventManagement: form.includeEventManagement,
        includeCustomDesign: form.includeCustomDesign,

        extraRecords,
        extraRecordsAmount,

        upgradeAmount: manualTotalToPay,
        upgradePaymentStatus: "paid",
        upgradePaymentMethod: "manual_admin",
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || data?.success === false) {
      throw new Error("MANUAL_UPGRADE_FAILED");
    }
  }

  async function createStripeUpgradeCheckout() {
    const res = await fetch(`/api/admin/users/${user._id}/upgrade-stripe`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: manualTotalToPay,

        plan: form.plan,
        priceKey: form.plan,
        packageName: selectedPlan?.label || form.plan,

        guests: finalRecords,
        maxGuests: finalRecords,
        smsLimit: finalSmsLimit,
        maxMessages: finalSmsLimit,

        includeCalls: form.includeCalls,
        includeCreditGifts: form.includeCreditGifts,
        includeDigitalSeating: form.includeDigitalSeating,
        includeEventManagement: form.includeEventManagement,
        includeCustomDesign: form.includeCustomDesign,

        extraRecords,
        extraRecordsAmount,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || data?.success === false) {
      throw new Error("STRIPE_CHECKOUT_FAILED");
    }

    const checkoutUrl = data?.url || data?.checkoutUrl;

    if (!checkoutUrl) {
      throw new Error("MISSING_STRIPE_URL");
    }

    window.location.href = checkoutUrl;
  }

  async function saveUpgrade() {
    if (!canSubmit) {
      alert("חסר מידע לשדרוג");
      return;
    }

    try {
      setSaving(true);

      if (paymentMode === "manual_paid") {
        await saveManualPaidUpgrade();
        onSaved();
        return;
      }

      await createStripeUpgradeCheckout();
    } catch (err) {
      console.error(err);

      if (paymentMode === "stripe") {
        alert("יצירת תשלום Stripe נכשלה");
      } else {
        alert("שמירת השדרוג נכשלה");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!pricingPlans.length || !recordOptions.length) {
    return (
      <ModalShell
        title="שדרוג משתמש"
        subtitle="חסרים נתוני חבילות מהשרת"
        onClose={onClose}
      >
        <div
          className="
            rounded-[26px]
            border border-[#E7D8C6]
            bg-[#FFFDF8]
            p-6
            text-center
            text-sm font-bold
            text-[#7B6754]
          "
        >
          לא נמצאו חבילות או מדרגות רשומות מהשרת. צריך לוודא ש־
          <span dir="ltr"> /api/admin/packages </span>
          מחזיר plans ו־recordOptions.
        </div>

        <ModalFooter>
          <button
            onClick={onClose}
            className="h-12 rounded-2xl bg-[#ECE7E1] px-6 font-black text-[#6B5A48]"
          >
            סגירה
          </button>
        </ModalFooter>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      title="שדרוג משתמש"
      subtitle="שינוי חבילה, שינוי כמות רשומות, אפסיילים ותשלום הפרש"
      onClose={onClose}
    >
      <div className="space-y-7">
        <section
          className="
            rounded-[26px]
            border border-[#E7D8C6]
            bg-[#FFFDF8]
            p-5
          "
        >
          <div className="mb-4 flex items-center gap-2">
            <Crown size={20} className="text-[#B97821]" />

            <h3 className="text-lg font-black text-[#3A2A1C]">
              חבילה ורשומות
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <SummaryBox
              label="מצב נוכחי"
              value={`${currentPlan?.label || getPlanLabel(user, pricingPlans)} · ${
                currentRecords || 0
              } רשומות`}
            />

            <SummaryBox
              label="מחיר מצב נוכחי"
              value={formatMoney(currentPackagePrice)}
            />

            <label>
              <span className="mb-2 block text-sm font-black text-[#6B5A48]">
                שינוי חבילה
              </span>

              <select
                value={form.plan}
                onChange={(e) => {
                  const nextPlan = pricingPlans.find(
                    (item) => item.key === e.target.value
                  );

                  setForm((prev) => ({
                    ...prev,
                    plan: e.target.value,
                    includeCalls:
                      Boolean(nextPlan?.includeCalls) || prev.includeCalls,
                    includeCreditGifts:
                      Boolean(nextPlan?.includeCreditGifts) ||
                      prev.includeCreditGifts,
                    includeDigitalSeating:
                      Boolean(nextPlan?.includeDigitalSeating) ||
                      prev.includeDigitalSeating,
                    includeEventManagement:
                      Boolean(nextPlan?.includeEventManagement) ||
                      prev.includeEventManagement,
                    includeCustomDesign:
                      Boolean(nextPlan?.includeCustomDesign) ||
                      prev.includeCustomDesign,
                  }));
                }}
                className="
                  h-12 w-full rounded-2xl
                  border border-[#E7D8C6]
                  bg-white px-4
                  text-sm font-black
                  outline-none
                "
              >
                {pricingPlans.map((plan) => (
                  <option key={plan.key} value={plan.key}>
                    {plan.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-black text-[#6B5A48]">
                שינוי כמות רשומות
              </span>

              <select
                value={selectedRecords}
                onChange={(e) => setSelectedRecords(Number(e.target.value))}
                className="
                  h-12 w-full rounded-2xl
                  border border-[#E7D8C6]
                  bg-white px-4
                  text-sm font-black
                  outline-none
                "
              >
                {recordOptions.map((option) => (
                  <option key={option.records} value={option.records}>
                    {option.label || `עד ${option.records} רשומות`} ·{" "}
                    {formatMoney(option.prices?.[form.plan] || 0)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="mt-3 text-xs font-bold text-[#8A7867]">
            אפשר לשדרג רק חבילה בלי להגדיל רשומות, או להגדיל רשומות בלי לשנות
            חבילה.
          </p>
        </section>

        <section
          className="
            rounded-[26px]
            border border-[#E7D8C6]
            bg-white
            p-5
          "
        >
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={20} className="text-[#B97821]" />

            <h3 className="text-lg font-black text-[#3A2A1C]">
              אפסיילים והרשאות
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {ADDONS.map((addon) => {
              const alreadyOwned = getAddonValue(user, addon.key);

              return (
                <label
                  key={addon.key}
                  className="
                    flex cursor-pointer items-center justify-between gap-3
                    rounded-2xl
                    border border-[#EFE2D1]
                    bg-[#FFFDF8]
                    px-4 py-3
                  "
                >
                  <div>
                    <div className="font-black text-[#3A2A1C]">
                      {addon.label}
                    </div>

                    <div className="mt-1 text-xs font-bold text-[#8A7867]">
                      {alreadyOwned
                        ? "כבר קיים ללקוח"
                        : addon.price > 0
                          ? `תוספת ${formatMoney(addon.price)}`
                          : "ללא מחיר מוגדר"}
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={Boolean(form[addon.key])}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        [addon.key]: e.target.checked,
                      }))
                    }
                    className="h-5 w-5 accent-[#B97821]"
                  />
                </label>
              );
            })}
          </div>
        </section>

        <section
          className="
            rounded-[26px]
            border border-[#E7D8C6]
            bg-white
            p-5
          "
        >
          <div className="mb-4 flex items-center gap-2">
            <PlusCircle size={20} className="text-[#B97821]" />

            <h3 className="text-lg font-black text-[#3A2A1C]">
              הוספת רשומות ידנית בתשלום
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <InputField
              label="כמות רשומות נוספות"
              type="number"
              value={String(extraRecords)}
              onChange={(value) =>
                setExtraRecords(Number(value || 0))
              }
            />

            <InputField
              label="מחיר לרשומות הנוספות"
              type="number"
              value={String(extraRecordsAmount)}
              onChange={(value) =>
                setExtraRecordsAmount(Number(value || 0))
              }
            />

            <SummaryBox
              label="סה״כ רשומות אחרי עדכון"
              value={String(finalRecords)}
            />
          </div>

          <p className="mt-3 text-xs font-bold text-[#8A7867]">
            זה מיועד למקרה שאת רוצה לתת מעבר למדרגת הרשומות הרשמית ולתמחר
            ידנית.
          </p>
        </section>

        <section
          className="
            rounded-[26px]
            border border-[#E8C98D]
            bg-[#FFF7E8]
            p-5
          "
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <SummaryBox
              label="הפרש חבילה/רשומות"
              value={formatMoney(packageDiff)}
            />

            <SummaryBox
              label="הפרש אפסיילים"
              value={formatMoney(addonsDiff)}
            />

            <SummaryBox
              label="רשומות ידניות"
              value={formatMoney(extraRecordsAmount)}
            />

            <div
              className="
                rounded-2xl
                border border-[#E8C98D]
                bg-[#FFF2D8]
                px-4 py-3
              "
            >
              <div className="text-xs font-black text-[#8A7867]">
                סה״כ לתשלום עכשיו
              </div>

              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={manualTotalToPay}
                  onChange={(e) =>
                    setManualTotalToPay(Number(e.target.value || 0))
                  }
                  className="
                    h-11 w-full
                    rounded-xl
                    border border-[#E8C98D]
                    bg-white
                    px-3
                    text-xl font-black
                    text-[#B97821]
                    outline-none
                  "
                />

                <span className="text-lg font-black text-[#B97821]">
                  ₪
                </span>
              </div>

              <div className="mt-2 text-xs font-bold text-[#8A7867]">
                מחושב אוטומטית לפי הבחירות, אבל ניתן לעריכה ידנית.
              </div>
            </div>
          </div>
        </section>

        <section
          className="
            rounded-[26px]
            border border-[#E7D8C6]
            bg-white
            p-5
          "
        >
          <div className="mb-4 flex items-center gap-2">
            <Banknote size={20} className="text-[#B97821]" />

            <h3 className="text-lg font-black text-[#3A2A1C]">
              אופן תשלום ההפרש
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label
              className={`
                flex cursor-pointer items-center justify-between gap-3
                rounded-2xl border px-4 py-4
                ${
                  paymentMode === "manual_paid"
                    ? "border-[#B97821] bg-[#FFF7E8]"
                    : "border-[#EFE2D1] bg-[#FFFDF8]"
                }
              `}
            >
              <div>
                <div className="font-black text-[#3A2A1C]">
                  סומן כשולם
                </div>

                <div className="mt-1 text-xs font-bold text-[#8A7867]">
                  יעדכן את המשתמש מיד וייצור תשלום באדמין.
                </div>
              </div>

              <input
                type="radio"
                checked={paymentMode === "manual_paid"}
                onChange={() => setPaymentMode("manual_paid")}
                className="h-5 w-5 accent-[#B97821]"
              />
            </label>

            <label
              className={`
                flex cursor-pointer items-center justify-between gap-3
                rounded-2xl border px-4 py-4
                ${
                  paymentMode === "stripe"
                    ? "border-[#B97821] bg-[#FFF7E8]"
                    : "border-[#EFE2D1] bg-[#FFFDF8]"
                }
              `}
            >
              <div>
                <div className="font-black text-[#3A2A1C]">
                  לשלם דרך Stripe
                </div>

                <div className="mt-1 text-xs font-bold text-[#8A7867]">
                  יפתח Checkout עם הסכום שהגדרת, והמשתמש יתעדכן אחרי תשלום.
                </div>
              </div>

              <input
                type="radio"
                checked={paymentMode === "stripe"}
                onChange={() => setPaymentMode("stripe")}
                className="h-5 w-5 accent-[#B97821]"
              />
            </label>
          </div>
        </section>
      </div>

      <ModalFooter>
        <button
          onClick={onClose}
          className="h-12 rounded-2xl bg-[#ECE7E1] px-6 font-black text-[#6B5A48]"
        >
          ביטול
        </button>

        <button
          onClick={saveUpgrade}
          disabled={saving || !canSubmit}
          className="
            flex h-12 items-center justify-center gap-2
            rounded-2xl bg-black px-7
            font-black text-white
            disabled:opacity-50
          "
        >
          {saving ? (
            <Loader2 className="animate-spin" size={18} />
          ) : paymentMode === "stripe" ? (
            <ExternalLink size={18} />
          ) : (
            <ArrowUpCircle size={18} />
          )}

          {paymentMode === "stripe" ? "מעבר לתשלום Stripe" : "שמור שדרוג"}
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

/* =========================
   UI COMPONENTS
========================= */
function ModalShell({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/35
        px-4
        backdrop-blur-sm
      "
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="
          flex max-h-[92vh] w-full max-w-5xl flex-col
          overflow-hidden
          rounded-[32px]
          border border-[#E7D8C6]
          bg-white
          shadow-[0_28px_90px_rgba(0,0,0,0.24)]
        "
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="
            flex items-start justify-between gap-4
            border-b border-[#EFE2D1]
            bg-gradient-to-br from-[#FFFDF8] to-[#F8EFE3]
            p-5 md:p-6
          "
        >
          <div>
            <h2 className="text-2xl font-black text-[#3A2A1C]">{title}</h2>
            <p className="mt-1 text-sm font-semibold text-[#8A7867]">
              {subtitle}
            </p>
          </div>

          <button
            onClick={onClose}
            className="
              flex h-11 w-11 shrink-0 items-center justify-center
              rounded-full
              bg-white
              text-[#6B5138]
              shadow-sm
              transition
              hover:bg-[#F1E5D6]
            "
          >
            <X size={20} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-5 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <footer
      className="
        sticky bottom-0 mt-8
        flex flex-col gap-3
        border-t border-[#EFE2D1]
        bg-white/95
        pt-5
        md:flex-row
        md:justify-end
      "
    >
      {children}
    </footer>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-[#6B5A48]">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          h-12 w-full rounded-2xl
          border border-[#E7D8C6]
          bg-white px-4
          text-sm font-bold
          text-[#3A2A1C]
          outline-none
          transition
          focus:border-[#C8944E]
        "
      />
    </label>
  );
}

function InfoCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div
      className="
        rounded-[26px]
        border border-[#E7D8C6]
        bg-white
        p-5
        shadow-[0_14px_40px_rgba(60,43,25,0.06)]
      "
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-black text-[#3A2A1C]">{title}</div>
        <div className="text-[#B97821]">{icon}</div>
      </div>

      <div className="text-3xl font-black text-[#B97821]">{value}</div>
    </div>
  );
}

function MiniDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#FFF9EF] px-4 py-3">
      <div className="text-xs font-black text-[#8A7867]">{label}</div>
      <div className="mt-1 font-black text-[#3A2A1C]">{value}</div>
    </div>
  );
}

function SummaryBox({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`
        rounded-2xl
        border
        px-4 py-3
        ${
          highlight
            ? "border-[#E8C98D] bg-[#FFF2D8]"
            : "border-[#EFE2D1] bg-white"
        }
      `}
    >
      <div className="text-xs font-black text-[#8A7867]">{label}</div>
      <div className="mt-1 text-xl font-black text-[#B97821]">{value}</div>
    </div>
  );
}

function RoleBadge({ role }: { role: AdminRole }) {
  return (
    <span
      className="
        inline-flex items-center gap-1
        rounded-full
        bg-[#F6F1EA]
        px-3 py-1
        text-xs font-black
        text-[#6B5A48]
      "
    >
      <UserRound size={13} />
      {getRoleLabel(role)}
    </span>
  );
}

function StatusBadge({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1
        rounded-full
        px-3 py-1
        text-xs font-black
        ${
          active
            ? "bg-[#EAF8EF] text-[#1F9A55]"
            : "bg-[#F6F1EA] text-[#7B6754]"
        }
      `}
    >
      {active && <CheckCircle2 size={13} />}
      {children}
    </span>
  );
}

function ActionButton({
  children,
  icon,
  tone = "dark",
  onClick,
}: {
  children: ReactNode;
  icon: ReactNode;
  tone?: "dark" | "blue" | "red" | "gold";
  onClick: () => void;
}) {
  const tones = {
    dark: "bg-[#2F3742] text-white hover:bg-[#1F2630]",
    blue: "bg-[#2563EB] text-white hover:bg-[#1E4FC4]",
    red: "bg-[#E73535] text-white hover:bg-[#C62828]",
    gold: "bg-[#B97821] text-white hover:bg-[#996016]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex h-9 w-full items-center justify-center gap-1.5
        rounded-full
        px-3
        text-xs font-black
        transition
        ${tones[tone]}
      `}
    >
      {icon}
      {children}
    </button>
  );
}