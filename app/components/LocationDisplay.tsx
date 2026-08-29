"use client";

import { MapPin } from "lucide-react";

type Align = "start" | "center";

type LocationDisplayProps = {
  name?: string;
  address?: string;
  className?: string;
  nameClassName?: string;
  addressClassName?: string;
  iconClassName?: string;
  align?: Align;
};

function rowClass(align: Align) {
  return align === "center" ? "justify-center text-center" : "";
}

export function LocationPin({
  className = "h-4 w-4 shrink-0",
}: {
  className?: string;
}) {
  return <MapPin className={className} aria-hidden />;
}

export default function LocationDisplay({
  name,
  address,
  className,
  nameClassName,
  addressClassName,
  iconClassName = "h-4 w-4 shrink-0",
  align = "start",
}: LocationDisplayProps) {
  const cleanName = String(name || "").trim();
  const cleanAddress = String(address || "").trim();

  if (!cleanName && !cleanAddress) return null;

  return (
    <div className={className} dir="rtl">
      {cleanName ? (
        <p className={`flex min-w-0 items-center gap-2 ${rowClass(align)} ${nameClassName || ""}`}>
          <MapPin className={iconClassName} aria-hidden />
          <span className="min-w-0 break-words">{cleanName}</span>
        </p>
      ) : null}
      {cleanAddress ? (
        <p
          className={`flex min-w-0 items-start gap-2 ${rowClass(align)} ${addressClassName || ""}`}
        >
          {cleanName ? null : <MapPin className={`${iconClassName} mt-0.5`} aria-hidden />}
          <span className="min-w-0 break-words">{cleanAddress}</span>
        </p>
      ) : null}
    </div>
  );
}
