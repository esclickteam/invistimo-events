/**
 * Client-facing system voice choices.
 * Only "קול נשי" / "קול גברי" — never ElevenLabs catalog names.
 */

import {
  clientGenderChoices,
  getGlobalPacksApprovalStatus,
  hydrateApprovedPackVoiceIds,
} from "@/lib/calls/ivrAdminVoicePacks";
import type { IvrVoiceGender } from "@/lib/calls/ivrScript";

export type IvrSystemVoiceChoice = {
  gender: IvrVoiceGender;
  label: string;
};

export async function getIvrSystemVoiceChoices(_options?: {
  forceResolve?: boolean;
}): Promise<{
  voices: IvrSystemVoiceChoice[];
  resolved: boolean;
  packsReady: boolean;
  diagnostics: {
    femaleApproved: boolean;
    maleApproved: boolean;
  };
}> {
  await hydrateApprovedPackVoiceIds();
  const status = await getGlobalPacksApprovalStatus();
  const voices = clientGenderChoices(status);

  return {
    voices,
    resolved: status.bothApproved,
    packsReady: status.bothApproved,
    diagnostics: {
      femaleApproved: status.femaleApproved,
      maleApproved: status.maleApproved,
    },
  };
}

export async function assertApprovedPackForGender(
  gender: IvrVoiceGender | string | null | undefined
) {
  const status = await getGlobalPacksApprovalStatus();
  const g = String(gender || "").toLowerCase();
  if (g === "female" && !status.femaleApproved) {
    throw new Error("FEMALE_PACK_NOT_APPROVED");
  }
  if (g === "male" && !status.maleApproved) {
    throw new Error("MALE_PACK_NOT_APPROVED");
  }
  if (!status.bothApproved && g !== "female" && g !== "male") {
    throw new Error("VOICE_PACKS_NOT_APPROVED");
  }
}
