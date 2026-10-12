import InvitationGuest from "@/models/InvitationGuest";
import KosherPhonePrefix from "@/models/KosherPhonePrefix";
import SystemSettings from "@/models/SystemSettings";
import { DEFAULT_KOSHER_PREFIXES } from "@/lib/kosherPhones/defaults";
import {
  isKosherPhone,
  normalizeKosherPrefix,
  type KosherPrefixRule,
} from "@/lib/kosherPhones/match";

export type KosherPrefixRecord = {
  _id: string;
  prefix: string;
  carrier: string;
  active: boolean;
  matchedCount: number;
  createdAt?: string;
  updatedAt?: string;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function prefixMatchFilter(prefix: string) {
  const digits = normalizeKosherPrefix(prefix);
  const national = digits.startsWith("0") ? digits.slice(1) : digits;
  return {
    $or: [
      { phoneNormalized: new RegExp(`^${escapeRegex(digits)}`) },
      { phone: new RegExp(`^${escapeRegex(digits)}`) },
      { phone: new RegExp(`^\\+?972${escapeRegex(national)}`) },
      { phone: new RegExp(`^00?972${escapeRegex(national)}`) },
    ],
  };
}

export async function ensureKosherPrefixesSeeded() {
  const settings = await SystemSettings.findOne({ key: "global" })
    .select("kosherPrefixesInitialized")
    .lean();

  if (settings?.kosherPrefixesInitialized === true) return;

  await Promise.all(
    DEFAULT_KOSHER_PREFIXES.map((row) =>
      KosherPhonePrefix.updateOne(
        { prefix: row.prefix },
        {
          $setOnInsert: {
            prefix: row.prefix,
            carrier: row.carrier,
            active: true,
          },
        },
        { upsert: true }
      )
    )
  );

  await SystemSettings.updateOne(
    { key: "global" },
    { $set: { kosherPrefixesInitialized: true, key: "global" } },
    { upsert: true }
  );
}

export async function listActiveKosherPrefixRules(): Promise<KosherPrefixRule[]> {
  await ensureKosherPrefixesSeeded();
  const rows = await KosherPhonePrefix.find({ active: true })
    .select("prefix active")
    .lean();
  return rows.map((row) => ({
    prefix: String(row.prefix || ""),
    active: row.active !== false,
  }));
}

async function countForPrefix(prefix: string) {
  return InvitationGuest.countDocuments(prefixMatchFilter(prefix));
}

export async function listKosherPrefixes(): Promise<KosherPrefixRecord[]> {
  await ensureKosherPrefixesSeeded();
  const rows = await KosherPhonePrefix.find({})
    .sort({ prefix: 1 })
    .lean();

  const counts = await Promise.all(
    rows.map((row) => countForPrefix(String(row.prefix || "")))
  );

  return rows.map((row, index) => ({
    _id: String(row._id),
    prefix: String(row.prefix || ""),
    carrier: String(row.carrier || ""),
    active: row.active !== false,
    matchedCount: counts[index] || 0,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
  }));
}

export function validateKosherPrefixInput(input: {
  prefix?: unknown;
  carrier?: unknown;
}) {
  const prefix = normalizeKosherPrefix(input.prefix);
  const carrier = String(input.carrier || "").trim();
  if (!/^\d{4,8}$/.test(prefix)) {
    return { ok: false as const, error: "קידומת חייבת להכיל 4 עד 8 ספרות" };
  }
  if (!carrier) {
    return { ok: false as const, error: "יש להזין חברת תקשורת" };
  }
  return { ok: true as const, prefix, carrier };
}

export async function createKosherPrefix(input: {
  prefix: string;
  carrier: string;
}) {
  const existing = await KosherPhonePrefix.findOne({ prefix: input.prefix }).lean();
  if (existing) {
    return { ok: false as const, error: "הקידומת כבר קיימת" };
  }
  const created = await KosherPhonePrefix.create({
    prefix: input.prefix,
    carrier: input.carrier,
    active: true,
  });
  return { ok: true as const, id: String(created._id) };
}

export async function updateKosherPrefix(
  id: string,
  input: { prefix?: string; carrier?: string; active?: boolean }
) {
  const current = await KosherPhonePrefix.findById(id);
  if (!current) return { ok: false as const, error: "הקידומת לא נמצאה" };

  if (input.prefix && input.prefix !== current.prefix) {
    const clash = await KosherPhonePrefix.findOne({
      prefix: input.prefix,
      _id: { $ne: current._id },
    }).lean();
    if (clash) return { ok: false as const, error: "הקידומת כבר קיימת" };
    current.prefix = input.prefix;
  }
  if (typeof input.carrier === "string") current.carrier = input.carrier;
  if (typeof input.active === "boolean") current.active = input.active;
  await current.save();
  return { ok: true as const };
}

export async function deleteKosherPrefix(id: string) {
  const result = await KosherPhonePrefix.deleteOne({ _id: id });
  if (!result.deletedCount) return { ok: false as const, error: "הקידומת לא נמצאה" };
  return { ok: true as const };
}

export async function guestIsKosherPhone(phone: unknown) {
  const prefixes = await listActiveKosherPrefixRules();
  return isKosherPhone(phone, prefixes);
}
