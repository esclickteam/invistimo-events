import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CreditCard,
  ImageIcon,
  Settings,
  UsersRound,
  Wrench,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    hallId: string;
  }>;
};

export default async function VenueHallPage({ params }: Props) {
  const { hallId } = await params;

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f6f2] px-4 py-6 text-[#2b241c] md:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/venues/dashboard"
          className="inline-flex items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 py-2 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
        >
          <ArrowRight size={17} />
          חזרה לדשבורד המתחם
        </Link>

        <section className="mt-5 rounded-[32px] border border-[#eadfce] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#f4ead9] text-[#b98121]">
                <Building2 size={25} />
              </div>

              <div>
                <h1 className="text-2xl font-black md:text-3xl">ניהול אולם</h1>
                <p className="mt-1 text-sm font-bold text-[#8a7b68]">מזהה אולם: {hallId}</p>
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <HallActionCard
              icon={<CalendarDays size={22} />}
              title="יומן אולם"
              description="כל האירועים של האולם הזה בלבד, לפי ימים ושעות."
            />

            <HallActionCard
              icon={<UsersRound size={22} />}
              title="צוות אולם"
              description="מנהל אולם, עובדים, ניקיון ותפעול לאולם הספציפי."
            />

            <HallActionCard
              icon={<Wrench size={22} />}
              title="תחזוקה וציוד"
              description="תקלות, ציוד חסר, בדיקות סאונד/תאורה ומשימות."
            />

            <HallActionCard
              icon={<CreditCard size={22} />}
              title="כספים"
              description="הכנסות, מקדמות ותשלומים שמשויכים לאולם הזה."
            />

            <HallActionCard
              icon={<ImageIcon size={22} />}
              title="גלריית אולם"
              description="תמונות האולם שיוצגו במערכת ובמסמכים."
            />

            <HallActionCard
              icon={<Settings size={22} />}
              title="הגדרות אולם"
              description="שם, תמונה, קיבולת, סטטוס, תיאור ופרטים כלליים."
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function HallActionCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[26px] border border-[#eadfce] bg-[#fffdf8] p-5 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
        {icon}
      </div>

      <div className="mt-4 text-base font-black text-[#2b241c]">{title}</div>
      <p className="mt-2 text-sm font-bold leading-6 text-[#8a7b68]">{description}</p>
    </div>
  );
}
