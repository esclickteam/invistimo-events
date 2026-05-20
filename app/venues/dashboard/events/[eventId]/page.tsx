"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Edit3,
  Eye,
  FileText,
  FolderOpen,
  Link2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  Receipt,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";

type PaymentStatus = "paid" | "partial" | "unpaid";

type PaymentRow = {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  note: string;
};

type TaskRow = {
  id: string;
  title: string;
  dueDate: string;
  status: "done" | "open" | "urgent";
};

type FileRow = {
  id: string;
  title: string;
  type: "pdf" | "image" | "excel";
  date: string;
  size: string;
};

type ActivityRow = {
  id: string;
  title: string;
  date: string;
  description: string;
};

type VenueMenuTemplate = {
  id: string;
  name: string;
  type: string;
  categories: number;
  dishes: number;
  status: "active" | "draft";
  description: string;
};

type AssignedMenu = {
  id: string;
  templateId: string;
  name: string;
  sentToCouple: boolean;
  coupleSelected: boolean;
  approved: boolean;
};

const payments: PaymentRow[] = [
  {
    id: "p1",
    title: "מקדמה ששולמה",
    amount: 30000,
    dueDate: "15.11.25",
    status: "paid",
    note: "שולם באשראי",
  },
  {
    id: "p2",
    title: "תשלום ביניים",
    amount: 92500,
    dueDate: "25.11.25",
    status: "partial",
    note: "שולם חלקית",
  },
  {
    id: "p3",
    title: "יתרה לתשלום",
    amount: 52500,
    dueDate: "לאחר האירוע",
    status: "unpaid",
    note: "טרם שולם",
  },
];

const tasks: TaskRow[] = [
  {
    id: "t1",
    title: "אישור תפריט סופי",
    dueDate: "17.05.26",
    status: "urgent",
  },
  {
    id: "t2",
    title: "סגירת תכנית הושבה",
    dueDate: "20.05.26",
    status: "open",
  },
  {
    id: "t3",
    title: "בדיקת תאורה וסאונד",
    dueDate: "18.05.26",
    status: "done",
  },
  {
    id: "t4",
    title: "אישור עיצוב שולחנות",
    dueDate: "22.05.26",
    status: "open",
  },
];

const files: FileRow[] = [
  {
    id: "f1",
    title: "הסכם חתום.pdf",
    type: "pdf",
    date: "15.11.25",
    size: "1.2MB",
  },
  {
    id: "f2",
    title: "הצעת מחיר.pdf",
    type: "pdf",
    date: "10.11.25",
    size: "980KB",
  },
  {
    id: "f3",
    title: "סקיצה הושבה.xlsx",
    type: "excel",
    date: "21.11.25",
    size: "250KB",
  },
];

const activities: ActivityRow[] = [
  {
    id: "a1",
    title: "התקבל תשלום 20,000 ₪",
    date: "25.11.25 14:30",
    description: "עודכן על ידי מנהל האירוע.",
  },
  {
    id: "a2",
    title: "נשלחה הצעת מחיר ללקוח",
    date: "15.11.25 11:15",
    description: "ההצעה נשלחה במייל.",
  },
  {
    id: "a3",
    title: "פגישה התקיימה",
    date: "15.11.25 16:00",
    description: "סוכמו תאריך, אולם וכמות מוזמנים.",
  },
];

const venueMenuTemplates: VenueMenuTemplate[] = [
  {
    id: "menu-premium",
    name: "תפריט פרימיום",
    type: "חתונות",
    categories: 5,
    dishes: 28,
    status: "active",
    description: "ראשונות, עיקריות, בופה, קינוחים ובר אפטר.",
  },
  {
    id: "menu-classic",
    name: "תפריט קלאסי",
    type: "אירועים כלליים",
    categories: 4,
    dishes: 22,
    status: "active",
    description: "תפריט בסיס עשיר עם בחירה גמישה לזוג.",
  },
  {
    id: "menu-vip",
    name: "תפריט VIP",
    type: "אירועי יוקרה",
    categories: 6,
    dishes: 34,
    status: "active",
    description: "תפריט מורחב עם עמדות מיוחדות וקינוחים אישיים.",
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

function paymentStatusLabel(status: PaymentStatus) {
  if (status === "paid") return "שולם";
  if (status === "partial") return "חלקי";
  return "פתוח";
}

function paymentStatusClass(status: PaymentStatus) {
  if (status === "paid") return "bg-emerald-50 text-emerald-700";
  if (status === "partial") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function taskStatusClass(status: TaskRow["status"]) {
  if (status === "done") return "bg-emerald-50 text-emerald-700";
  if (status === "urgent") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function taskStatusLabel(status: TaskRow["status"]) {
  if (status === "done") return "בוצע";
  if (status === "urgent") return "דחוף";
  return "פתוח";
}

export default function VenueEventPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId || "evt-1001";

  const hallId = "main-gold-hall";

  const [activeTab, setActiveTab] = useState("overview");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [menuSelectOpen, setMenuSelectOpen] = useState(false);
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const [assignedMenu, setAssignedMenu] = useState<AssignedMenu | null>(null);

  const financial = useMemo(() => {
    const commitment = 145000;
    const deposit = 30000;
    const totalPaid = 92500;
    const estimatedBalance = commitment - totalPaid;
    const nextPayment = 20000;
    const expectedAfterEvent = 52500;
    const paidPercentage = Math.round((totalPaid / commitment) * 100);

    return {
      commitment,
      deposit,
      totalPaid,
      estimatedBalance,
      nextPayment,
      expectedAfterEvent,
      paidPercentage,
    };
  }, []);

  const chooseMenuForEvent = (template: VenueMenuTemplate) => {
    setAssignedMenu({
      id: `event-menu-${Date.now()}`,
      templateId: template.id,
      name: template.name,
      sentToCouple: false,
      coupleSelected: false,
      approved: false,
    });

    setMenuSelectOpen(false);
    setActiveTab("menu");
  };

  const markMenuSent = () => {
    setAssignedMenu((current) =>
      current
        ? {
            ...current,
            sentToCouple: true,
          }
        : current
    );

    setSendMenuOpen(false);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f6f2] text-[#2b241c]">
      <div className="mx-auto max-w-[1820px] px-4 py-5 md:px-7">
        <header className="mb-5 rounded-[32px] border border-[#eadfce] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[#9b8a73]">
                <span>אירועים</span>
                <span>›</span>
                <span>אולם הזהב</span>
                <span>›</span>
                <span>#{eventId}</span>
              </div>

              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#f4ead9] text-[#b98121]">
                  <CalendarDays size={32} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                      חתונה - משפחת לוי
                    </h1>

                    <span className="rounded-full bg-[#fff4dc] px-3 py-1 text-xs font-black text-[#b98121]">
                      סגור
                    </span>

                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                      לא הושלמה הושבה
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-bold text-[#7f705d]">
                    <span>19.05.2026</span>
                    <span>•</span>
                    <span>19:30 - 00:30</span>
                    <span>•</span>
                    <span>אולם הזהב</span>
                    <span>•</span>
                    <span>420 אורחים</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/venues/dashboard/halls/${hallId}/calendar`}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
              >
                <ArrowRight size={17} />
                חזרה ליומן
              </Link>

              <button
                type="button"
                onClick={() => setActionsOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
              >
                <MoreHorizontal size={17} />
                פעולות נוספות
              </button>

              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
              >
                <Edit3 size={17} />
                עריכת אירוע
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <HeroMetric
            title="התחייבות"
            value={formatCurrency(financial.commitment)}
            subtitle="סך ההתחייבות כולל מע״מ"
            icon={<CircleDollarSign size={22} />}
          />

          <HeroMetric
            title="מקדמה"
            value={formatCurrency(financial.deposit)}
            subtitle="שולמה ב־15.11.25"
            icon={<WalletCards size={22} />}
            success
          />

          <HeroMetric
            title="שולם עד כה"
            value={formatCurrency(financial.totalPaid)}
            subtitle={`${financial.paidPercentage}% מתוך ההתחייבות`}
            icon={<CreditCard size={22} />}
          />

          <HeroMetric
            title="יתרת תשלום משוערת"
            value={formatCurrency(financial.estimatedBalance)}
            subtitle="לפי מחיר שסוכם"
            icon={<Receipt size={22} />}
            danger
          />

          <HeroMetric
            title="תשלום הבא"
            value={formatCurrency(financial.nextPayment)}
            subtitle="25.11.25"
            icon={<CalendarDays size={22} />}
          />
        </section>

        <section className="mt-5 rounded-[30px] border border-[#eadfce] bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-6">
            <StatusTile label="סטטוס אירוע" value="סגור" tone="green" />
            <StatusTile label="סטטוס הושבה" value="לא הושלמה" tone="amber" />
            <StatusTile
              label="סטטוס תפריט"
              value={assignedMenu ? "תפריט נבחר" : "חסר תפריט"}
              tone={assignedMenu ? "green" : "rose"}
            />
            <StatusTile label="סטטוס תשלום" value="בתשלום" tone="green" />
            <StatusTile label="אישורי הגעה" value="לא הופעל" tone="gray" />
            <StatusTile label="מנהל אירוע" value="יוסי כהן" tone="gold" />
          </div>
        </section>

        <nav className="mt-5 overflow-x-auto rounded-[26px] border border-[#eadfce] bg-white shadow-sm">
          <div className="flex min-w-[1150px]">
            {[
              { id: "overview", label: "סקירה כללית", icon: Sparkles },
              { id: "details", label: "פרטי אירוע", icon: CalendarDays },
              { id: "client", label: "לקוח וחוזה", icon: UsersRound },
              { id: "payments", label: "תשלומים", icon: CreditCard },
              { id: "menu", label: "תפריט", icon: Utensils },
              { id: "seating", label: "הושבה", icon: UsersRound },
              { id: "staff", label: "צוות וספקים", icon: ShieldCheck },
              { id: "tasks", label: "משימות", icon: CheckCircle2 },
              { id: "files", label: "קבצים", icon: FolderOpen },
            ].map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "flex h-14 flex-1 items-center justify-center gap-2 border-l border-[#eadfce] px-4 text-sm font-black transition",
                    activeTab === tab.id
                      ? "bg-[#b98121] text-white"
                      : "bg-white text-[#6f6252] hover:bg-[#fbf5ea] hover:text-[#b98121]",
                  ].join(" ")}
                >
                  <Icon size={17} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        <section className="mt-5 grid gap-5 xl:grid-cols-[310px_1fr]">
          <aside className="space-y-5">
            <SideCard title="התקדמות האירוע" icon={<CheckCircle2 size={18} />}>
              <div className="space-y-4">
                {[
                  { label: "יצירת אירוע", date: "10.11.25", done: true },
                  { label: "פגישה ראשונה", date: "15.11.25", done: true },
                  { label: "הצעת מחיר", date: "21.11.25", done: true },
                  { label: "מקדמה שולמה", date: "25.11.25", done: true },
                  {
                    label: "בחירת תפריט",
                    date: assignedMenu ? assignedMenu.name : "טרם נבחר",
                    done: Boolean(assignedMenu),
                  },
                  { label: "סגירת הושבה", date: "טרם בוצע", done: false },
                  { label: "הפקת אירוע", date: "יום האירוע", done: false },
                ].map((step) => (
                  <div key={step.label} className="flex items-start gap-3">
                    <div
                      className={[
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-black",
                        step.done
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-[#eadfce] bg-white text-[#b8a88e]",
                      ].join(" ")}
                    >
                      {step.done ? "✓" : ""}
                    </div>
                    <div>
                      <div className="text-sm font-black text-[#2b241c]">{step.label}</div>
                      <div className="mt-1 text-xs font-bold text-[#8a7b68]">{step.date}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs font-black text-[#8a7b68]">
                  <span>השלמה כללית</span>
                  <span>{assignedMenu ? "78%" : "72%"}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#eee6d9]">
                  <div
                    className="h-full rounded-full bg-[#b98121]"
                    style={{ width: assignedMenu ? "78%" : "72%" }}
                  />
                </div>
              </div>
            </SideCard>

            <SideCard title="פרטי לקוח" icon={<UsersRound size={18} />}>
              <div className="space-y-3">
                <InfoLine label="שם לקוח" value="משפחת לוי" />
                <InfoLine label="טלפון" value="050-1234567" />
                <InfoLine label="אימייל" value="levi.family@email.com" />
                <InfoLine label="מקור" value="אתר" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="h-10 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]">
                  שיחה
                </button>
                <button className="h-10 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]">
                  מייל
                </button>
              </div>
            </SideCard>

            <SideCard title="תקציר פיננסי" icon={<WalletCards size={18} />}>
              <div className="space-y-3">
                <InfoLine label="התחייבות" value={formatCurrency(financial.commitment)} />
                <InfoLine label="מקדמה" value={formatCurrency(financial.deposit)} />
                <InfoLine label="שולם" value={formatCurrency(financial.totalPaid)} />
                <InfoLine label="יתרה משוערת" value={formatCurrency(financial.estimatedBalance)} danger />
              </div>

              <button
                type="button"
                onClick={() => setPaymentOpen(true)}
                className="mt-4 h-11 w-full rounded-2xl bg-[#b98121] text-sm font-black text-white"
              >
                ניהול תשלומים
              </button>
            </SideCard>
          </aside>

          <div className="space-y-5">
            {activeTab === "overview" && (
              <>
                <section className="grid gap-5 xl:grid-cols-3">
                  <MainCard title="פרטי האירוע" icon={<CalendarDays size={19} />}>
                    <div className="space-y-3">
                      <InfoLine label="סוג אירוע" value="חתונה" />
                      <InfoLine label="אולם" value="אולם הזהב" />
                      <InfoLine label="תאריך" value="19.05.2026" />
                      <InfoLine label="שעה" value="19:30 - 00:30" />
                      <InfoLine label="כמות אורחים" value="420" />
                      <InfoLine label="מנהל אירוע" value="יוסי כהן" />
                    </div>
                  </MainCard>

                  <MainCard title="סיכום פיננסי מורחב" icon={<Receipt size={19} />}>
                    <div className="grid grid-cols-2 gap-3">
                      <FinanceMini label="התחייבות" value={formatCurrency(financial.commitment)} />
                      <FinanceMini label="מקדמה" value={formatCurrency(financial.deposit)} success />
                      <FinanceMini label="סה״כ שולם" value={formatCurrency(financial.totalPaid)} />
                      <FinanceMini label="יתרה משוערת" value={formatCurrency(financial.estimatedBalance)} danger />
                      <FinanceMini label="תשלום הבא" value={formatCurrency(financial.nextPayment)} />
                      <FinanceMini label="לאחר אירוע" value={formatCurrency(financial.expectedAfterEvent)} danger />
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs font-black text-[#8a7b68]">
                        <span>אחוז תשלום</span>
                        <span>{financial.paidPercentage}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#eee6d9]">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${financial.paidPercentage}%` }}
                        />
                      </div>
                    </div>
                  </MainCard>

                  <MainCard title="סטטוס והתקדמות" icon={<Sparkles size={19} />}>
                    <div className="space-y-3">
                      <ProgressRow label="תשלומים" value={64} />
                      <ProgressRow label="הושבה" value={32} />
                      <ProgressRow label="תפריט" value={assignedMenu ? 65 : 20} />
                      <ProgressRow label="משימות הפקה" value={72} />
                    </div>

                    <button
                      type="button"
                      onClick={() => setNoteOpen(true)}
                      className="mt-4 h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]"
                    >
                      הוספת הערה
                    </button>
                  </MainCard>
                </section>

                <section className="grid gap-5 xl:grid-cols-3">
                  <MainCard title="תשלומים אחרונים" icon={<CreditCard size={19} />}>
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <PaymentItem key={payment.id} payment={payment} />
                      ))}
                    </div>
                  </MainCard>

                  <MainCard title="משימות פתוחות" icon={<CheckCircle2 size={19} />}>
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <TaskItem key={task.id} task={task} />
                      ))}
                    </div>
                  </MainCard>

                  <MainCard title="פעילות אחרונה" icon={<Clock3 size={19} />}>
                    <div className="space-y-3">
                      {activities.map((activity) => (
                        <ActivityItem key={activity.id} activity={activity} />
                      ))}
                    </div>
                  </MainCard>
                </section>

                <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                  <MainCard title="קבצים ומסמכים" icon={<FolderOpen size={19} />}>
                    <div className="space-y-3">
                      {files.map((file) => (
                        <FileItem key={file.id} file={file} />
                      ))}
                    </div>
                  </MainCard>

                  <MainCard title="הערות פנימיות" icon={<MessageCircle size={19} />}>
                    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
                      <p className="text-sm font-bold leading-7 text-[#7f705d]">
                        הלקוח מדגיש שחשוב לו עיצוב נקי, שולחנות בגוון שמנת וזהב,
                        ותפריט ללא פירות ים. יש לוודא מול המטבח את המנות הצמחוניות.
                      </p>
                      <div className="mt-3 text-xs font-black text-[#9b8a73]">
                        מיכל פרידמן · 15.11.25
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setNoteOpen(true)}
                      className="mt-4 h-11 w-full rounded-2xl border border-[#eadfce] bg-white text-sm font-black text-[#6f6252]"
                    >
                      הוספת הערה חדשה
                    </button>
                  </MainCard>
                </section>
              </>
            )}

            {activeTab === "menu" && (
              <EventMenuTab
                eventId={eventId}
                hallId={hallId}
                assignedMenu={assignedMenu}
                templates={venueMenuTemplates}
                onChooseMenu={() => setMenuSelectOpen(true)}
                onSendToCouple={() => setSendMenuOpen(true)}
              />
            )}

            {activeTab !== "overview" && activeTab !== "menu" && (
              <MainCard title={tabTitle(activeTab)} icon={<Sparkles size={19} />}>
                <div className="rounded-3xl border border-dashed border-[#d9bd83] bg-[#fffaf0] p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-[#b98121]">
                    <Sparkles size={26} />
                  </div>
                  <h2 className="mt-4 text-xl font-black text-[#2b241c]">
                    {tabTitle(activeTab)}
                  </h2>
                  <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-[#7f705d]">
                    כאן ייכנס המסך המלא של הטאב הזה: טבלאות, עריכה, פעולות,
                    קבצים, תשלומים או חיבור לאישורי הגעה והושבה לפי החבילה.
                  </p>
                </div>
              </MainCard>
            )}
          </div>
        </section>
      </div>

      {actionsOpen && (
        <Modal title="פעולות נוספות" onClose={() => setActionsOpen(false)}>
          <div className="grid gap-3">
            <ActionButton icon={<FileText size={17} />} label="הפקת חוזה" />
            <ActionButton icon={<Mail size={17} />} label="שליחת עדכון ללקוח" />
            <ActionButton icon={<Bell size={17} />} label="יצירת תזכורת" />
            <ActionButton icon={<FolderOpen size={17} />} label="העלאת קובץ" />
          </div>
        </Modal>
      )}

      {editOpen && (
        <Modal title="עריכת אירוע" onClose={() => setEditOpen(false)}>
          <div className="grid gap-3">
            <InputLike label="שם האירוע" value="חתונה - משפחת לוי" />
            <InputLike label="תאריך" value="19.05.2026" />
            <InputLike label="שעה" value="19:30 - 00:30" />
            <InputLike label="כמות אורחים" value="420" />
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="mt-2 flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              <Save size={17} />
              שמירה
            </button>
          </div>
        </Modal>
      )}

      {paymentOpen && (
        <Modal title="ניהול תשלומים" onClose={() => setPaymentOpen(false)}>
          <div className="space-y-3">
            <InfoLine label="התחייבות" value={formatCurrency(financial.commitment)} />
            <InfoLine label="מקדמה" value={formatCurrency(financial.deposit)} />
            <InfoLine label="שולם עד כה" value={formatCurrency(financial.totalPaid)} />
            <InfoLine label="יתרת תשלום משוערת" value={formatCurrency(financial.estimatedBalance)} danger />
            <button
              type="button"
              onClick={() => setPaymentOpen(false)}
              className="mt-2 h-11 w-full rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              הוספת תשלום
            </button>
          </div>
        </Modal>
      )}

      {noteOpen && (
        <Modal title="הוספת הערה" onClose={() => setNoteOpen(false)}>
          <textarea
            defaultValue="הערה פנימית חדשה..."
            className="min-h-[140px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
          />
          <button
            type="button"
            onClick={() => setNoteOpen(false)}
            className="mt-3 h-11 w-full rounded-2xl bg-[#b98121] text-sm font-black text-white"
          >
            שמירת הערה
          </button>
        </Modal>
      )}

      {menuSelectOpen && (
        <Modal title="בחירת תפריט לאירוע" onClose={() => setMenuSelectOpen(false)} wide>
          <div className="mb-4 rounded-2xl border border-[#eadfce] bg-[#fff8eb] p-4 text-sm font-bold leading-7 text-[#7f705d]">
            כאן בוחרים תפריט מתוך תפריטי האולם. לאחר הבחירה ייווצר עותק לאירוע הזה בלבד,
            כדי ששינויים עתידיים בתפריטי האולם לא ישנו אירועים שכבר נסגרו.
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {venueMenuTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => chooseMenuForEvent(template)}
                className="rounded-[26px] border border-[#eadfce] bg-[#fffdf8] p-4 text-right transition hover:-translate-y-1 hover:border-[#d9bd83] hover:bg-[#fff8eb] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
                    <Utensils size={23} />
                  </div>

                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                    פעיל
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-black text-[#2b241c]">
                  {template.name}
                </h3>
                <p className="mt-2 text-sm font-bold leading-6 text-[#7f705d]">
                  {template.description}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <InfoPill label="קטגוריות" value={`${template.categories}`} />
                  <InfoPill label="מנות" value={`${template.dishes}`} />
                </div>

                <div className="mt-4 rounded-2xl bg-[#b98121] px-4 py-3 text-center text-sm font-black text-white">
                  בחירת תפריט לאירוע
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {sendMenuOpen && (
        <Modal title="שליחת קישור בחירת מנות לזוג" onClose={() => setSendMenuOpen(false)}>
          <div className="space-y-3">
            <InfoLine label="תפריט" value={assignedMenu?.name || "לא נבחר תפריט"} />
            <InfoLine
              label="קישור לזוג"
              value={`https://www.invistimo.com/menus/${eventId}/choose`}
            />

            <textarea
              defaultValue={`שלום משפחת לוי, מצורף קישור לבחירת מנות לאירוע שלכם: https://www.invistimo.com/menus/${eventId}/choose`}
              className="min-h-[115px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
            />

            <button
              type="button"
              onClick={markMenuSent}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              <Send size={17} />
              סמן כקישור שנשלח
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function EventMenuTab({
  eventId,
  hallId,
  assignedMenu,
  templates,
  onChooseMenu,
  onSendToCouple,
}: {
  eventId: string;
  hallId: string;
  assignedMenu: AssignedMenu | null;
  templates: VenueMenuTemplate[];
  onChooseMenu: () => void;
  onSendToCouple: () => void;
}) {
  if (!assignedMenu) {
    return (
      <MainCard title="תפריט האירוע" icon={<Utensils size={19} />}>
        <div className="rounded-[30px] border border-dashed border-[#d9bd83] bg-[#fff8eb] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-white text-[#b98121]">
            <Utensils size={32} />
          </div>

          <h2 className="mt-4 text-2xl font-black text-[#2b241c]">
            עדיין לא נבחר תפריט לאירוע
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm font-bold leading-7 text-[#7f705d]">
            קודם האולם בונה תפריטים קבועים בניהול אולם. כאן בוחרים אחד מהם לאירוע
            הספציפי, נוצר עותק לאירוע, ואז שולחים לזוג קישור לבחירת מנות.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onChooseMenu}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#b98121] px-6 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
            >
              <Plus size={17} />
              בחר תפריט מתוך תפריטי האולם
            </button>

            <Link
              href={`/venues/dashboard/halls/${hallId}/menus`}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-white px-6 text-sm font-black text-[#9f6f1a] transition hover:bg-[#fff8eb]"
            >
              <Utensils size={17} />
              ניהול תפריטי אולם
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="rounded-[24px] border border-[#eadfce] bg-[#fffdf8] p-4">
              <div className="text-lg font-black text-[#2b241c]">{template.name}</div>
              <p className="mt-2 text-sm font-bold leading-6 text-[#7f705d]">
                {template.description}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <InfoPill label="קטגוריות" value={`${template.categories}`} />
                <InfoPill label="מנות" value={`${template.dishes}`} />
              </div>
            </div>
          ))}
        </div>
      </MainCard>
    );
  }

  return (
    <>
      <section className="grid gap-5 xl:grid-cols-3">
        <MainCard title="תפריט משויך לאירוע" icon={<Utensils size={19} />}>
          <div className="rounded-[24px] border border-[#eadfce] bg-[#fffdf8] p-4">
            <div className="text-xs font-black text-[#b98121]">עותק תפריט לאירוע</div>
            <h2 className="mt-1 text-2xl font-black text-[#2b241c]">{assignedMenu.name}</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-[#7f705d]">
              זהו עותק של תפריט האולם לאירוע הזה בלבד. אפשר לערוך אותו בלי לשנות את תפריט המקור של האולם.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <InfoPill label="נשלח לזוג" value={assignedMenu.sentToCouple ? "כן" : "לא"} />
              <InfoPill label="בחירת זוג" value={assignedMenu.coupleSelected ? "הושלמה" : "ממתין"} />
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <Link
              href={`/venues/dashboard/events/${eventId}/menus`}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              <Edit3 size={16} />
              עריכת תפריט האירוע
            </Link>

            <button
              type="button"
              onClick={onSendToCouple}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] text-sm font-black text-[#9f6f1a]"
            >
              <Send size={16} />
              שליחת קישור לבחירת מנות
            </button>
          </div>
        </MainCard>

        <MainCard title="קישור ציבורי לזוג" icon={<Link2 size={19} />}>
          <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
            <div className="text-xs font-black text-[#8a7b68]">קישור בחירת מנות</div>
            <div className="mt-2 break-all text-sm font-black leading-6 text-[#2b241c]">
              {`https://www.invistimo.com/menus/${eventId}/choose`}
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <Link
              href={`/menus/${eventId}/choose`}
              target="_blank"
              className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white text-sm font-black text-[#6f6252]"
            >
              <Eye size={16} />
              פתיחת תצוגת זוג
            </Link>

            <button
              type="button"
              onClick={onSendToCouple}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              <Send size={16} />
              שליחה לזוג
            </button>
          </div>
        </MainCard>

        <MainCard title="סטטוס תפריט" icon={<CheckCircle2 size={19} />}>
          <div className="space-y-3">
            <StatusLine label="תפריט נבחר" done />
            <StatusLine label="קישור נשלח לזוג" done={assignedMenu.sentToCouple} />
            <StatusLine label="הזוג בחר מנות" done={assignedMenu.coupleSelected} />
            <StatusLine label="האולם אישר תפריט" done={assignedMenu.approved} />
          </div>
        </MainCard>
      </section>

      <MainCard title="איך הזרימה עובדת" icon={<Sparkles size={19} />}>
        <div className="grid gap-4 md:grid-cols-4">
          <FlowStep number="1" title="תפריטי אולם" text="האולם בונה תפריטים קבועים בניהול אולם." />
          <FlowStep number="2" title="בחירת תפריט" text="באירוע בוחרים תפריט אחד מתוך תפריטי האולם." />
          <FlowStep number="3" title="שליחה לזוג" text="שולחים לזוג קישור בחירת מנות מתוך תפריט האירוע." />
          <FlowStep number="4" title="עדכון האירוע" text="בחירת הזוג מתעדכנת בתפריט האירוע הספציפי." />
        </div>
      </MainCard>
    </>
  );
}

function StatusLine({ label, done }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 py-3">
      <span className="text-sm font-black text-[#2b241c]">{label}</span>
      <span
        className={[
          "rounded-full px-3 py-1 text-xs font-black",
          done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
        ].join(" ")}
      >
        {done ? "בוצע" : "ממתין"}
      </span>
    </div>
  );
}

function FlowStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-[#eadfce] bg-[#fffdf8] p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#b98121] text-sm font-black text-white">
        {number}
      </div>
      <div className="mt-4 text-base font-black text-[#2b241c]">{title}</div>
      <p className="mt-2 text-sm font-bold leading-6 text-[#7f705d]">{text}</p>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-white px-3 py-2">
      <div className="text-[11px] font-black text-[#8a7b68]">{label}</div>
      <div className="mt-1 text-sm font-black text-[#2b241c]">{value}</div>
    </div>
  );
}

function tabTitle(tab: string) {
  if (tab === "details") return "פרטי אירוע";
  if (tab === "client") return "לקוח וחוזה";
  if (tab === "payments") return "תשלומים";
  if (tab === "menu") return "תפריט";
  if (tab === "seating") return "הושבה";
  if (tab === "staff") return "צוות וספקים";
  if (tab === "tasks") return "משימות";
  if (tab === "files") return "קבצים";
  return "סקירה כללית";
}

function HeroMetric({
  title,
  value,
  subtitle,
  icon,
  success,
  danger,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-[26px] border border-[#eadfce] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
          {icon}
        </div>
      </div>

      <div className="mt-5 text-sm font-black text-[#8a7b68]">{title}</div>
      <div
        className={[
          "mt-1 text-2xl font-black",
          success ? "text-emerald-700" : danger ? "text-rose-700" : "text-[#2b241c]",
        ].join(" ")}
      >
        {value}
      </div>
      <div className="mt-1 text-xs font-bold text-[#9b8a73]">{subtitle}</div>
    </div>
  );
}

function StatusTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "rose" | "gray" | "gold";
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "rose"
          ? "bg-rose-50 text-rose-700"
          : tone === "gold"
            ? "bg-[#fff4dc] text-[#b98121]"
            : "bg-slate-100 text-slate-600";

  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
      <div className="text-xs font-black text-[#8a7b68]">{label}</div>
      <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-black ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

function SideCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
          {icon}
        </div>
        <h2 className="text-base font-black text-[#2b241c]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MainCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
          {icon}
        </div>
        <h2 className="text-lg font-black text-[#2b241c]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function InfoLine({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 py-2">
      <span className="text-xs font-black text-[#8a7b68]">{label}</span>
      <span className={["text-sm font-black", danger ? "text-rose-700" : "text-[#2b241c]"].join(" ")}>
        {value}
      </span>
    </div>
  );
}

function FinanceMini({
  label,
  value,
  success,
  danger,
}: {
  label: string;
  value: string;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
      <div className="text-xs font-black text-[#8a7b68]">{label}</div>
      <div
        className={[
          "mt-2 text-lg font-black",
          success ? "text-emerald-700" : danger ? "text-rose-700" : "text-[#2b241c]",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-black text-[#8a7b68]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#eee6d9]">
        <div className="h-full rounded-full bg-[#b98121]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function PaymentItem({ payment }: { payment: PaymentRow }) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-[#2b241c]">{payment.title}</div>
          <div className="mt-1 text-xs font-bold text-[#8a7b68]">{payment.dueDate} · {payment.note}</div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${paymentStatusClass(payment.status)}`}>
          {paymentStatusLabel(payment.status)}
        </span>
      </div>
      <div className="mt-2 text-lg font-black text-[#2b241c]">{formatCurrency(payment.amount)}</div>
    </div>
  );
}

function TaskItem({ task }: { task: TaskRow }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div>
        <div className="text-sm font-black text-[#2b241c]">{task.title}</div>
        <div className="mt-1 text-xs font-bold text-[#8a7b68]">{task.dueDate}</div>
      </div>
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${taskStatusClass(task.status)}`}>
        {taskStatusLabel(task.status)}
      </span>
    </div>
  );
}

function ActivityItem({ activity }: { activity: ActivityRow }) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div className="text-sm font-black text-[#2b241c]">{activity.title}</div>
      <div className="mt-1 text-xs font-bold text-[#8a7b68]">{activity.date}</div>
      <div className="mt-2 text-xs font-bold leading-5 text-[#7f705d]">{activity.description}</div>
    </div>
  );
}

function FileItem({ file }: { file: FileRow }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#b98121]">
          <FileText size={18} />
        </div>
        <div>
          <div className="text-sm font-black text-[#2b241c]">{file.title}</div>
          <div className="mt-1 text-xs font-bold text-[#8a7b68]">{file.date} · {file.size}</div>
        </div>
      </div>
      <button type="button" className="text-sm font-black text-[#b98121]">
        פתיחה
      </button>
    </div>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="flex h-12 items-center gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
    >
      {icon}
      {label}
    </button>
  );
}

function InputLike({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-[#8a7b68]">{label}</span>
      <input
        defaultValue={value}
        className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
      />
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
      <div
        className={[
          "max-h-[92vh] w-full overflow-y-auto rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-2xl",
          wide ? "max-w-6xl" : "max-w-xl",
        ].join(" ")}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-[#2b241c]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-[#6f6252]"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
