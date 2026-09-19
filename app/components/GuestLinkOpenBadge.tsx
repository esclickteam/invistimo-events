import {
  guestLinkWasOpened,
  formatGuestLinkOpenedAt,
  type GuestLinkOpenState,
} from "@/lib/guestLinkTracking";

export default function GuestLinkOpenBadge({
  guest,
  className = "",
  showTooltip = true,
}: {
  guest?: GuestLinkOpenState | null;
  className?: string;
  showTooltip?: boolean;
}) {
  const opened = guestLinkWasOpened(guest);
  const first = formatGuestLinkOpenedAt(guest?.firstOpenedAt);
  const last = formatGuestLinkOpenedAt(guest?.lastOpenedAt);
  const count = Number(guest?.openCount || 0);

  const title = opened
    ? [
        first ? `פתיחה ראשונה: ${first}` : null,
        last ? `פתיחה אחרונה: ${last}` : null,
        `מספר פתיחות: ${count}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "הקישור עדיין לא נפתח";

  return (
    <span
      title={showTooltip ? title : undefined}
      className={`
        inline-flex
        items-center
        justify-center
        min-w-[72px]
        rounded-full
        border
        px-2.5
        py-1
        text-[11px]
        font-black
        cursor-default
        ${
          opened
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-[#E7DED1] bg-[#F7F3EC] text-[#8A7A68]"
        }
        ${className}
      `}
    >
      {opened ? "נפתח" : "לא נפתח"}
    </span>
  );
}
