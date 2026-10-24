import { destroySession, getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonOk } from "@/lib/api";

export async function POST() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit({ action: "auth.logout", actorUserId: user.id });
  return jsonOk({ loggedOut: true });
}
