"use client";

import ProductionTabs from "@/app/events/production/_components/ProductionTabs";

import OverviewTab from "@/app/events/production/_components/OverviewTab";
import PlanningTab from "@/app/events/production/_components/PlanningTab";
import SuppliersBudgetTab from "@/app/events/production/_components/SuppliersBudgetTab";
import CalendarTab from "@/app/events/production/_components/CalendarTab";
import LogisticsTab from "@/app/events/production/_components/LogisticsTab";
import AlcoholManagementTab from "@/app/events/production/_components/AlcoholManagementTab";
import EventGiftsTab from "@/app/events/production/_components/EventGiftsTab";

export default function DemoEventManagementPage() {
  const demoEventId = "demo-event";
  const demoInvitationId = "demo-invitation";

  return (
    <main dir="rtl" className="min-h-screen bg-[#F8F3ED]">
      <ProductionTabs
        basePath="/try/event-management"
        eventId={demoEventId}
        invitation={null}
        liveGuests={null}
        liveSeating={null}
        overview={
          <OverviewTab
            eventId={demoEventId}
            invitation={null}
            isDemo={true}
          />
        }
        planning={
          <PlanningTab
            eventId={demoEventId}
            isDemo={true}
            basePath="/try/event-management"
          />
        }
        suppliers={
          <SuppliersBudgetTab
            eventId={demoEventId}
            isDemo={true}
          />
        }
        calendar={
          <CalendarTab
            eventId={demoEventId}
            isDemo={true}
          />
        }
        logistics={
          <LogisticsTab
            eventId={demoEventId}
            isDemo={true}
          />
        }
        alcohol={
          <AlcoholManagementTab
            eventId={demoEventId}
            isDemo={true}
          />
        }
        gifts={
          <EventGiftsTab
            eventId={demoEventId}
            invitationId={demoInvitationId}
            isDemo={true}
          />
        }
      />
    </main>
  );
}