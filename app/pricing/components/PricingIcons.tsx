/** Thin, consistent line icons for pricing service types. */

import type { ReactNode } from "react";

type IconProps = {
  size?: number;
  className?: string;
  title?: string;
};

function Svg({
  size = 22,
  className,
  title,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.55,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function InvitationIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2.2" {...stroke} />
      <path d="M8 8.5h8M8 12h8M8 15.5h5" {...stroke} />
    </Svg>
  );
}

export function WhatsAppIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 3.6a8.4 8.4 0 0 0-7.2 12.6L4 20.4l4.3-1.1A8.4 8.4 0 1 0 12 3.6Z"
        {...stroke}
      />
      <path d="M9.2 9.4c.2-.5.4-.5.7-.5h.5c.2 0 .4.1.5.4l.7 1.7c.1.2 0 .4-.1.5l-.4.5c-.1.1-.1.3 0 .4.4.7 1.1 1.4 1.9 1.9.1.1.3.1.4 0l.5-.4c.2-.1.4-.2.5-.1l1.7.7c.3.1.4.3.4.5v.5c0 .3 0 .5-.5.7-.5.2-1.4.4-2.3 0-1.4-.6-2.8-1.7-3.9-3.1-1-1.2-1.7-2.6-1.9-3.8-.1-.7.1-1.3.3-1.5Z" {...stroke} />
    </Svg>
  );
}

export function SmsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 6.5h14a1.8 1.8 0 0 1 1.8 1.8v6.4A1.8 1.8 0 0 1 19 16.5H9.2L5 19.2V8.3A1.8 1.8 0 0 1 5 6.5Z" {...stroke} />
      <path d="M8.5 10.2h7M8.5 13h4.5" {...stroke} />
    </Svg>
  );
}

export function RecordedCallIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M8.2 3.8c.5-.5 1.3-.5 1.8 0l1.3 1.3c.5.5.5 1.2.1 1.7l-.9 1.1c.9 1.8 2.3 3.2 4.1 4.1l1.1-.9c.5-.4 1.2-.4 1.7.1l1.3 1.3c.5.5.5 1.3 0 1.8l-1 1c-.6.6-1.4.8-2.2.6-2.4-.6-4.9-2.3-7.1-4.5S4.6 8.1 4 5.7c-.2-.8 0-1.6.6-2.2l1.6-1.7Z"
        {...stroke}
      />
      <path d="M16.2 4.2v3.4M14.5 5.3v1.2M17.9 5.3v1.2" {...stroke} />
    </Svg>
  );
}

export function HumanDeskIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="9" r="3" {...stroke} />
      <path d="M5.8 19c.7-3 3-4.7 6.2-4.7s5.5 1.7 6.2 4.7" {...stroke} />
      <path d="M5.5 11.2a6.5 6.5 0 0 1 13 0" {...stroke} />
      <path d="M5.5 11.2v2.2c0 .7.6 1.3 1.3 1.3h.4M18.5 11.2v2.2c0 .7-.6 1.3-1.3 1.3h-.4" {...stroke} />
    </Svg>
  );
}

export function SeatingIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 10.5h14v2.2H5z" {...stroke} />
      <path d="M7 12.7V18M17 12.7V18M5 18h14" {...stroke} />
      <path d="M8.2 7.2a3.8 3.8 0 0 1 7.6 0" {...stroke} />
    </Svg>
  );
}

export function EventManageIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2" {...stroke} />
      <path d="M4 9.2h16M9 5v14M12.5 12.2h4.2M12.5 15h3" {...stroke} />
    </Svg>
  );
}

export function ReminderIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="13" r="6.2" {...stroke} />
      <path d="M12 10.2v3.2l2.1 1.2M9.2 5.2h5.6" {...stroke} />
    </Svg>
  );
}

export function LiveServiceIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3.1" {...stroke} />
      <path d="M7.2 7.2a6.8 6.8 0 0 0 0 9.6M16.8 7.2a6.8 6.8 0 0 1 0 9.6" {...stroke} />
      <path d="M4.6 4.6a10.4 10.4 0 0 0 0 14.8M19.4 4.6a10.4 10.4 0 0 1 0 14.8" {...stroke} />
    </Svg>
  );
}

export function CheckStatusIcon({
  status,
  size = 18,
}: {
  status: "included" | "addon" | "excluded";
  size?: number;
}) {
  if (status === "included") {
    return (
      <span className="pricing-compare-icon bg-[#EAF6EA] text-[#2F6B3A]" aria-hidden="true">
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M5.5 12.5 10 17l8.5-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (status === "addon") {
    return (
      <span className="pricing-compare-icon bg-[#FFF4E2] text-[#A86F2B]" aria-hidden="true">
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M12 6.5v11M6.5 12h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return (
    <span className="pricing-compare-icon bg-[#F4ECE4] text-[#8C7763]" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function WhatsAppBrandIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} shrink-0 fill-current`}>
      <path d="M20.5 3.5A11 11 0 0 0 2.1 16.8L1 23l6.4-1.1A11 11 0 0 0 12 23a11 11 0 0 0 8.5-19.5ZM12 21a9 9 0 0 1-4.6-1.3l-.3-.2-3.8.6.6-3.7-.2-.3A9 9 0 1 1 12 21Zm5-6.7c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.5.2-.3a.5.5 0 0 0 0-.5c0-.1-.6-1.4-.8-1.9s-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.8 11.8 0 0 0 4.5 4 15 15 0 0 0 1.5.6 3.6 3.6 0 0 0 1.7.1 2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3Z" />
    </svg>
  );
}
