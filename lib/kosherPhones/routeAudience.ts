import { listActiveKosherPrefixRules } from "@/lib/kosherPhones/service";
import { partitionMessageGuestsForKosherService } from "@/lib/kosherPhones/match";

function scheduleType(schedule: { type?: unknown; templateKey?: unknown }) {
  return String(schedule?.type || schedule?.templateKey || "").trim();
}

/**
 * When the service is off, or the schedule is not an RSVP round,
 * the original guest list is returned and no prefix query runs.
 */
export async function partitionMessageRoundGuests<T extends { phone?: unknown }>(input: {
  user: { kosherRecordedCallsEnabled?: boolean | null } | null | undefined;
  schedule: { type?: unknown; templateKey?: unknown };
  guests: T[];
}): Promise<{ messageGuests: T[]; kosherGuests: T[]; enabled: boolean }> {
  const enabled = input.user?.kosherRecordedCallsEnabled === true;
  const type = scheduleType(input.schedule);
  if (!enabled || type !== "rsvp") {
    return partitionMessageGuestsForKosherService({
      enabled,
      scheduleType: type,
      guests: input.guests,
      prefixes: [],
    });
  }

  const prefixes = await listActiveKosherPrefixRules();
  return partitionMessageGuestsForKosherService({
    enabled: true,
    scheduleType: type,
    guests: input.guests,
    prefixes,
  });
}
