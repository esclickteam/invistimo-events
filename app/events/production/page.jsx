"use client";

import ProductionTabs from "./_components/ProductionTabs";
import OverviewTab from "./_components/OverviewTab";
import PlanningTab from "./_components/PlanningTab";
import SuppliersBudgetTab from "./_components/SuppliersBudgetTab";
import CalendarTab from "./_components/CalendarTab";
import LogisticsTab from "./_components/LogisticsTab";
import AlcoholManagementTab from "./_components/AlcoholManagementTab";
import LiveSeatingTab from "./_components/LiveSeating/LiveSeatingTab";

export default function EventProductionPage() {
  return (
    <div className="p-6 space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold">הפקת אירוע</h1>

      <ProductionTabs
        overview={<OverviewTab />}
        planning={<PlanningTab />}
        suppliers={<SuppliersBudgetTab />}
        calendar={<CalendarTab />}
        logistics={<LogisticsTab />}
        alcohol={<AlcoholManagementTab />}
        liveSeating={<LiveSeatingTab />}
      />
    </div>
  );
}
