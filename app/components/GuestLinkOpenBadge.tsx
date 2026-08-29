import {
  guestLinkWasOpened,
  type GuestLinkOpenState,
} from "@/lib/guestLinkTracking";

export default function GuestLinkOpenBadge({
  guest,
  className = "",
}: {
  guest?: GuestLinkOpenState | null;
  className?: string;
}) {
  const opened = guestLinkWasOpened(guest);

  return (
    <span
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
