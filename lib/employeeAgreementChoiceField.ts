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
): ChoiceOption[] {
  const safeCount = clampChoiceCount(count);
  const { width, height } = clampChoiceOptionSize(
    CHOICE_OPTION_DEFAULT_WIDTH,
    CHOICE_OPTION_DEFAULT_HEIGHT,
  );

  return Array.from({ length: safeCount }, (_, index) => {
    const x = clamp(
      Number((startX + index * (width + CHOICE_OPTION_GAP)).toFixed(2)),
      0,
      100 - width,
    );

    return {
      id: String(index + 1),
      label: "",
      x,
      y: clamp(Number(startY.toFixed(2)), 0, 100 - height),
      width,
      height,
    };
  });
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
      const x = clamp(
        Number((last.x + offset * (width + CHOICE_OPTION_GAP)).toFixed(2)),
        0,
        100 - width,
      );

      return {
        id: String(existing.length + offset),
        label: "",
        x,
        y: last.y,
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
