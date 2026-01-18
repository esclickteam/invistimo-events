"use client";

import { useAuth } from "@/context/AuthContext";
import ProductionTabs from "./_components/ProductionTabs";
import LiveSeatingTab from "./_components/LiveSeating/LiveSeatingTab";
// שאר ה-imports שלך: OverviewTab, PlanningTab וכו'

export default function EventProductionPage() {
  const { user } = useAuth();

  // 🔹 helper שמחזיר את ההזמנה שהמשתמש יכול לנהל
  function getManageableInvitation(user) {
    if (!user) return null;

    if (user.impersonated && user.impersonationRole === "producer") {
      return user.invitationId;
    }

    if (user.role === "client") {
      return user.invitationId;
    }

    return null;
  }

  const invitationId = getManageableInvitation(user);
  if (!invitationId) return <div>Loading...</div>; // או Loader מותאם

  const canManage = user?.impersonated || user?.role === "producer";

  return (
    <ProductionTabs
      overview={<OverviewTab canManage={canManage} />}
      planning={<PlanningTab canManage={canManage} />}
      suppliers={<SuppliersBudgetTab canManage={canManage} />}
      calendar={<CalendarTab canManage={canManage} />}
      logistics={<LogisticsTab canManage={canManage} />}
      alcohol={<AlcoholManagementTab canManage={canManage} />}
      liveSeating={<LiveSeatingTab invitationId={invitationId} canManage={canManage} />}
    />
  );
}
