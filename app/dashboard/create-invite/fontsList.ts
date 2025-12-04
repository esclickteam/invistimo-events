// ───────────────────────────────────────────────
// 📌 Dynamic Google Fonts Loader (ALL FONTS)
// ───────────────────────────────────────────────

// API רשמי של Google Fonts  (דורש API KEY שלך)
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_FONTS_KEY!;
const GOOGLE_FONTS_API = `https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=alpha`;

export async function fetchGoogleFonts(): Promise<string[]> {
  try {
    const res = await fetch(GOOGLE_FONTS_API);
    const data = await res.json();

    return data.items.map((font: any) => font.family); // → מחזיר *את כל הפונטים בגוגל*
  } catch (err) {
    console.error("Google Fonts API error:", err);
    return [];
  }
}
