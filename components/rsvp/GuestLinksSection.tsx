import {
  resolveVisibleGuestLinks,
  type GuestLinkPageKind,
  type GuestLinksSection as GuestLinksSectionData,
} from "@/lib/eventDetails/guestLinksSection";

type Props = {
  section?: GuestLinksSectionData | null;
  page: GuestLinkPageKind;
  className?: string;
};

/**
 * Guest-facing custom links card.
 * Renders nothing (no spacer) when the section is off or has no matching links.
 */
export default function GuestLinksSection({
  section,
  page,
  className = "",
}: Props) {
  const resolved = resolveVisibleGuestLinks(section, page);
  if (resolved.links.length === 0) return null;

  const title = resolved.section.title;
  const subtitle = resolved.section.subtitle;

  return (
    <section
      className={`w-full overflow-hidden rounded-[30px] border border-[#eadfce] bg-white/90 p-6 text-center shadow-[0_20px_70px_rgba(92,66,38,0.12)] backdrop-blur ${className}`}
      data-guest-links-section="1"
      data-guest-links-page={page}
    >
      <h3 className="text-xl font-black leading-tight text-[#2d241c]">{title}</h3>

      {subtitle ? (
        <p className="mx-auto mt-2 max-w-sm text-sm font-bold leading-7 text-[#6b6046]">
          {subtitle}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3">
        {resolved.links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex
              min-h-12
              w-full
              items-center
              justify-center
              rounded-2xl
              border
              border-[#d8c7ad]
              bg-gradient-to-l
              from-white
              to-[#fff7ea]
              px-4
              py-3
              text-sm
              font-black
              text-[#5a4634]
              shadow-sm
              transition
              hover:bg-[#fbf7f0]
              hover:shadow-md
            "
          >
            {link.label}
          </a>
        ))}
      </div>
    </section>
  );
}
