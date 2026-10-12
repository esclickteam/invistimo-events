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
    adminUrgent: value?.adminUrgent !== false,
    adminImportant: value?.adminImportant !== false,
    adminInfo: value?.adminInfo === true,
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
  const current = id ? await getPushPreferences(userId) : { ...DEFAULT_PUSH_PREFERENCES };
  const push = {
    rsvp: value.rsvp === undefined ? current.rsvp : Boolean(value.rsvp),
    failures: value.failures === undefined ? current.failures : Boolean(value.failures),
    eventManagement:
      value.eventManagement === undefined ? current.eventManagement : Boolean(value.eventManagement),
    reminders: value.reminders === undefined ? current.reminders : Boolean(value.reminders),
    adminUrgent: value.adminUrgent === undefined ? current.adminUrgent : Boolean(value.adminUrgent),
    adminImportant:
      value.adminImportant === undefined ? current.adminImportant : Boolean(value.adminImportant),
    adminInfo: value.adminInfo === undefined ? current.adminInfo : Boolean(value.adminInfo),
  };
  await NotificationPreference.findOneAndUpdate(
    { userId: id },
    { $set: { push } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return push;
}
