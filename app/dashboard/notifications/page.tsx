import { redirect } from "next/navigation";
import NotificationPreferencesPanel from "@/components/notifications/NotificationPreferencesPanel";
import { customerNotificationsEnabled } from "@/lib/customerNotifications/featureFlag";

export default function DashboardNotificationSettingsPage() {
  if (!customerNotificationsEnabled()) redirect("/dashboard");
  return <NotificationPreferencesPanel />;
}
