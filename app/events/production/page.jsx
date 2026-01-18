"use client";

import { useAuth } from "@/context/AuthContext";
import ProductionTabs from "./_components/ProductionTabs";
import LiveSeatingTab from "./_components/LiveSeating/LiveSeatingTab";
// שאר ה-imports...

export default function EventProductionPage() {
  const { user } = useAuth();

  // ⬅️ זה ה-ID הנכון
  const invitationId = user?.invitationId;

  if (!invitationId) return null; // או loader

  return (
    <ProductionTabs
      overview={<OverviewTab />}
      planning={<PlanningTab />}
      suppliers={<SuppliersBudgetTab />}
      calendar={<CalendarTab />}
      logistics={<LogisticsTab />}
      alcohol={<AlcoholManagementTab />}
      liveSeating={
        <LiveSeatingTab invitationId={invitationId} />
      }
    />
  );
}
