import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LoginPageClient from "./LoginPageClient";
import { getDashboardPathFromAuthCookies } from "@/lib/auth/getDashboardRedirectPath";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ loggedOut?: string }>;
}) {
  const params = await searchParams;
  const isExplicitLogout = params.loggedOut === "1";

  if (!isExplicitLogout) {
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
  }

  return <LoginPageClient />;
}
