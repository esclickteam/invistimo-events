"use client";

import Link from "next/link";
import { trackPublicEvent } from "@/lib/seo/analytics";

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
  location: string;
};

export default function TrackedCtaLink({ href, className, children, location }: Props) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackPublicEvent("select_cta", { location, href })}
    >
      {children}
    </Link>
  );
}
