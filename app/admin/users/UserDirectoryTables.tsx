"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import {
  accountStatusActive,
  accountStatusLabel,
  employeeRoleLabel,
  formatOpenBalance,
} from "@/lib/admin/userDirectory";

export type DirectoryUser = {
  _id: string;
  name?: string;
  email: string;
  phone?: string;
  role: string;
  staffType?: string | null;
  employeeScope?: string | null;
  isActive?: boolean;
};

function personName(user: DirectoryUser) {
  return user.name?.trim() || "—";
}

function personPhone(user: DirectoryUser) {
  return user.phone?.trim() || "";
}

function NameCell({ user }: { user: DirectoryUser }) {
  const name = personName(user);
  return (
    <td data-label="שם מלא">
      <span className="cell-clip font-bold" title={user.name || ""}>
        {name}
      </span>
    </td>
  );
}

function EmailCell({ user }: { user: DirectoryUser }) {
  return (
    <td data-label="אימייל">
      <span className="cell-clip-wide text-[var(--admin-muted)]" title={user.email}>
        {user.email}
      </span>
    </td>
  );
}

function PhoneCell({ user }: { user: DirectoryUser }) {
  const phone = personPhone(user);
  return (
    <td className="admin-phone-cell" data-label="טלפון">
      <span dir="ltr">{phone || "—"}</span>
    </td>
  );
}

function AccountStatusCell({ user }: { user: DirectoryUser }) {
  const label = accountStatusLabel(user.isActive);
  const active = accountStatusActive(user.isActive);
  return (
    <td data-label="סטטוס חשבון">
      <span
        className={`admin-row-badge ${
          active ? "bg-[#EAF8EF] text-[#1F9A55]" : "bg-[#F6F1EA] text-[#7B6754]"
        }`}
      >
        {label}
      </span>
    </td>
  );
}

function ActionsCell({ children }: { children: ReactNode }) {
  return <td className="admin-actions-cell relative overflow-visible">{children}</td>;
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="!h-24 text-center text-[var(--admin-muted)]">
        לא נמצאו משתמשים
      </td>
    </tr>
  );
}

function DirectoryFrame({
  view,
  shown,
  total,
  children,
}: {
  view: "all" | "producer" | "staff";
  shown: number;
  total: number;
  children: ReactNode;
}) {
  return (
    <div className="admin-table-region w-full min-w-0" data-users-view={view}>
      <div className="admin-table-scroll">
        <table className="admin-table admin-users-directory">{children}</table>
      </div>
      <div className="admin-table-footer">
        <span>
          מוצגים {shown} מתוך {total}
        </span>
      </div>
    </div>
  );
}

export function AllUsersDirectoryTable({
  users,
  total,
  renderActions,
  roleLabel,
}: {
  users: DirectoryUser[];
  total: number;
  renderActions: (user: DirectoryUser) => ReactNode;
  roleLabel: (role: string) => string;
}) {
  return (
    <DirectoryFrame view="all" shown={users.length} total={total}>
      <thead>
        <tr>
          <th>שם מלא</th>
          <th>אימייל</th>
          <th>טלפון</th>
          <th>סוג משתמש</th>
          <th>סטטוס חשבון</th>
          <th className="admin-actions-head">פעולות</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user._id}>
            <NameCell user={user} />
            <EmailCell user={user} />
            <PhoneCell user={user} />
            <td data-label="סוג משתמש">
              <span className="admin-row-badge bg-[#F6F1EA] text-[#6B5A48]">
                {roleLabel(user.role)}
              </span>
            </td>
            <AccountStatusCell user={user} />
            <ActionsCell>{renderActions(user)}</ActionsCell>
          </tr>
        ))}
        {users.length === 0 && <EmptyRow colSpan={6} />}
      </tbody>
    </DirectoryFrame>
  );
}

export function ProducersDirectoryTable({
  users,
  total,
  balances,
  clientCounts,
  onShowClients,
  renderActions,
}: {
  users: DirectoryUser[];
  total: number;
  balances: Record<string, number>;
  clientCounts: Record<string, number>;
  onShowClients: (user: DirectoryUser) => void;
  renderActions: (user: DirectoryUser) => ReactNode;
}) {
  return (
    <DirectoryFrame view="producer" shown={users.length} total={total}>
      <thead>
        <tr>
          <th>שם מלא</th>
          <th>אימייל</th>
          <th>טלפון</th>
          <th>מספר לקוחות משויכים</th>
          <th>יתרה לגבייה</th>
          <th>סטטוס חשבון</th>
          <th className="admin-actions-head">פעולות</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => {
          const balance = balances[user._id];
          const clients = clientCounts[user._id] || 0;
          return (
            <tr key={user._id}>
              <NameCell user={user} />
              <EmailCell user={user} />
              <PhoneCell user={user} />
              <td data-label="מספר לקוחות משויכים">
                <button
                  type="button"
                  onClick={() => onShowClients(user)}
                  className="font-black text-[var(--admin-brand)] underline"
                >
                  {clients}
                </button>
              </td>
              <td data-label="יתרה לגבייה">
                {balance == null ? (
                  "…"
                ) : (
                  <a
                    href={`/admin/users/producers/${user._id}/billing`}
                    className="font-black text-[var(--admin-brand)] underline"
                  >
                    {formatOpenBalance(balance)}
                  </a>
                )}
              </td>
              <AccountStatusCell user={user} />
              <ActionsCell>{renderActions(user)}</ActionsCell>
            </tr>
          );
        })}
        {users.length === 0 && <EmptyRow colSpan={7} />}
      </tbody>
    </DirectoryFrame>
  );
}

export function StaffDirectoryTable({
  users,
  total,
  renderActions,
}: {
  users: DirectoryUser[];
  total: number;
  renderActions: (user: DirectoryUser) => ReactNode;
}) {
  return (
    <DirectoryFrame view="staff" shown={users.length} total={total}>
      <thead>
        <tr>
          <th>שם מלא</th>
          <th>אימייל</th>
          <th>טלפון</th>
          <th>סוג עובד / תפקיד</th>
          <th>סטטוס חשבון</th>
          <th className="admin-actions-head">פעולות</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => {
          const role = employeeRoleLabel(user);
          return (
            <tr key={user._id}>
              <NameCell user={user} />
              <EmailCell user={user} />
              <PhoneCell user={user} />
              <td data-label="סוג עובד / תפקיד">
                <span className="admin-row-badge bg-[#F6F1EA] text-[#6B5A48]" title={role}>
                  {role}
                </span>
              </td>
              <AccountStatusCell user={user} />
              <ActionsCell>{renderActions(user)}</ActionsCell>
            </tr>
          );
        })}
        {users.length === 0 && <EmptyRow colSpan={6} />}
      </tbody>
    </DirectoryFrame>
  );
}

export function AssociatedClientsModal({
  producer,
  clients,
  onClose,
  onEdit,
}: {
  producer: DirectoryUser;
  clients: DirectoryUser[];
  onClose: () => void;
  onEdit: (user: DirectoryUser) => void;
}) {
  const sorted = [...clients].sort((a, b) =>
    String(a.name || a.email || "").localeCompare(String(b.name || b.email || ""), "he")
  );

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      data-testid="associated-clients-modal"
    >
      <div
        className="flex max-h-[min(85dvh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-[var(--admin-radius)] border border-[var(--admin-border)] bg-white shadow-xl sm:rounded-[var(--admin-radius)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-base font-black text-[var(--admin-text)]">לקוחות משויכים</h2>
            <p className="mt-0.5 truncate text-xs font-semibold text-[var(--admin-muted)]">
              {producer.name || producer.email} · {sorted.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] bg-white"
            aria-label="סגירה"
          >
            <X size={16} />
          </button>
        </header>
        <div className="admin-table-scroll min-h-0 flex-1 overflow-auto">
          <table className="admin-table admin-users-directory">
            <thead>
              <tr>
                <th>שם מלא</th>
                <th>אימייל</th>
                <th>טלפון</th>
                <th className="admin-actions-head">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((client) => (
                <tr key={client._id}>
                  <NameCell user={client} />
                  <EmailCell user={client} />
                  <PhoneCell user={client} />
                  <td className="admin-actions-cell" data-label="פעולות">
                    <button
                      type="button"
                      onClick={() => onEdit(client)}
                      className="inline-flex h-8 items-center justify-center rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] bg-white px-2.5 text-xs font-bold hover:bg-gray-50"
                    >
                      עריכה
                    </button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={4} className="!h-24 text-center text-[var(--admin-muted)]">
                    אין לקוחות משויכים למפיק זה
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
