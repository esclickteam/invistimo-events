// ───────────────────────────────────────────────
// 📌 Dynamic Google Fonts Loader (ALL FONTS)
// ───────────────────────────────────────────────

export async function fetchGoogleFonts(apiKey?: string): Promise<string[]> {
  if (!apiKey) {
    console.warn("Google Fonts API key is missing!");
    return [];
  }

  const GOOGLE_FONTS_API = `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=alpha`;

  try {
    const res = await fetch(GOOGLE_FONTS_API);
    const data = await res.json();
    return data.items.map((font: any) => font.family); // מחזיר את כל הפונטים בגוגל
  } catch (err) {
    console.error("Google Fonts API error:", err);
    return [];
  }
}
