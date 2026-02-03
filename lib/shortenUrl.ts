import ShortLink from "@/models/ShortLink";
import { createShortCode } from "./createShortCode";

const BASE_URL = "https://www.invistimo.com";

export async function shortenUrl(targetUrl: string) {
  // ⛔ הגנה קריטית – לא מקצרים URL עם משתנים לא פתורים
  if (targetUrl.includes("{{") || targetUrl.includes("}}")) {
    throw new Error(
      `❌ Attempted to shorten unresolved template URL: ${targetUrl}`
    );
  }

  // ♻️ אם כבר קיים קיצור ל־URL הזה – נשתמש בו
  const existing = await ShortLink.findOne({ targetUrl }).lean();
  if (existing?.code) {
    return `${BASE_URL}/${existing.code}`;
  }

  let code = "";
  let exists = true;

  // 🔁 יצירת קוד ייחודי
  while (exists) {
    code = createShortCode();
    const found = await ShortLink.exists({ code });
    exists = found !== null;
  }

  await ShortLink.create({
    code,
    targetUrl,
  });

  return `${BASE_URL}/${code}`;
}
