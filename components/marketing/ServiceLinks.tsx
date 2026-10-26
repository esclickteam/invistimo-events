import Link from "next/link";

const LINKS = [
  { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
  { href: "/rsvp/hina", label: "אישורי הגעה לחינה" },
  { href: "/rsvp/whatsapp", label: "אישורי הגעה בוואטסאפ" },
  { href: "/invitations/chatuna", label: "הזמנות דיגיטליות" },
  { href: "/rsvp/save-the-date", label: "Save the Date" },
  { href: "/seating-explained", label: "סידורי הושבה" },
  { href: "/event-management", label: "ניהול אירוע" },
  { href: "/services/alcohol-management", label: "ניהול אלכוהול באירועים" },
  { href: "/pricing", label: "חבילות ומחירים" },
  { href: "/info/guides", label: "מדריכים" },
  { href: "/info/about", label: "אודות" },
];

export default function ServiceLinks({ current }: { current?: string }) {
  const links = LINKS.filter((link) => link.href !== current);

  return (
    <section dir="rtl" className="bg-[#FBF6EE] px-5 py-14 text-[#3F3025]">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-black text-[#35281F]">עוד ב־Invistimo</h2>
        <ul className="mt-5 flex flex-wrap gap-3">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex rounded-full border border-[#E6D2AA] bg-white px-4 py-2 text-sm font-bold text-[#5E4735]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
