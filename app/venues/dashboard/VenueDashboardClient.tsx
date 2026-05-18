"use client";

import React, { useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  Utensils,
  Wallet,
} from "lucide-react";

import VenueSidebar from "@/app/venues/dashboard/components/VenueSidebar";
import VenueTopbar from "@/app/venues/dashboard/components/VenueTopbar";
import VenueOverviewTab from "@/app/venues/dashboard/components/VenueOverviewTab";
import VenueHallsTab from "@/app/venues/dashboard/components/VenueHallsTab";
import VenueClientsTab from "@/app/venues/dashboard/components/VenueClientsTab";
import VenueEventsTab from "@/app/venues/dashboard/components/VenueEventsTab";
import VenueComingSoonTab from "@/app/venues/dashboard/components/VenueComingSoonTab";

export type VenueTab =
  | "overview"
  | "halls"
  | "clients"
  | "events"
  | "menus"
  | "tasks"
  | "finance"
  | "staff"
  | "settings";

export type VenueTabItem = {
  id: VenueTab;
  label: string;
  description: string;
  icon: React.ElementType;
};

export const venueTabs: VenueTabItem[] = [
  {
    id: "overview",
    label: "סקירה כללית",
    description: "נתונים, התראות ומה דורש טיפול",
    icon: LayoutDashboard,
  },
  {
    id: "halls",
    label: "מתחם ואולמות",
    description: "אולמות, קיבולת, מחירים וסקיצות",
    icon: Building2,
  },
  {
    id: "clients",
    label: "לקוחות CRM",
    description: "לידים, פגישות, הצעות מחיר וסגירות",
    icon: Users,
  },
  {
    id: "events",
    label: "אירועים",
    description: "אירועים לפי אולם, לקוח וסטטוס",
    icon: CalendarDays,
  },
  {
    id: "menus",
    label: "תפריטים",
    description: "תפריטים, טעימות ואישורי לקוח",
    icon: Utensils,
  },
  {
    id: "tasks",
    label: "משימות",
    description: "משימות תפעול לפני וביום האירוע",
    icon: ClipboardList,
  },
  {
    id: "finance",
    label: "כספים",
    description: "מקדמות, תשלומים והכנסות צפויות",
    icon: Wallet,
  },
  {
    id: "staff",
    label: "עובדים והרשאות",
    description: "מנהלים, מכירות, הפקה ותפעול",
    icon: ShieldCheck,
  },
  {
    id: "settings",
    label: "הגדרות",
    description: "פרטי אולם, שעות פעילות ותבניות",
    icon: Settings,
  },
];

export default function VenueDashboardClient() {
  const [activeTab, setActiveTab] = useState<VenueTab>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeTabData = useMemo(() => {
    return venueTabs.find((tab) => tab.id === activeTab) || venueTabs[0];
  }, [activeTab]);

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f2ea] text-[#2f261d]">
      <div className="relative flex min-h-screen overflow-hidden">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#e8d4ad]/40 blur-3xl" />
          <div className="absolute bottom-[-140px] left-[-120px] h-96 w-96 rounded-full bg-[#c7a45d]/20 blur-3xl" />
        </div>

        <VenueSidebar
          tabs={venueTabs}
          activeTab={activeTab}
          onChangeTab={(tab) => {
            setActiveTab(tab);
            setMobileMenuOpen(false);
          }}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        <section className="relative z-10 flex min-h-screen flex-1 flex-col lg:pr-80">
          <VenueTopbar
            activeTabData={activeTabData}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-5 sm:px-6 lg:px-8">
            {activeTab === "overview" && <VenueOverviewTab />}
            {activeTab === "halls" && <VenueHallsTab />}
            {activeTab === "clients" && <VenueClientsTab />}
            {activeTab === "events" && <VenueEventsTab />}

            {activeTab === "menus" && (
              <VenueComingSoonTab
                title="ניהול תפריטים"
                subtitle="מודול לניהול תפריטי אירוע, מנות, טעימות, בחירות לקוח ואישורים."
                items={[
                  "בניית תפריטים לפי סוג אירוע",
                  "סטטוס טעימות ואישור לקוח",
                  "הערות רגישויות, צמחוני, טבעוני וילדים",
                  "חיבור התפריט לאירוע ולאולם",
                ]}
              />
            )}

            {activeTab === "tasks" && (
              <VenueComingSoonTab
                title="משימות ותפעול"
                subtitle="ניהול משימות פנימיות לצוות האולם לפני האירוע וביום האירוע."
                items={[
                  "משימות לפי מחלקה",
                  "תאריכי יעד ואחראי משימה",
                  "צ׳ק ליסט יום אירוע",
                  "התראות על דברים שלא נסגרו",
                ]}
              />
            )}

            {activeTab === "finance" && (
              <VenueComingSoonTab
                title="כספים ותשלומים"
                subtitle="מעקב אחרי מקדמות, יתרות, הכנסות צפויות ותשלומי לקוחות."
                items={[
                  "מקדמות ויתרות לתשלום",
                  "סטטוס תשלום לפי אירוע",
                  "הכנסות צפויות לפי חודש",
                  "דו״חות לאולם ולמנהל",
                ]}
              />
            )}

            {activeTab === "staff" && (
              <VenueComingSoonTab
                title="עובדים והרשאות"
                subtitle="ניהול צוותים, בעלי תפקידים והרשאות לפי מחלקות."
                items={[
                  "מנהל מתחם",
                  "מנהל מכירות",
                  "מפיק אירוע",
                  "צוות תפעול וצוות יום אירוע",
                ]}
              />
            )}

            {activeTab === "settings" && (
              <VenueComingSoonTab
                title="הגדרות מערכת אולם"
                subtitle="הגדרות כלליות של המתחם, שעות פעילות, תבניות והעדפות מערכת."
                items={[
                  "פרטי מתחם",
                  "שעות פעילות",
                  "תבניות הודעה ללקוחות",
                  "הגדרות הרשאות ותצוגה",
                ]}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}