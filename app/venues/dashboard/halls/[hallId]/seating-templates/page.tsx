import Link from "next/link";
import mongoose from "mongoose";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Grid3X3,
  LayoutTemplate,
  Plus,
  UsersRound,
  Utensils,
} from "lucide-react";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import VenueHall from "@/models/VenueHall";
import VenueSeatingTemplate from "@/models/VenueSeatingTemplate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{
    hallId: string;
  }>;
};

type SerializedHall = {
  id: string;
  name: string;
  subtitle: string;
  capacity: number;
  status: string;
  image: string;
};

type SerializedSeatingTemplate = {
  id: string;
  name: string;
  description: string;
  tablesCount: number;
  hasBackground: boolean;
  zonesCount: number;
  createdAt: string;
};

function encodeHallPath(hallId: string) {
  return encodeURIComponent(hallId);
}

function formatDateTime(value: string) {
  if (!value) return "לא הוגדר";

  try {
    return new Intl.DateTimeFormat("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function serializeHall(hall: any): SerializedHall {
  return {
    id: String(hall.id || hall._id || ""),
    name: String(hall.name || "אולם ללא שם"),
    subtitle: String(hall.subtitle || ""),
    capacity: Number(hall.capacity || 0),
    status: String(hall.status || "active"),
    image: String(hall.image || ""),
  };
}

function serializeSeatingTemplate(template: any): SerializedSeatingTemplate {
  const canvas = template.canvas || {};
  const zones = canvas?.zones;

  return {
    id: String(template._id),
    name: String(template.name || "תבנית ללא שם"),
    description: String(template.description || ""),
    tablesCount: Array.isArray(template.tables) ? template.tables.length : 0,
    hasBackground: Boolean(canvas?.background?.url || canvas?.background),
    zonesCount: Array.isArray(zones) ? zones.length : 0,
    createdAt: template.createdAt
      ? new Date(template.createdAt).toISOString()
      : "",
  };
}

export default async function VenueSeatingTemplatesPage({ params }: Props) {
  await connectDB();

  const auth = await getUserIdFromRequest();

  if (!auth?.userId) {
    redirect("/login");
  }

  const { hallId } = await params;
  const decodedHallId = decodeURIComponent(hallId);

  const hallOrConditions: any[] = [{ id: hallId }, { id: decodedHallId }];

  if (mongoose.Types.ObjectId.isValid(hallId)) {
    hallOrConditions.push({ _id: hallId });
  }

  const rawHall = await VenueHall.findOne({
    ownerId: auth.userId,
    $or: hallOrConditions,
  }).lean();

  if (!rawHall) {
    notFound();
  }

  const hall = serializeHall(rawHall);
  const safeHallId = hall.id || decodedHallId;
  const encodedHallId = encodeHallPath(safeHallId);

  const hallPageHref = `/venues/dashboard/halls/${encodedHallId}`;
  const hallCalendarHref = `/venues/dashboard/halls/${encodedHallId}/calendar`;
  const hallCrmHref = `/venues/dashboard/halls/${encodedHallId}/crm`;
  const hallMenusHref = `/venues/dashboard/halls/${encodedHallId}/menus`;
  const hallStaffHref = `/venues/dashboard/halls/${encodedHallId}/staff`;
  const createTemplateHref = `/dashboard/seating?mode=venue-template&hallId=${encodedHallId}`;

  const templatesRaw = await VenueSeatingTemplate.find({
    ownerId: auth.userId,
    hallId: safeHallId,
    isActive: true,
  })
    .sort({ createdAt: -1 })
    .lean();

  const templates = templatesRaw.map(serializeSeatingTemplate);

  const totalTables = templates.reduce(
    (sum, template) => sum + template.tablesCount,
    0
  );

  const templatesWithBackground = templates.filter(
    (template) => template.hasBackground
  ).length;

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f6f2] text-[#2b241c]">
      <div className="mx-auto max-w-[1760px] px-4 py-5 md:px-7">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Link
            href={hallPageHref}
            className="inline-flex h-11 w-fit items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] shadow-sm transition hover:bg-[#fbf5ea]"
          >
            <ArrowRight size={17} />
            חזרה לניהול האולם
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={hallCalendarHref}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-4 text-sm font-black text-[#9f6f1a] shadow-sm transition hover:bg-[#f4ead9]"
            >
              <CalendarDays size={16} />
              יומן אולם
            </Link>

            <Link
              href={hallCrmHref}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-4 text-sm font-black text-[#9f6f1a] shadow-sm transition hover:bg-[#f4ead9]"
            >
              <UsersRound size={16} />
              CRM לקוחות
            </Link>

            <Link
              href={hallMenusHref}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-4 text-sm font-black text-[#9f6f1a] shadow-sm transition hover:bg-[#f4ead9]"
            >
              <Utensils size={16} />
              תפריטים
            </Link>

            <Link
              href={hallStaffHref}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-4 text-sm font-black text-[#9f6f1a] shadow-sm transition hover:bg-[#f4ead9]"
            >
              <UsersRound size={16} />
              צוות ומשמרות
            </Link>
          </div>
        </div>

        <section className="overflow-hidden rounded-[34px] border border-[#eadfce] bg-white shadow-sm">
          <div className="relative min-h-[230px] overflow-hidden">
            {hall.image ? (
              <img
                src={hall.image}
                alt={hall.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-l from-[#fff8ec] via-white to-[#f4ead9]" />
            )}

            <div className="absolute inset-0 bg-gradient-to-l from-white via-white/94 to-white/20" />

            <div className="relative z-10 flex min-h-[230px] flex-col justify-center px-6 py-8 md:px-10">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#f4ead9] text-[#b98121] shadow-sm">
                    <LayoutTemplate size={34} />
                  </div>

                  <div>
                    <div className="text-sm font-black text-[#8a7b68]">
                      {hall.name}
                    </div>

                    <h1 className="mt-1 text-4xl font-black tracking-tight text-[#2b241c] md:text-5xl">
                      ניהול תבניות הושבה
                    </h1>

                    <p className="mt-2 max-w-3xl text-base font-bold leading-7 text-[#7f705d]">
                      כאן בעל האולם שומר סקיצות הושבה קבועות לפי אולם. לאחר מכן
                      ניתן לבחור תבנית מוכנה עבור לקוחות ואירועים חדשים.
                    </p>
                  </div>
                </div>

                <Link
                  href={createTemplateHref}
                  className="inline-flex h-12 w-fit items-center justify-center gap-2 rounded-2xl bg-[#B8872E] px-6 text-sm font-black text-white shadow-sm transition hover:bg-[#9f7427]"
                >
                  <Plus size={18} />
                  הוסף תבנית הושבה
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-[#eadfce] bg-[#fffdf8] p-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<LayoutTemplate size={22} />}
              label="תבניות באולם"
              value={`${templates.length}`}
              subValue="סקיצות שמורות"
            />

            <StatCard
              icon={<Grid3X3 size={22} />}
              label="סה״כ שולחנות"
              value={`${totalTables}`}
              subValue="בכל התבניות"
            />

            <StatCard
              icon={<Building2 size={22} />}
              label="קיבולת אולם"
              value={`${hall.capacity || 0}`}
              subValue="אורחים"
            />

            <StatCard
              icon={<LayoutTemplate size={22} />}
              label="עם רקע / סקיצה"
              value={`${templatesWithBackground}`}
              subValue="תבניות עם תמונת אולם"
            />
          </div>

          <div className="overflow-x-auto border-t border-[#eadfce]">
            <div className="flex min-w-[900px]">
              <TopTab href={hallPageHref} label="סקירה כללית" />
              <TopTab href={hallCalendarHref} label="יומן אולם" />
              <TopTab href="#" label="תבניות הושבה" active />
              <TopTab href={hallMenusHref} label="תפריטים" />
              <TopTab href={hallStaffHref} label="צוות ומשמרות" />
            </div>
          </div>
        </section>

        <section className="mt-5">
          {templates.length === 0 ? (
            <div className="rounded-[34px] border border-dashed border-[#d8bd83] bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#f4ead9] text-[#b98121]">
                <LayoutTemplate size={32} />
              </div>

              <h2 className="mt-5 text-2xl font-black text-[#2b241c]">
                עדיין אין תבניות הושבה באולם הזה
              </h2>

              <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-7 text-[#8a7b68]">
                לחצי על הכפתור למטה כדי לפתוח את מערכת ההושבה הקיימת, לבנות
                סקיצת שולחנות לאולם, ולשמור אותה כתבנית לשימוש עתידי.
              </p>

              <Link
                href={createTemplateHref}
                className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#B8872E] px-7 text-sm font-black text-white shadow-sm transition hover:bg-[#9f7427]"
              >
                <Plus size={18} />
                צור תבנית ראשונה
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {templates.map((template) => (
                <article
                  key={template.id}
                  className="rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
                      <LayoutTemplate size={24} />
                    </div>

                    <span className="rounded-full bg-[#fff8eb] px-3 py-1 text-[11px] font-black text-[#b98121]">
                      תבנית אולם
                    </span>
                  </div>

                  <h2 className="mt-5 text-xl font-black text-[#2b241c]">
                    {template.name}
                  </h2>

                  {template.description ? (
                    <p className="mt-2 text-sm font-bold leading-6 text-[#8a7b68]">
                      {template.description}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm font-bold leading-6 text-[#8a7b68]">
                      סקיצת הושבה שמורה עבור {hall.name}.
                    </p>
                  )}

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <MiniInfo
                      label="שולחנות"
                      value={`${template.tablesCount}`}
                    />

                    <MiniInfo
                      label="אזורים"
                      value={`${template.zonesCount}`}
                    />

                    <MiniInfo
                      label="רקע אולם"
                      value={template.hasBackground ? "קיים" : "אין"}
                    />

                    <MiniInfo
                      label="נוצר"
                      value={formatDateTime(template.createdAt)}
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href={createTemplateHref}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-4 text-xs font-black text-[#9f6f1a] transition hover:bg-[#f4ead9]"
                    >
                      <Grid3X3 size={15} />
                      צור תבנית נוספת
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function TopTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex h-12 flex-1 items-center justify-center border-l border-[#eadfce] px-4 text-sm font-black transition",
        active
          ? "bg-[#b98121] text-white"
          : "bg-[#fffdf8] text-[#6f6252] hover:bg-[#fbf5ea] hover:text-[#b98121]",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function StatCard({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#eadfce] bg-white p-4 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
        {icon}
      </div>

      <div className="mt-4 text-xs font-black text-[#8a7b68]">{label}</div>
      <div className="mt-1 text-xl font-black text-[#2b241c]">{value}</div>
      <div className="mt-1 text-xs font-bold text-[#9b8a73]">{subValue}</div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div className="text-[11px] font-black text-[#8a7b68]">{label}</div>
      <div className="mt-1 text-sm font-black text-[#2b241c]">{value}</div>
    </div>
  );
}