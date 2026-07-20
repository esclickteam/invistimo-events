import { isCheckboxChecked } from "@/lib/employeeSnapshot";

function readRawValue(
  values: Record<string, unknown> | undefined | null,
  key: string,
) {
  if (!values || !key) return "";
  const raw = values[key];
  if (typeof raw === "boolean") return raw ? "true" : "false";
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw === "string") return raw.trim();
  return "";
}

/**
 * Collect every option/checkbox id that should show a mark on the PDF.
 * Handles:
 * - checkbox true/false values
 * - native choice field value = option id
 * - synthetic wizard groups (`choice-group-…`) whose value is a checkbox id
 */
export function resolveMarkedAgreementOptionIds(
  values: Record<string, unknown> | undefined | null,
  fields: Array<{
    id: string;
    type: string;
    options?: Array<{ id: string }>;
    sourceCheckboxIds?: string[];
  }> = [],
): Set<string> {
  const marked = new Set<string>();
  const map = values || {};

  for (const [key, raw] of Object.entries(map)) {
    const value = readRawValue(map, key);
    if (isCheckboxChecked(value)) {
      marked.add(key);
    }
  }

  for (const field of fields) {
    const direct = readRawValue(map, field.id);

    if (field.type === "choice") {
      const optionIds = (field.options || []).map((option) => String(option.id));
      const sourceIds = (field.sourceCheckboxIds || []).map((id) => String(id));
      const knownIds = new Set([...optionIds, ...sourceIds]);

      if (direct && (knownIds.size === 0 || knownIds.has(direct))) {
        marked.add(direct);
      }

      for (const optionId of knownIds) {
        if (isCheckboxChecked(readRawValue(map, optionId))) {
          marked.add(optionId);
        }
      }
    }

    // Choice-group value pointing at this field/option id
    if (direct && !isCheckboxChecked(direct)) {
      for (const other of fields) {
        if (other.id === direct) {
          marked.add(direct);
        }
        for (const option of other.options || []) {
          if (String(option.id) === direct) {
            marked.add(direct);
          }
        }
        for (const sourceId of other.sourceCheckboxIds || []) {
          if (String(sourceId) === direct) {
            marked.add(direct);
          }
        }
      }
    }
  }

  for (const [key, raw] of Object.entries(map)) {
    if (!String(key).startsWith("choice-group-")) continue;
    const selected = readRawValue(map, key);
    if (selected && !isCheckboxChecked(selected)) {
      marked.add(selected);
    }
  }

  return marked;
}

export function isAgreementOptionMarked(
  markedIds: Set<string>,
  values: Record<string, unknown> | undefined | null,
  optionId: string,
  fieldId?: string,
) {
  const id = String(optionId || "").trim();
  if (!id) return false;
  if (markedIds.has(id)) return true;
  if (isCheckboxChecked(readRawValue(values, id))) return true;
  if (fieldId && readRawValue(values, fieldId) === id) return true;
  return false;
}
