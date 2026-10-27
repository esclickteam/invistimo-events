"use client";

import Link from "next/link";
import { classifyPublicClick, trackPublicEvent } from "@/lib/seo/analytics";

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
      data-conversion-tracked="1"
      onClick={() => {
        const decision = classifyPublicClick(href, window.location.pathname, { placement: location });
        if (decision) {
          trackPublicEvent(decision.name, decision.params);
          return;
        }
        trackPublicEvent("select_cta", { location, destination: href });
      }}
    >
      {children}
    </Link>
  );
}
