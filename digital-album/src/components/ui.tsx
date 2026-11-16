"use client";

import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, type InputHTMLAttributes } from "react";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-2xl tracking-[0.18em] uppercase text-[var(--ink)]",
        className
      )}
    >
      Album
    </span>
  );
}

export function Button(
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "gold" | "ghost";
  }
) {
  const { className, variant = "primary", ...rest } = props;
  const cls =
    variant === "gold" ? "btn-gold" : variant === "ghost" ? "btn-ghost" : "btn-primary";
  return <button className={cn(cls, className)} {...rest} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-[var(--ink)] outline-none focus:border-[var(--gold)]",
        className
      )}
      {...rest}
    />
  );
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  const { className, ...rest } = props;
  return (
    <textarea
      className={cn(
        "w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-[var(--ink)] outline-none focus:border-[var(--gold)] min-h-28",
        className
      )}
      {...rest}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-sm text-[var(--muted)]">{children}</label>;
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-3xl md:text-4xl text-[var(--ink)]">{title}</h2>
      {subtitle ? <p className="mt-2 text-[var(--muted)] max-w-2xl">{subtitle}</p> : null}
    </div>
  );
}
