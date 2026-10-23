"use client";

import Link from "next/link";
import { trackPublicEvent } from "@/lib/seo/analytics";

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
  location: string;
};

/** Map CTA destinations to funnel events. Clicks ≠ completed conversions. */
function funnelEventsForHref(href: string): string[] {
  const path = href.split("?")[0] || href;
  const events: string[] = [];
  if (path === "/try" || path.startsWith("/try/") || path === "/info/demo") {
    events.push("view_demo");
  }
  if (path === "/pricing" || path.startsWith("/pricing")) {
    events.push("view_pricing");
  }
  if (path === "/register" || path.startsWith("/register")) {
    events.push("begin_registration");
  }
  if (path === "/contact" || path.startsWith("/contact")) {
    events.push("begin_contact");
  }
  return events;
}

export default function TrackedCtaLink({ href, className, children, location }: Props) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        const params = { location, href };
        trackPublicEvent("select_cta", params);
        for (const name of funnelEventsForHref(href)) {
          trackPublicEvent(name, params);
        }
      }}
    >
      {children}
    </Link>
  );
}
