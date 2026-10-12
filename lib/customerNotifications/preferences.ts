import mongoose from "mongoose";
import NotificationPreference from "@/models/NotificationPreference";
import {
  DEFAULT_PUSH_PREFERENCES,
  type PushPreferenceToggles,
} from "@/lib/customerNotifications/planners";

function toObjectId(value: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function normalizeToggles(value: Partial<PushPreferenceToggles> | null | undefined) {
  return {
    rsvp: value?.rsvp !== false,
    failures: value?.failures !== false,
    eventManagement: value?.eventManagement !== false,
    reminders: value?.reminders !== false,
  };
}

export async function getPushPreferences(userId: string): Promise<PushPreferenceToggles> {
  const id = toObjectId(userId);
  if (!id) return { ...DEFAULT_PUSH_PREFERENCES };
  const row = await NotificationPreference.findOne({ userId: id }).select("push").lean();
  if (!row?.push) return { ...DEFAULT_PUSH_PREFERENCES };
  return normalizeToggles(row.push as PushPreferenceToggles);
}

export async function savePushPreferences(
  userId: string,
  value: Partial<PushPreferenceToggles>
) {
  const id = toObjectId(userId);
  if (!id) return { ...DEFAULT_PUSH_PREFERENCES };
  const push = {
    rsvp: Boolean(value.rsvp),
    failures: Boolean(value.failures),
    eventManagement: Boolean(value.eventManagement),
    reminders: Boolean(value.reminders),
  };
  await NotificationPreference.findOneAndUpdate(
    { userId: id },
    { $set: { push } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return push;
}
