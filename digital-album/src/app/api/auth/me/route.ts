import { getCurrentUser, getUserTenantIds } from "@/lib/auth";
import { jsonOk } from "@/lib/api";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonOk({ user: null });
  const tenants = await getUserTenantIds(user.id);
  return jsonOk({ user, tenants });
}
