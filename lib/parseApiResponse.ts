export async function parseApiResponse<T = Record<string, unknown>>(
  res: Response
): Promise<{ data: T | null; rawText: string }> {
  const rawText = await res.text();

  if (!rawText) {
    return { data: null, rawText };
  }

  try {
    return { data: JSON.parse(rawText) as T, rawText };
  } catch {
    return { data: null, rawText };
  }
}

export function getApiErrorMessage(
  res: Response,
  data: Record<string, unknown> | null,
  rawText: string,
  fallback = "שגיאה בשמירה"
): string {
  if (res.status === 413) {
    return "התמונה גדולה מדי. נסו להעלות קובץ קטן יותר או בפורמט JPG";
  }

  const error = data?.error || data?.message;

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (rawText.startsWith("Request Entity Too Large")) {
    return "התמונה גדולה מדי לשמירה";
  }

  return fallback;
}
