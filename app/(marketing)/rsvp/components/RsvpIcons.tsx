type IconProps = { className?: string };

export function IconLink({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M10 14a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M14 10a5 5 0 0 1 0 7L12.5 18.5a5 5 0 0 1-7-7L7 10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconRefresh({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M20 12a8 8 0 1 1-2.3-5.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M20 5v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconUsers({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.2 19c.4-2 1.7-3.3 3.6-3.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconPhone({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M8.2 4.8c.4-.4 1-.5 1.5-.3l2 1c.5.2.8.7.8 1.2v2.1c0 .4-.2.8-.5 1-.7.5-1.1 1.3-1 2.1.3 2 1.9 3.6 3.9 3.9.8.1 1.6-.3 2.1-1 .2-.3.6-.5 1-.5h2.1c.5 0 1 .3 1.2.8l1 2c.2.5.1 1.1-.3 1.5-1.4 1.4-3.5 2-5.5 1.4-4.4-1.3-7.9-4.8-9.2-9.2-.6-2 .0-4.1 1.4-5.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSeating({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3.5" y="8" width="17" height="5.5" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 13.5V18M18 13.5V18M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function IconMobile({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 18.5h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconWhatsapp({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.95.52 3.84 1.5 5.5L2 22l4.82-1.56a10 10 0 0 0 5.22 1.45h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2Zm5.76 13.98c-.24.67-1.4 1.24-1.95 1.32-.5.07-1.14.1-1.84-.12-.42-.13-.97-.32-1.67-.63-2.94-1.27-4.85-4.23-5-4.42-.14-.2-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.45.27-.3.59-.37.79-.37h.57c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.15.12.32.02.52-.1.2-.15.32-.3.5-.14.17-.3.38-.43.51-.14.14-.29.29-.12.56.16.27.72 1.19 1.55 1.93 1.06.94 1.96 1.23 2.23 1.37.27.14.43.12.59-.07.16-.2.67-.78.85-1.05.18-.27.36-.22.6-.13.24.09 1.54.73 1.8.86.27.13.44.2.51.31.07.11.07.64-.17 1.31Z"
      />
    </svg>
  );
}

export function IconSms({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4.5 5.5h15A1.5 1.5 0 0 1 21 7v8.5a1.5 1.5 0 0 1-1.5 1.5H9l-3.8 3v-3H4.5A1.5 1.5 0 0 1 3 15.5V7A1.5 1.5 0 0 1 4.5 5.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8 10h8M8 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconCall({ className }: IconProps) {
  return <IconPhone className={className} />;
}

export const HOW_ICONS = {
  link: IconLink,
  refresh: IconRefresh,
  users: IconUsers,
  phone: IconPhone,
  seating: IconSeating,
  mobile: IconMobile,
} as const;

export const CHANNEL_ICONS = {
  whatsapp: IconWhatsapp,
  sms: IconSms,
  call: IconCall,
} as const;
