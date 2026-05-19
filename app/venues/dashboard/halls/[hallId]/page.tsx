import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Crown,
  Edit3,
  FileText,
  GalleryHorizontalEnd,
  Grid3X3,
  ImageIcon,
  LayoutTemplate,
  MapPin,
  MenuSquare,
  Phone,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
  Utensils,
  WalletCards,
  Wrench,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    hallId: string;
  }>;
};

type EventRow = {
  date: string;
  time: string;
  type: string;
  client: string;
  status: string;
};

type SeatingTemplate = {
  title: string;
  subtitle: string;
  seats: string;
};

type MenuPackage = {
  name: string;
  description: string;
  icon: "crown" | "star" | "sparkles";
};

type StaffRow = {
  role: string;
  name: string;
  shift: string;
  initials: string;
};

type MaintenanceRow = {
  label: string;
  status: "תקין" | "דורש טיפול";
};

const hallImages = [
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=85",
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=900&q=85",
];

const upcomingEvents: EventRow[] = [
  {
    date: "היום",
    time: "19:30",
    type: "חתונה",
    client: "משפחת לוי",
    status: "בהכנות",
  },
  {
    date: "24.05",
    time: "20:00",
    type: "בר מצווה",
    client: "אורי כהן",
    status: "מאושר",
  },
  {
    date: "25.05",
    time: "19:00",
    type: "חתונה",
    client: "משפחת דבוש",
    status: "מאושר",
  },
  {
    date: "26.05",
    time: "18:30",
    type: "כנס חברה",
    client: "TechNova",
    status: "בהצעה",
  },
];

const seatingTemplates: SeatingTemplate[] = [
  {
    title: "חתונה",
    subtitle: "שולחנות משפחה + חברים",
    seats: "420",
  },
  {
    title: "בר מצווה",
    subtitle: "שולחנות ילדים ומשפחה",
    seats: "280",
  },
  {
    title: "כנס",
    subtitle: "הושבת הרצאה ושורות",
    seats: "180",
  },
];

const menuPackages: MenuPackage[] = [
  {
    name: "פרימיום",
    description: "7 עיקריות · 12 ראשונות · 6 קינוחים · טבעוני",
    icon: "crown",
  },
  {
    name: "קלאסי",
    description: "5 עיקריות · 10 ראשונות · 4 קינוחים · ילדים",
    icon: "star",
  },
  {
    name: "VIP",
    description: "8 עיקריות · 15 ראשונות · 7 קינוחים · בר שף",
    icon: "sparkles",
  },
];

const staffRows: StaffRow[] = [
  {
    role: "מנהל אולם",
    name: "דניאל מזרחי",
    shift: "15:00 - 01:00",
    initials: "דמ",
  },
  {
    role: "אחראית מטבח",
    name: "מיכל אדרי",
    shift: "16:00 - 00:30",
    initials: "מא",
  },
  {
    role: "צוות מלצרים",
    name: "12 עובדים",
    shift: "17:00 - 01:00",
    initials: "12",
  },
  {
    role: "ניקיון וסגירה",
    name: "צוות לילה",
    shift: "22:30 - 02:00",
    initials: "צנ",
  },
];

const maintenanceRows: MaintenanceRow[] = [
  { label: "תאורה", status: "תקין" },
  { label: "מערכת סאונד", status: "תקין" },
  { label: "מקרן ומסכים", status: "תקין" },
  { label: "מיזוג אוויר", status: "תקין" },
  { label: "מפות ומפיות", status: "דורש טיפול" },
  { label: "ניקיון והיגיינה", status: "תקין" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

function getHallName(hallId: string) {
  if (hallId === "garden-hall") return "גן אירועים";
  if (hallId === "sky-hall") return "SKY Hall";
  return "אולם הזהב";
}

export default async function VenueHallPage({ params }: Props) {
  const { hallId } = await params;
  const hallName = getHallName(hallId);

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f6f2] text-[#2b241c]">
      <div className="mx-auto max-w-[1760px] px-4 py-5 md:px-7">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Link
            href="/venues/dashboard"
            className="inline-flex h-11 w-fit items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] shadow-sm transition hover:bg-[#fbf5ea]"
          >
            <ArrowRight size={17} />
            חזרה לדשבורד המתחם
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] shadow-sm transition hover:bg-[#fbf5ea]"
            >
              <Edit3 size={16} />
              עריכת פרטי אולם
            </button>

            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] shadow-sm transition hover:bg-[#fbf5ea]"
            >
              <ImageIcon size={16} />
              עדכון תמונה
            </button>
          </div>
        </div>

        <section className="overflow-hidden rounded-[34px] border border-[#eadfce] bg-white shadow-sm">
          <div className="relative min-h-[210px] overflow-hidden">
            <img
              src={hallImages[0]}
              alt={hallName}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-white via-white/92 to-white/5" />
            <div className="relative z-10 flex min-h-[210px] flex-col justify-center px-6 py-8 md:px-10">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#f4ead9] text-[#b98121] shadow-sm">
                  <Crown size={34} />
                </div>

                <div>
                  <div className="text-sm font-black text-[#8a7b68]">
                    ניהול אולם
                  </div>
                  <h1 className="mt-1 text-4xl font-black tracking-tight text-[#2b241c] md:text-5xl">
                    {hallName}
                  </h1>
                  <p className="mt-2 text-base font-bold text-[#7f705d]">
                    האולם המרכזי · ניהול יומן, תבניות הושבה, תפריטים, צוות, משמרות ותחזוקה
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-[#eadfce] bg-[#fffdf8] p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            <HallKpi
              icon={<UsersRound size={22} />}
              label="קיבולת מקסימלית"
              value="420"
              subValue="אורחים"
            />
            <HallKpi
              icon={<CalendarDays size={22} />}
              label="אירועים החודש"
              value="18"
              subValue="אירועים"
            />
            <HallKpi
              icon={<CircleDollarSign size={22} />}
              label="הכנסות החודש"
              value={formatCurrency(486000)}
              subValue="סה״כ הכנסות"
            />
            <HallKpi
              icon={<Clock3 size={22} />}
              label="אירועים עתידיים"
              value="11"
              subValue="קדימה"
            />
            <HallKpi
              icon={<Clock3 size={22} />}
              label="האירוע הבא"
              value="היום 19:30"
              subValue="חתונה · משפחת לוי"
            />
            <HallKpi
              icon={<CheckCircle2 size={22} />}
              label="סטטוס אולם"
              value="פעיל"
              subValue="פתוח לאירועים"
              success
            />
          </div>

          <div className="overflow-x-auto border-t border-[#eadfce]">
            <div className="flex min-w-[1050px]">
              {[
                "סקירה כללית",
                "יומן אולם",
                "תבניות הושבה",
                "תפריטים",
                "צוות ומשמרות",
                "כספים",
                "גלריה",
                "ציוד ותחזוקה",
                "הגדרות",
              ].map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  className={[
                    "h-12 flex-1 border-l border-[#eadfce] px-4 text-sm font-black transition",
                    index === 0
                      ? "bg-[#b98121] text-white"
                      : "bg-[#fffdf8] text-[#6f6252] hover:bg-[#fbf5ea] hover:text-[#b98121]",
                  ].join(" ")}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[330px_1fr]">
          <aside className="space-y-5 xl:order-1">
            <div className="rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Building2 size={19} className="text-[#b98121]" />
                <h2 className="text-lg font-black">פרטי אולם</h2>
              </div>

              <div className="space-y-3 text-sm">
                <InfoLine label="שם האולם" value={hallName} />
                <InfoLine label="סוג אולם" value="אולם אירועים מרכזי" />
                <InfoLine label="קומה" value="קומת קרקע" />
                <InfoLine label="שטח" value="1,200 מ״ר" />
                <InfoLine label="קיבולת ישיבה" value="420 אורחים" />
              </div>

              <div className="my-5 h-px bg-[#eadfce]" />

              <InfoBlock
                icon={<MapPin size={18} />}
                title="מיקום במתחם"
                description="האולם המרכזי, כניסה A"
              />

              <InfoBlock
                icon={<UsersRound size={18} />}
                title="מנהל אולם"
                description="דניאל מזרחי · 052-1234567"
              />

              <InfoBlock
                icon={<Phone size={18} />}
                title="איש קשר"
                description="רונית כהן · 050-9876543"
              />

              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
                >
                  <Plus size={17} />
                  הוסף אירוע
                </button>

                <button
                  type="button"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
                >
                  <UsersRound size={17} />
                  צור משמרת
                </button>

                <button
                  type="button"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
                >
                  <Grid3X3 size={17} />
                  הוסף תבנית הושבה
                </button>
              </div>
            </div>
          </aside>

          <div className="grid gap-5 xl:order-2">
            <section className="grid gap-5 lg:grid-cols-3">
              <DashboardCard
                title="יומן אולם"
                icon={<CalendarDays size={20} />}
                footer="צפה ביומן המלא"
              >
                <div className="space-y-2">
                  {upcomingEvents.map((event) => (
                    <div
                      key={`${event.date}-${event.time}-${event.client}`}
                      className="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 py-2"
                    >
                      <div className="text-right">
                        <div className="text-xs font-black text-[#9b8a73]">
                          {event.date}
                        </div>
                        <div className="text-sm font-black text-[#2b241c]">
                          {event.time}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-black text-[#2b241c]">
                          {event.type}
                        </div>
                        <div className="text-xs font-bold text-[#8a7b68]">
                          {event.client}
                        </div>
                      </div>

                      <span className="rounded-full bg-[#f4ead9] px-2.5 py-1 text-[11px] font-black text-[#b98121]">
                        {event.status}
                      </span>
                    </div>
                  ))}
                </div>
              </DashboardCard>

              <DashboardCard
                title="תבניות הושבה"
                icon={<LayoutTemplate size={20} />}
                footer="ניהול תבניות"
              >
                <div className="grid grid-cols-3 gap-3">
                  {seatingTemplates.map((template) => (
                    <div
                      key={template.title}
                      className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-center"
                    >
                      <div className="mx-auto grid h-16 w-full grid-cols-4 gap-1 rounded-xl bg-white p-2">
                        {Array.from({ length: 16 }).map((_, index) => (
                          <span
                            key={index}
                            className="rounded-full border border-[#d9c9ad] bg-[#fbf5ea]"
                          />
                        ))}
                      </div>
                      <div className="mt-3 text-sm font-black text-[#2b241c]">
                        {template.title}
                      </div>
                      <div className="mt-1 text-xs font-bold text-[#8a7b68]">
                        {template.seats} אורחים
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardCard>

              <DashboardCard
                title="תפריטים וחבילות"
                icon={<Utensils size={20} />}
                footer="צפייה בכל התפריטים"
              >
                <div className="space-y-3">
                  {menuPackages.map((pkg) => (
                    <div
                      key={pkg.name}
                      className="flex items-start gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
                        {pkg.icon === "crown" ? (
                          <Crown size={18} />
                        ) : pkg.icon === "star" ? (
                          <Star size={18} />
                        ) : (
                          <Sparkles size={18} />
                        )}
                      </div>

                      <div>
                        <div className="text-sm font-black text-[#2b241c]">
                          {pkg.name}
                        </div>
                        <div className="mt-1 text-xs font-bold leading-5 text-[#8a7b68]">
                          {pkg.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            </section>

            <section className="grid gap-5 lg:grid-cols-3">
              <DashboardCard
                title="צוות ומשמרות"
                icon={<UsersRound size={20} />}
                footer="ניהול צוות ומשמרות"
              >
                <div className="space-y-2">
                  {staffRows.map((staff) => (
                    <div
                      key={`${staff.role}-${staff.name}`}
                      className="flex items-center gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f4ead9] text-xs font-black text-[#b98121]">
                        {staff.initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-[#2b241c]">
                          {staff.role}
                        </div>
                        <div className="truncate text-xs font-bold text-[#8a7b68]">
                          {staff.name}
                        </div>
                      </div>

                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#8a7b68]">
                        {staff.shift}
                      </span>
                    </div>
                  ))}
                </div>
              </DashboardCard>

              <DashboardCard
                title="כספים ותשלומים"
                icon={<WalletCards size={20} />}
                footer="מעבר לדוחות כספיים"
              >
                <div className="grid grid-cols-2 gap-3">
                  <FinanceBox label="סה״כ שולם" value="₪386,000" tone="green" />
                  <FinanceBox label="יתרה פתוחה" value="₪100,000" tone="red" />
                  <FinanceBox label="פיקדונות" value="₪120,000" />
                  <FinanceBox label="תשלום צפוי" value="24.05 · ₪50,000" />
                </div>
              </DashboardCard>

              <DashboardCard
                title="ציוד ותחזוקה"
                icon={<Wrench size={20} />}
                footer="ניהול ציוד ותחזוקה"
              >
                <div className="grid grid-cols-2 gap-2">
                  {maintenanceRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 py-2"
                    >
                      <span className="text-xs font-black text-[#2b241c]">
                        {row.label}
                      </span>
                      <span
                        className={[
                          "rounded-full px-2 py-1 text-[10px] font-black",
                          row.status === "תקין"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700",
                        ].join(" ")}
                      >
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 p-3">
                  <div className="text-xs font-black text-rose-700">
                    2 משימות פתוחות
                  </div>
                  <div className="mt-1 text-xs font-bold leading-5 text-rose-600">
                    בדיקת מפות צד שמאל · החלפת נורה במסדרון
                  </div>
                </div>
              </DashboardCard>
            </section>

            <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              <DashboardCard
                title="גלריית אולם"
                icon={<GalleryHorizontalEnd size={20} />}
                footer="צפייה בגלריה המלאה"
              >
                <div className="grid grid-cols-5 gap-3">
                  {hallImages.slice(0, 5).map((image, index) => (
                    <div
                      key={image}
                      className={[
                        "overflow-hidden rounded-2xl border border-[#eadfce] bg-[#fffdf8]",
                        index === 0 ? "col-span-2 row-span-2" : "",
                      ].join(" ")}
                    >
                      <img
                        src={image}
                        alt={`תמונת אולם ${index + 1}`}
                        className="h-full min-h-[92px] w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </DashboardCard>

              <DashboardCard
                title="הערות ותזכורות"
                icon={<Bell size={20} />}
                footer="מעבר לכל ההערות"
              >
                <div className="space-y-2">
                  <NoteRow
                    date="24.05"
                    text="לבדוק סידור פרחים לכיסא חתן וכלה לפני כניסת אורחים."
                  />
                  <NoteRow
                    date="24.05"
                    text="לוודא חניה נוספת לאורחים VIP לקראת האירוע בערב."
                  />
                  <NoteRow
                    date="26.05"
                    text="לעדכן תפריט VIP ולשלוח אישור מול המטבח."
                  />
                  <NoteRow
                    date="27.05"
                    text="בדיקת סאונד ותאורה לפני כנס עסקי."
                  />
                </div>
              </DashboardCard>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function HallKpi({
  icon,
  label,
  value,
  subValue,
  success,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  success?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-[#eadfce] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div
          className={[
            "flex h-11 w-11 items-center justify-center rounded-2xl",
            success ? "bg-emerald-50 text-emerald-700" : "bg-[#f4ead9] text-[#b98121]",
          ].join(" ")}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4 text-xs font-black text-[#8a7b68]">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-[#2b241c]">
        {value}
      </div>
      <div className="mt-1 text-xs font-bold text-[#9b8a73]">
        {subValue}
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  icon,
  footer,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  footer: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
            {icon}
          </div>
          <h2 className="text-base font-black text-[#2b241c]">
            {title}
          </h2>
        </div>
      </div>

      {children}

      <button
        type="button"
        className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#b98121] transition hover:text-[#8a5e14]"
      >
        {footer}
        <ArrowRight size={15} />
      </button>
    </section>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#fffdf8] px-3 py-2">
      <span className="text-xs font-black text-[#8a7b68]">{label}</span>
      <span className="text-sm font-black text-[#2b241c]">{value}</span>
    </div>
  );
}

function InfoBlock({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-3 flex gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
        {icon}
      </div>
      <div>
        <div className="text-sm font-black text-[#2b241c]">{title}</div>
        <div className="mt-1 text-xs font-bold leading-5 text-[#8a7b68]">
          {description}
        </div>
      </div>
    </div>
  );
}

function FinanceBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "red";
}) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
      <div className="text-xs font-black text-[#8a7b68]">{label}</div>
      <div
        className={[
          "mt-2 text-lg font-black",
          tone === "green"
            ? "text-emerald-700"
            : tone === "red"
              ? "text-rose-700"
              : "text-[#2b241c]",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function NoteRow({ date, text }: { date: string; text: string }) {
  return (
    <div className="grid grid-cols-[62px_1fr] gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 py-2">
      <div className="text-xs font-black text-[#b98121]">{date}</div>
      <div className="text-xs font-bold leading-5 text-[#7f705d]">{text}</div>
    </div>
  );
}
