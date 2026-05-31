"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import SoftphoneStatusPanel from "@/components/staff/SoftphoneStatusPanel";
import SoftphoneAgentsMonitor from "@/components/staff/SoftphoneAgentsMonitor";

type StaffDashboardUser = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;

  role: "user" | "producer" | "staff" | "venue_owner" | "admin" | string;
  staffType?: "producer_staff" | "general_staff" | null;
  employeeScope?: "system" | "producer" | "venue" | "client" | null;

  packageName?: string;
  plan?: string;
  priceKey?: string;

  guests?: number;
  maxGuests?: number;

  includeCalls?: boolean;
  includeDigitalSeating?: boolean;
  includeEventManagement?: boolean;

  hasPaid?: boolean;
  isActive?: boolean;

  assignedProducerId?: string | null;

  createdAt?: string;
  eventDate?: string | null;
};

type UsersResponse = {
  success: boolean;
  users?: StaffDashboardUser[];
  totalRevenue?: number;
  error?: string;
};

type FilterKey = "all" | "clients" | "producers" | "venues" | "staff";

function getRoleLabel(user: StaffDashboardUser) {
  if (user.role === "user") return "לקוח";
  if (user.role === "producer") return "מפיק";
  if (user.role === "venue_owner") return "בעל אולם";

  if (
    user.role === "staff" &&
    user.staffType === "general_staff" &&
    user.employeeScope === "system"
  ) {
    return "עובד Invistimo";
  }

  if (user.role === "staff" && user.staffType === "producer_staff") {
    return "עובד מפיק";
  }

  if (user.role === "staff") return "עובד";
  if (user.role === "admin") return "אדמין";

  return user.role || "לא ידוע";
}

function getRoleBadgeClass(user: StaffDashboardUser) {
  if (user.role === "user") {
    return "bg-[#eef6ff] text-[#24689a] border-[#d6e9fa]";
  }

  if (user.role === "producer") {
    return "bg-[#f4efff] text-[#6d47a8] border-[#e4d8fb]";
  }

  if (user.role === "venue_owner") {
    return "bg-[#fff3df] text-[#9a6724] border-[#f2ddb9]";
  }

  if (user.role === "staff") {
    return "bg-[#eef8ef] text-[#2c7d43] border-[#d7eadb]";
  }

  return "bg-[#f4eee7] text-[#6b5a45] border-[#eadfce]";
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizeText(value?: string | null) {
  return String(value || "").toLowerCase().trim();
}

export default function StaffDashboardPage() {
  const { user, loading: authLoading } = useAuth();

  const [users, setUsers] = useState<StaffDashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const isSystemStaff =
    user?.effectiveRole === "system_staff" ||
    user?.isSystemStaff === true ||
    (user?.role === "staff" &&
      user?.staffType === "general_staff" &&
      user?.employeeScope === "system");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setError("לא נמצאה התחברות פעילה");
      setLoading(false);
      return;
    }

    if (!isSystemStaff && user.role !== "admin") {
      setError("אין הרשאה לצפייה בדשבורד עובדים");
      setLoading(false);
      return;
    }

    loadUsers();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?._id]);

  async function loadUsers(searchValue = "") {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        `/api/admin/users?scope=all&q=${encodeURIComponent(searchValue)}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = (await res.json()) as UsersResponse;

      if (!res.ok || !data.success) {
        throw new Error(data.error || "LOAD_USERS_FAILED");
      }

      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err: any) {
      console.error("LOAD STAFF DASHBOARD USERS FAILED:", err);

      setError(
        err?.message === "FORBIDDEN"
          ? "אין הרשאה לטעון את רשימת המשתמשים. צריך לאפשר לעובד מערכת גישה ל־/api/admin/users."
          : "שגיאה בטעינת המשתמשים"
      );
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const clients = users.filter((item) => item.role === "user");
    const producers = users.filter((item) => item.role === "producer");
    const venues = users.filter((item) => item.role === "venue_owner");
    const staff = users.filter((item) => item.role === "staff");
    const active = users.filter((item) => item.isActive === true);

    return {
      total: users.length,
      clients: clients.length,
      producers: producers.length,
      venues: venues.length,
      staff: staff.length,
      active: active.length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = normalizeText(q);

    return users.filter((item) => {
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "clients" && item.role === "user") ||
        (activeFilter === "producers" && item.role === "producer") ||
        (activeFilter === "venues" && item.role === "venue_owner") ||
        (activeFilter === "staff" && item.role === "staff");

      if (!matchesFilter) return false;

      if (!query) return true;

      const searchable = [
        item.name,
        item.email,
        item.phone,
        item.role,
        item.staffType,
        item.employeeScope,
        item.packageName,
        item.plan,
        item.priceKey,
      ]
        .map((value) => normalizeText(value))
        .join(" ");

      return searchable.includes(query);
    });
  }, [users, q, activeFilter]);

  if (authLoading || loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f7f1e8] p-6">
        <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center">
          <div className="rounded-[28px] border border-[#eadfce] bg-white px-8 py-7 text-center shadow-sm">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#eadfce] border-t-[#9b7a3c]" />
            <p className="text-sm font-bold text-[#6b5a45]">
              טוען דשבורד עובדים...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f7f1e8] p-6">
        <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center">
          <div className="rounded-[28px] border border-red-200 bg-white p-8 text-center shadow-sm">
            <p className="text-3xl">⚠️</p>

            <h1 className="mt-4 text-2xl font-black text-[#2f251d]">
              לא ניתן להציג את הדשבורד
            </h1>

            <p className="mt-3 text-sm leading-7 text-red-700">{error}</p>

            <button
              onClick={() => loadUsers(q)}
              className="mt-6 rounded-2xl bg-[#2f251d] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1f1812]"
            >
              נסה שוב
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f1e8] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-[32px] border border-[#eadfce] bg-white shadow-sm">
          <div className="relative p-6 md:p-8">
            <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-[#d8a85f]/10 blur-3xl" />
            <div className="absolute bottom-0 right-10 h-32 w-32 rounded-full bg-[#9b7a3c]/10 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-black tracking-[0.2em] text-[#9b7a3c]">
                  INVISTIMO STAFF
                </p>

                <h1 className="mt-3 text-3xl font-black text-[#2f251d] md:text-4xl">
                  דשבורד עובדי Invistimo
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#7a6a58]">
                  אזור עבודה פנימי לעובדי המערכת: סטטוס סופטפון, זמן בשיחה,
                  זמן פנוי, זמן הפסקה, וצפייה בכל המשתמשים במערכת.
                </p>
              </div>

              <div className="rounded-3xl border border-[#eadfce] bg-[#fff8ed] px-5 py-4">
                <p className="text-xs font-bold text-[#8b7b68]">מחובר כעובד</p>
                <p className="mt-1 text-sm font-black text-[#2f251d]">
                  {user?.name || user?.email || "עובד מערכת"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <SoftphoneStatusPanel />

        <SoftphoneAgentsMonitor />

        <section className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <StatCard label="סה״כ משתמשים" value={stats.total} />
          <StatCard label="לקוחות" value={stats.clients} />
          <StatCard label="מפיקים" value={stats.producers} />
          <StatCard label="בעלי אולם" value={stats.venues} />
          <StatCard label="עובדים" value={stats.staff} />
          <StatCard label="פעילים" value={stats.active} />
        </section>

        <section className="rounded-[32px] border border-[#eadfce] bg-white p-4 shadow-sm md:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-[#2f251d]">
                כל המשתמשים
              </h2>

              <p className="mt-1 text-sm text-[#8b7b68]">
                רשימת משתמשים מלאה מתוך המערכת.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    loadUsers(q);
                  }
                }}
                placeholder="חיפוש לפי שם, אימייל, טלפון, תפקיד..."
                className="h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-right text-sm outline-none transition focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15 md:w-80"
              />

              <button
                onClick={() => loadUsers(q)}
                className="h-12 rounded-2xl bg-[#2f251d] px-6 text-sm font-black text-white transition hover:bg-[#1f1812]"
              >
                חפש
              </button>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            <FilterButton
              active={activeFilter === "all"}
              onClick={() => setActiveFilter("all")}
            >
              הכל
            </FilterButton>

            <FilterButton
              active={activeFilter === "clients"}
              onClick={() => setActiveFilter("clients")}
            >
              לקוחות
            </FilterButton>

            <FilterButton
              active={activeFilter === "producers"}
              onClick={() => setActiveFilter("producers")}
            >
              מפיקים
            </FilterButton>

            <FilterButton
              active={activeFilter === "venues"}
              onClick={() => setActiveFilter("venues")}
            >
              בעלי אולם
            </FilterButton>

            <FilterButton
              active={activeFilter === "staff"}
              onClick={() => setActiveFilter("staff")}
            >
              עובדים
            </FilterButton>
          </div>

          <div className="hidden overflow-x-auto rounded-3xl border border-[#eadfce] md:block">
            <table className="w-full min-w-[1050px] border-collapse text-right">
              <thead>
                <tr className="border-b border-[#eadfce] bg-[#fff8ed] text-xs font-black text-[#6b5a45]">
                  <th className="p-4">משתמש</th>
                  <th className="p-4">תפקיד</th>
                  <th className="p-4">חבילה</th>
                  <th className="p-4">רשומות</th>
                  <th className="p-4">מודולים</th>
                  <th className="p-4">סטטוס</th>
                  <th className="p-4">תאריך אירוע</th>
                  <th className="p-4">נוצר</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b border-[#f0e5d6] text-sm transition last:border-b-0 hover:bg-[#fffaf3]"
                  >
                    <td className="p-4">
                      <p className="font-black text-[#2f251d]">
                        {item.name || "ללא שם"}
                      </p>

                      <p className="mt-1 text-xs text-[#8b7b68]">
                        {item.email || "-"}
                      </p>

                      {item.phone && (
                        <p className="mt-1 text-xs text-[#8b7b68]">
                          {item.phone}
                        </p>
                      )}
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getRoleBadgeClass(
                          item
                        )}`}
                      >
                        {getRoleLabel(item)}
                      </span>
                    </td>

                    <td className="p-4 text-[#6b5a45]">
                      {item.packageName || item.plan || "-"}
                    </td>

                    <td className="p-4 text-[#6b5a45]">
                      {Number(item.maxGuests || item.guests || 0)}
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {item.includeCalls && <MiniTag>שיחות</MiniTag>}
                        {item.includeDigitalSeating && <MiniTag>הושבה</MiniTag>}
                        {item.includeEventManagement && <MiniTag>הפקה</MiniTag>}

                        {!item.includeCalls &&
                          !item.includeDigitalSeating &&
                          !item.includeEventManagement && (
                            <span className="text-xs text-[#9c8b78]">-</span>
                          )}
                      </div>
                    </td>

                    <td className="p-4">
                      {item.isActive ? (
                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                          פעיל
                        </span>
                      ) : (
                        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                          לא פעיל
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-[#6b5a45]">
                      {formatDate(item.eventDate)}
                    </td>

                    <td className="p-4 text-[#6b5a45]">
                      {formatDate(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {filteredUsers.map((item) => (
              <article
                key={item._id}
                className="rounded-3xl border border-[#eadfce] bg-[#fffdf9] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-[#2f251d]">
                      {item.name || "ללא שם"}
                    </p>

                    <p className="mt-1 text-xs text-[#8b7b68]">
                      {item.email || "-"}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${getRoleBadgeClass(
                      item
                    )}`}
                  >
                    {getRoleLabel(item)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <InfoBox label="חבילה" value={item.packageName || "-"} />
                  <InfoBox
                    label="רשומות"
                    value={String(Number(item.maxGuests || item.guests || 0))}
                  />
                  <InfoBox label="אירוע" value={formatDate(item.eventDate)} />
                  <InfoBox label="נוצר" value={formatDate(item.createdAt)} />
                </div>
              </article>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="rounded-3xl border border-dashed border-[#eadfce] bg-[#fffdf9] p-8 text-center">
              <p className="text-2xl">🔎</p>

              <h3 className="mt-3 text-lg font-black text-[#2f251d]">
                לא נמצאו משתמשים
              </h3>

              <p className="mt-1 text-sm text-[#8b7b68]">
                נסי לשנות חיפוש או סינון.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-[#eadfce] bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-[#8b7b68]">{label}</p>
      <p className="mt-2 text-3xl font-black text-[#2f251d]">{value}</p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border px-4 py-2 text-sm font-black transition ${
        active
          ? "border-[#2f251d] bg-[#2f251d] text-white"
          : "border-[#eadfce] bg-[#fffdf9] text-[#6b5a45] hover:bg-[#fff8ed]"
      }`}
    >
      {children}
    </button>
  );
}

function MiniTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#eadfce] bg-[#fff8ed] px-2 py-1 text-[11px] font-bold text-[#7a5a2f]">
      {children}
    </span>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-white p-3">
      <p className="text-[11px] font-bold text-[#8b7b68]">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-[#2f251d]">
        {value}
      </p>
    </div>
  );
}