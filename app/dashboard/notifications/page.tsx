"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { canSeeAdminNotificationCenter } from "@/lib/customerNotifications/visibility";

export default function DashboardNotificationSettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (canSeeAdminNotificationCenter(user)) {
      router.replace("/admin/notification-settings");
      return;
    }
    router.replace("/dashboard");
  }, [loading, router, user]);

  return null;
}
