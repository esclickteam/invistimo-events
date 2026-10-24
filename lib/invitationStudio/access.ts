import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import InvitationStudioDesign from "@/models/InvitationStudioDesign";
import { resolveDesignedInvitationEntitlement } from "@/lib/invitationStudio/entitlement";

export async function readStudioAuth(req: Request) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId) return null;
  await connectDB();
  const user = await User.findById(auth.userId)
    .select("role plan hasPaid customDesignEnabled designedInvitationEnabled email name isActive")
    .lean();
  if (!user) return null;
  return { auth, user };
}

export function isStudioAdmin(auth: { role?: string; impersonated?: boolean } | null | undefined) {
  return auth?.role === "admin" && !auth.impersonated;
}

export async function loadOwnedDesign(id: string, ownerId: string) {
  if (!id) return null;
  const design = await InvitationStudioDesign.findById(id);
  if (!design) return null;
  if (String(design.ownerId) !== String(ownerId)) return "forbidden" as const;
  return design;
}

export async function loadOwnedInvitation(invitationId: string, ownerId: string) {
  const invitation = await Invitation.findOne({ _id: invitationId, ownerId }).lean();
  return invitation;
}

export function entitlementFor(user: {
  plan?: string | null;
  hasPaid?: boolean | null;
  customDesignEnabled?: boolean | null;
  designedInvitationEnabled?: boolean | null;
}) {
  return resolveDesignedInvitationEntitlement(user);
}
