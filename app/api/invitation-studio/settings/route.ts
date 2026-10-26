import { NextResponse } from "next/server";
import {
  DESIGNED_INVITATION_DESCRIPTION,
  DESIGNED_INVITATION_LABEL,
  packageIncludesDigitalInvitation,
} from "@/lib/invitationStudio/entitlement";
import { readStudioSettings } from "@/lib/invitationStudio/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await readStudioSettings();
  return NextResponse.json({
    success: true,
    label: DESIGNED_INVITATION_LABEL,
    description: DESIGNED_INVITATION_DESCRIPTION,
    priceIls: settings.priceIls,
    includedInCurrentPackages: packageIncludesDigitalInvitation("messages"),
  });
}
