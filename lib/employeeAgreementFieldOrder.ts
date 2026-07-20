export function toPositiveFieldOrder(value: unknown, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : fallback;
}

export function sortAgreementFieldsByOrder<T extends { order?: number }>(
  fields: T[],
): Array<T & { order: number }> {
  return [...fields]
    .map((field, index) => ({ field, index }))
    .sort((a, b) => {
      const orderA = toPositiveFieldOrder(a.field.order, a.index + 1);
      const orderB = toPositiveFieldOrder(b.field.order, b.index + 1);

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.index - b.index;
    })
    .map(({ field }, index) => ({
      ...field,
      order: index + 1,
    }));
}
