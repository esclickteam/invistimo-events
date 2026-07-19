import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import HomePageClient from "./HomePageClient";
import { getDashboardPathFromAuthCookies } from "@/lib/auth/getDashboardRedirectPath";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();

  const dashboardPath = getDashboardPathFromAuthCookies({
    authToken: cookieStore.get("authToken")?.value,
    producerAuthToken: cookieStore.get("producerAuthToken")?.value,
    adminAuthToken: cookieStore.get("adminAuthToken")?.value,
    role: cookieStore.get("role")?.value,
    impersonationRole: cookieStore.get("impersonationRole")?.value,
    originalTargetRole: cookieStore.get("originalTargetRole")?.value,
  });

  if (dashboardPath) {
    redirect(dashboardPath);
  }

  return <HomePageClient />;
}
