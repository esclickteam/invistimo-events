export const CHOICE_OPTION_DEFAULT_WIDTH = 3;
export const CHOICE_OPTION_DEFAULT_HEIGHT = 4;
export const CHOICE_OPTION_MIN_SIZE = 2;
export const CHOICE_OPTION_MAX_SIZE = 20;
export const CHOICE_OPTION_MIN_COUNT = 2;
export const CHOICE_OPTION_MAX_COUNT = 10;
export const CHOICE_OPTION_GAP = 1.5;

export type ChoiceOption = {
  id: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function toNumber(value: unknown, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function cleanOptionLabel(value: unknown) {
  // Keep spaces while typing; trim only for display helpers.
  return typeof value === "string" ? value : "";
}

export function clampChoiceCount(value: unknown, fallback = 4) {
  return clamp(
    Math.round(toNumber(value, fallback)),
    CHOICE_OPTION_MIN_COUNT,
    CHOICE_OPTION_MAX_COUNT,
  );
}

export function clampChoiceOptionSize(
  width: unknown,
  height: unknown,
  fallbackWidth = CHOICE_OPTION_DEFAULT_WIDTH,
  fallbackHeight = CHOICE_OPTION_DEFAULT_HEIGHT,
) {
  const nextWidth = clamp(
    Number(toNumber(width, fallbackWidth).toFixed(2)),
    CHOICE_OPTION_MIN_SIZE,
    CHOICE_OPTION_MAX_SIZE,
  );
  const nextHeight = clamp(
    Number(toNumber(height, fallbackHeight).toFixed(2)),
    CHOICE_OPTION_MIN_SIZE,
    CHOICE_OPTION_MAX_SIZE,
  );

  return { width: nextWidth, height: nextHeight };
}

export function getChoiceOptionDisplayLabel(
  option: ChoiceOption | undefined,
  index: number,
) {
  const label = cleanOptionLabel(option?.label).trim();
  return label || `אפשרות ${index + 1}`;
}

export function buildChoiceOptions(
  count: number,
  startX = 38,
  startY = 35,
  layout: "vertical" | "horizontal" = "vertical",
): ChoiceOption[] {
  const safeCount = clampChoiceCount(count);
  const { width, height } = clampChoiceOptionSize(
    CHOICE_OPTION_DEFAULT_WIDTH,
    CHOICE_OPTION_DEFAULT_HEIGHT,
  );

  return Array.from({ length: safeCount }, (_, index) => {
    const x =
      layout === "horizontal"
        ? clamp(
            Number((startX + index * (width + CHOICE_OPTION_GAP)).toFixed(2)),
            0,
            100 - width,
          )
        : clamp(Number(startX.toFixed(2)), 0, 100 - width);

    const y =
      layout === "vertical"
        ? clamp(
            Number((startY + index * (height + CHOICE_OPTION_GAP)).toFixed(2)),
            0,
            100 - height,
          )
        : clamp(Number(startY.toFixed(2)), 0, 100 - height);

    return {
      id: String(index + 1),
      label: "",
      x,
      y,
      width,
      height,
    };
  });
}

export type CheckboxLikeField = {
  id: string;
  label?: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required?: boolean;
  order: number;
};

/**
 * Merge consecutive checkbox fields (same page, adjacent order) into one
 * single-select choice field. Option ids keep the original checkbox ids so
 * values can be written back as true/false per box on the PDF.
 */
export function mergeCheckboxFieldsToChoice(
  checkboxes: CheckboxLikeField[],
  fieldLabel = "בחירה",
): {
  id: string;
  label: string;
  type: "choice";
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  order: number;
  options: ChoiceOption[];
  sourceCheckboxIds: string[];
} | null {
  if (!Array.isArray(checkboxes) || checkboxes.length < CHOICE_OPTION_MIN_COUNT) {
    return null;
  }

  const sorted = [...checkboxes].sort((a, b) => a.order - b.order);
  const options: ChoiceOption[] = sorted.map((field) => {
    const { width, height } = clampChoiceOptionSize(field.width, field.height);
    const rawLabel = typeof field.label === "string" ? field.label.trim() : "";
    return {
      id: String(field.id),
      label:
        rawLabel && !isTerminationOptionalReasonDetailLabel(rawLabel)
          ? rawLabel
          : "",
      x: clamp(Number(toNumber(field.x, 0).toFixed(2)), 0, 100 - width),
      y: clamp(Number(toNumber(field.y, 0).toFixed(2)), 0, 100 - height),
      width,
      height,
    };
  });

  const bounds = getChoiceFieldBounds(options);
  const sharedLabel = sorted
    .map((field) => String(field.label || "").trim())
    .find(
      (label) =>
        label.length > 0 && !isTerminationOptionalReasonDetailLabel(label),
    );

  return {
    id: `choice-group-${sorted[0].id}`,
    label: sharedLabel || fieldLabel,
    type: "choice",
    pageIndex: sorted[0].pageIndex,
    ...bounds,
    required: sorted.some((field) => field.required !== false),
    order: sorted[0].order,
    options,
    sourceCheckboxIds: sorted.map((field) => String(field.id)),
  };
}

/**
 * Collapse order-adjacent checkbox runs on the same page into choice steps.
 * Non-checkbox fields stay as-is. Use for wizard UX when a template was built
 * with separate checkboxes that should be mutually exclusive.
 */
/** Default sub-labels for termination-request reason checkboxes on the PDF. */
export const TERMINATION_REASON_OPTION_LABELS = [
  "שעות העבודה והיקף המשרה אינם מתאימים לי.",
  "מצאתי מקום עבודה אחר.",
  "העבודה אינה מתאימה לי.",
  "סיבה אחרת:",
] as const;

const GENERIC_FIELD_LABELS = new Set([
  "",
  "שדה",
  "שדה טקסט",
  "תיבת סימון",
  "בחירה",
  "סיבה",
]);

export function isGenericAgreementFieldLabel(label: unknown) {
  return GENERIC_FIELD_LABELS.has(String(label ?? "").trim());
}

/** Free-text / leftover fields for "סיבה אחרת" — never required once a reason is chosen. */
export function isTerminationOptionalReasonDetailLabel(label: unknown) {
  const text = String(label ?? "").trim();
  if (isGenericAgreementFieldLabel(text)) return true;
  if (!text) return true;

  const normalized = text.replace(/[:：]\s*$/, "").trim();
  if (normalized === "סיבה") return true;
  if (normalized === "סיבה אחרת") return true;
  if (normalized.startsWith("סיבה אחרת")) return true;

  return false;
}

/**
 * Drop leftover "סיבה" / "סיבה אחרת" text or lone checkbox fields.
 * Templates often added them as required even when a fixed reason was selected.
 */
export function stripTerminationOtherReasonTextFields<
  T extends {
    id: string;
    type: string;
    label?: string;
    pageIndex?: number;
    sourceCheckboxIds?: string[];
    options?: ChoiceOption[];
  },
>(fields: T[]): { fields: T[]; skippedFieldIds: string[] } {
  const hasReasonChoice = fields.some((field) => {
    if (field.type !== "choice") return false;
    if (
      Array.isArray(field.sourceCheckboxIds) &&
      field.sourceCheckboxIds.length >= 2
    ) {
      return true;
    }
    return (
      Array.isArray(field.options) &&
      field.options.length === TERMINATION_REASON_OPTION_LABELS.length
    );
  });

  const reasonPageIndexes = new Set(
    fields
      .filter((field) => {
        if (field.type !== "choice") return false;
        if (
          Array.isArray(field.sourceCheckboxIds) &&
          field.sourceCheckboxIds.length >= 2
        ) {
          return true;
        }
        return (
          Array.isArray(field.options) &&
          field.options.length === TERMINATION_REASON_OPTION_LABELS.length
        );
      })
      .map((field) => Number(field.pageIndex ?? 0)),
  );

  const skippedFieldIds: string[] = [];
  const nextFields = fields.filter((field) => {
    const label = field.label;
    const onReasonPage = reasonPageIndexes.has(Number(field.pageIndex ?? 0));

    const shouldSkipText =
      field.type === "text" &&
      isTerminationOptionalReasonDetailLabel(label) &&
      (hasReasonChoice || onReasonPage);

    // Lone checkbox titled "סיבה" that wasn't folded into the choice group.
    const shouldSkipCheckbox =
      field.type === "checkbox" &&
      isTerminationOptionalReasonDetailLabel(label) &&
      hasReasonChoice;

    if (shouldSkipText || shouldSkipCheckbox) {
      skippedFieldIds.push(String(field.id));
      return false;
    }

    return true;
  });

  return { fields: nextFields, skippedFieldIds };
}

export function prepareTerminationAgreementFields<
  T extends {
    id: string;
    type: string;
    label?: string;
    pageIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
    required?: boolean;
    order: number;
    options?: ChoiceOption[];
    sourceCheckboxIds?: string[];
  },
>(fields: T[]) {
  const collapsed = collapseConsecutiveCheckboxesToChoiceFields(fields, {
    minGroupSize: 2,
    choiceLabel: "סיבת סיום ההעסקה",
    defaultOptionLabels: [...TERMINATION_REASON_OPTION_LABELS],
  }) as T[];

  return stripTerminationOtherReasonTextFields(collapsed);
}

export function collapseConsecutiveCheckboxesToChoiceFields<
  T extends CheckboxLikeField & { type: string; options?: ChoiceOption[] },
>(
  fields: T[],
  options?: {
    minGroupSize?: number;
    choiceLabel?: string;
    defaultOptionLabels?: string[];
  },
): Array<
  | T
  | (ReturnType<typeof mergeCheckboxFieldsToChoice> & { type: "choice" })
> {
  const minGroupSize = Math.max(
    CHOICE_OPTION_MIN_COUNT,
    options?.minGroupSize ?? CHOICE_OPTION_MIN_COUNT,
  );
  const choiceLabel = options?.choiceLabel || "בחירה";
  const defaultOptionLabels = options?.defaultOptionLabels || [];
  const sorted = [...fields].sort((a, b) => a.order - b.order);
  const result: Array<
    | T
    | (NonNullable<ReturnType<typeof mergeCheckboxFieldsToChoice>> & {
        type: "choice";
      })
  > = [];

  let index = 0;
  while (index < sorted.length) {
    const field = sorted[index];

    if (field.type !== "checkbox") {
      result.push(field);
      index += 1;
      continue;
    }

    const run: T[] = [field];
    let cursor = index + 1;

    while (cursor < sorted.length) {
      const next = sorted[cursor];
      if (next.type !== "checkbox") break;
      if (next.pageIndex !== field.pageIndex) break;
      // Adjacent in fill-order list on the same page = one exclusive group.
      run.push(next);
      cursor += 1;
    }

    const allGenericLabels = run.every((item) =>
      isTerminationOptionalReasonDetailLabel(item.label),
    );

    // Only auto-collapse unlabeled checkbox clusters (typical "pick one reason"
    // rows). Labeled confirmation checkboxes stay as separate required steps.
    if (run.length >= minGroupSize && allGenericLabels) {
      const merged = mergeCheckboxFieldsToChoice(run, choiceLabel);
      if (merged) {
        if (
          defaultOptionLabels.length > 0 &&
          merged.options.length === defaultOptionLabels.length
        ) {
          merged.options = merged.options.map((option, optionIndex) => ({
            ...option,
            label:
              option.label?.trim() ||
              defaultOptionLabels[optionIndex] ||
              option.label ||
              "",
          }));
        }

        result.push(merged);
        index = cursor;
        continue;
      }
    }

    result.push(field);
    index += 1;
  }

  return result;
}

export function normalizeChoiceOptions(
  raw: unknown,
  fallbackCount = 4,
  fallbackX = 38,
  fallbackY = 35,
): ChoiceOption[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return buildChoiceOptions(fallbackCount, fallbackX, fallbackY);
  }

  const normalized = raw
    .slice(0, CHOICE_OPTION_MAX_COUNT)
    .map((item: any, index: number) => {
      const { width, height } = clampChoiceOptionSize(item?.width, item?.height);
      const x = clamp(Number(toNumber(item?.x, fallbackX).toFixed(2)), 0, 100 - width);
      const y = clamp(Number(toNumber(item?.y, fallbackY).toFixed(2)), 0, 100 - height);

      return {
        id: String(item?.id || index + 1),
        label: cleanOptionLabel(item?.label),
        x,
        y,
        width,
        height,
      };
    });

  if (normalized.length < CHOICE_OPTION_MIN_COUNT) {
    return buildChoiceOptions(fallbackCount, fallbackX, fallbackY);
  }

  return normalized;
}

export function getChoiceFieldBounds(options: ChoiceOption[]) {
  if (!options.length) {
    return {
      x: 38,
      y: 35,
      width: CHOICE_OPTION_DEFAULT_WIDTH,
      height: CHOICE_OPTION_DEFAULT_HEIGHT,
    };
  }

  const minX = Math.min(...options.map((option) => option.x));
  const minY = Math.min(...options.map((option) => option.y));
  const maxX = Math.max(...options.map((option) => option.x + option.width));
  const maxY = Math.max(...options.map((option) => option.y + option.height));

  return {
    x: Number(minX.toFixed(2)),
    y: Number(minY.toFixed(2)),
    width: Number(Math.max(CHOICE_OPTION_MIN_SIZE, maxX - minX).toFixed(2)),
    height: Number(Math.max(CHOICE_OPTION_MIN_SIZE, maxY - minY).toFixed(2)),
  };
}

export function resizeChoiceOptions(
  current: ChoiceOption[],
  nextCount: number,
): ChoiceOption[] {
  const safeCount = clampChoiceCount(nextCount, current.length || 4);
  const existing = normalizeChoiceOptions(current, safeCount);

  if (existing.length === safeCount) {
    return existing.slice(0, safeCount).map((option, index) => ({
      ...option,
      id: String(index + 1),
    }));
  }

  if (existing.length > safeCount) {
    return existing.slice(0, safeCount).map((option, index) => ({
      ...option,
      id: String(index + 1),
    }));
  }

  const last = existing[existing.length - 1];
  const extras = Array.from(
    { length: safeCount - existing.length },
    (_, index) => {
      const offset = index + 1;
      const { width, height } = clampChoiceOptionSize(last.width, last.height);
      const x = clamp(Number(last.x.toFixed(2)), 0, 100 - width);
      const y = clamp(
        Number((last.y + offset * (height + CHOICE_OPTION_GAP)).toFixed(2)),
        0,
        100 - height,
      );

      return {
        id: String(existing.length + offset),
        label: "",
        x,
        y,
        width,
        height,
      };
    },
  );

  return [...existing, ...extras].map((option, index) => ({
    ...option,
    id: String(index + 1),
  }));
}

export function isChoiceValueSelected(
  value: unknown,
  options: ChoiceOption[] | undefined,
) {
  const selected = String(value ?? "").trim();
  if (!selected || !Array.isArray(options) || options.length === 0) {
    return false;
  }

  return options.some((option) => option.id === selected);
}

/** Treat fields with option boxes as choice even if type was lost/mis-saved. */
export function hasChoiceOptions(raw: unknown) {
  return Array.isArray(raw) && raw.length >= CHOICE_OPTION_MIN_COUNT;
}

export function resolveAgreementFieldType(
  rawType: unknown,
  rawOptions?: unknown,
): "text" | "date" | "signature" | "checkbox" | "choice" {
  if (hasChoiceOptions(rawOptions)) {
    return "choice";
  }

  const type = String(rawType || "")
    .trim()
    .toLowerCase();

  if (type === "date") return "date";
  if (type === "signature") return "signature";
  if (type === "checkbox") return "checkbox";
  if (type === "choice") return "choice";

  return "text";
}
