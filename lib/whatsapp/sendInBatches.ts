export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendInBatches<T>({
  items,
  batchSize,
  delayMs,
  handler,
}: {
  items: T[];
  batchSize: number;
  delayMs: number;
  handler: (item: T) => Promise<void>;
}) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // שולחים קבוצה קטנה במקביל
    await Promise.allSettled(batch.map((item) => handler(item)));

    // מחכים לפני הקבוצה הבאה
    if (i + batchSize < items.length) {
      await sleep(delayMs);
    }
  }
}
