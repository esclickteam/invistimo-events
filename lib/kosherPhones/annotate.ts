import { isKosherPhone, type KosherPrefixRule } from "@/lib/kosherPhones/match";
import { listActiveKosherPrefixRules } from "@/lib/kosherPhones/service";

export async function annotateGuestsWithKosher<T extends { phone?: unknown }>(
  guests: T[],
  prefixes?: KosherPrefixRule[]
): Promise<Array<T & { isKosherPhone: boolean }>> {
  try {
    const rules = prefixes || (await listActiveKosherPrefixRules());
    return guests.map((guest) => ({
      ...guest,
      isKosherPhone: isKosherPhone(guest?.phone, rules),
    }));
  } catch (error) {
    console.error("kosher phone annotation failed", error);
    return guests.map((guest) => ({
      ...guest,
      isKosherPhone: false,
    }));
  }
}
