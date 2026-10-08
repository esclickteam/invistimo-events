"use client";

import React, { type ReactNode } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export function AdminPageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: Array<{ label: string; href?: string }>;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav className="mb-1 flex flex-wrap items-center gap-1 text-[11px] font-semibold text-[var(--admin-subtle)]">
            {breadcrumb.map((item, index) => (
              <React.Fragment key={`${item.label}-${index}`}>
                {index > 0 ? <span>/</span> : null}
                {item.href ? (
                  <Link href={item.href} className="hover:text-[var(--admin-brand)]">
                    {item.label}
                  </Link>
                ) : (
                  <span>{item.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : null}
        <h1 className="text-lg font-bold tracking-tight text-[var(--admin-text)] sm:text-xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-0.5 text-xs font-medium text-[var(--admin-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function AdminPanel({
  children,
  className = "",
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <section
      className={`rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow)] ${
        padding ? "p-4" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function AdminStatCard({
  title,
  value,
  icon,
  hint,
  onClick,
}: {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  onClick?: () => void;
}) {
  const className = `flex h-[112px] flex-col justify-between rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3.5 text-right shadow-[var(--admin-shadow)] transition ${
    onClick ? "cursor-pointer hover:border-[var(--admin-brand)]" : ""
  }`;

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold text-[var(--admin-muted)]">{title}</p>
        {icon ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]">
            {icon}
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-[var(--admin-text)]">
          {value}
        </p>
        {hint ? (
          <p className="mt-1 text-[11px] font-medium text-[var(--admin-subtle)]">
            {hint}
          </p>
        ) : null}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}

export function AdminButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}) {
  const sizes =
    size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-3.5 text-[13px]";
  const variants = {
    primary:
      "bg-[var(--admin-brand)] text-white hover:bg-[var(--admin-brand-hover)]",
    secondary:
      "border border-[var(--admin-border)] bg-white text-[var(--admin-text)] hover:bg-gray-50",
    ghost:
      "bg-transparent text-[var(--admin-muted)] hover:bg-gray-100 hover:text-[var(--admin-text)]",
    danger:
      "border border-red-200 bg-[var(--admin-danger-soft)] text-[var(--admin-danger)] hover:bg-red-100",
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-[var(--admin-radius-sm)] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${sizes} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function AdminBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "bg-gray-100 text-gray-700",
    brand: "bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]",
    success: "bg-[var(--admin-success-soft)] text-[var(--admin-success)]",
    warning: "bg-[var(--admin-warning-soft)] text-[var(--admin-warning)]",
    danger: "bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]",
    info: "bg-[var(--admin-info-soft)] text-[var(--admin-info)]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function AdminAlert({
  title,
  description,
  count,
  actionLabel,
  onAction,
  tone = "warning",
}: {
  title: string;
  description?: string;
  count?: number;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "warning" | "danger" | "info";
}) {
  const tones = {
    warning: {
      border: "border-amber-200",
      bg: "bg-amber-50",
      title: "text-amber-900",
      meta: "text-amber-700",
    },
    danger: {
      border: "border-red-200",
      bg: "bg-red-50",
      title: "text-red-900",
      meta: "text-red-700",
    },
    info: {
      border: "border-indigo-200",
      bg: "bg-indigo-50",
      title: "text-indigo-900",
      meta: "text-indigo-700",
    },
  }[tone];

  return (
    <div
      className={`flex flex-col gap-3 rounded-[var(--admin-radius)] border ${tones.border} ${tones.bg} px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm font-bold ${tones.title}`}>{title}</p>
          {typeof count === "number" ? (
            <AdminBadge tone={tone === "info" ? "brand" : tone}>
              {count}
            </AdminBadge>
          ) : null}
        </div>
        {description ? (
          <p className={`mt-1 text-xs font-medium ${tones.meta}`}>
            {description}
          </p>
        ) : null}
      </div>
      {actionLabel && onAction ? (
        <AdminButton size="sm" variant="secondary" onClick={onAction}>
          {actionLabel}
        </AdminButton>
      ) : null}
    </div>
  );
}

export function AdminEmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[var(--admin-radius)] border border-dashed border-[var(--admin-border)] bg-white px-4 py-10 text-center text-sm font-semibold text-[var(--admin-muted)]">
      {text}
    </div>
  );
}

export function AdminLoadingState({ text = "טוען…" }: { text?: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm font-semibold text-[var(--admin-muted)]">
      <Loader2 className="h-4 w-4 animate-spin" />
      {text}
    </div>
  );
}

export function AdminFilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex flex-col gap-2 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-white p-3 shadow-[var(--admin-shadow)] sm:flex-row sm:flex-wrap sm:items-center">
      {children}
    </div>
  );
}

export function AdminTableShell({
  headers,
  children,
  empty,
  isEmpty,
}: {
  headers: string[];
  children: ReactNode;
  empty?: string;
  isEmpty?: boolean;
}) {
  if (isEmpty) {
    return <AdminEmptyState text={empty || "אין נתונים להצגה."} />;
  }

  return (
    <AdminPanel padding={false} className="overflow-x-auto">
      <table className="admin-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </AdminPanel>
  );
}
