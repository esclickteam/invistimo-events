/** Reading time from visible words. About 200 Hebrew words per minute. */

export function countWords(text: string) {
  return text
    .split(/\s+/)
    .filter((word) => /[\u0590-\u05FFA-Za-z0-9]/.test(word)).length;
}

export function minutesFromWordCount(words: number) {
  if (words <= 0) return 1;
  return Math.max(1, Math.round(words / 200));
}

export function minutesFromText(text: string) {
  return minutesFromWordCount(countWords(text));
}

export function formatReadingTime(minutes: number) {
  const safe = Math.max(1, Math.round(minutes));
  if (safe === 1) return "זמן קריאה: דקה";
  return `זמן קריאה: ${safe} דקות`;
}
