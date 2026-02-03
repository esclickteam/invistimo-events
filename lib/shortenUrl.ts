import ShortLink from "@/models/ShortLink";
import { createShortCode } from "./createShortCode";

export async function shortenUrl(targetUrl: string) {
  // ⛔ הגנה קריטית – לא מקצרים URL עם משתנים לא פתורים
  if (targetUrl.includes("{{") || targetUrl.includes("}}")) {
    throw new Error(
      `❌ Attempted to shorten unresolved template URL: ${targetUrl}`
    );
  }

  let code = "";
  let exists = true;

  while (exists) {
    code = createShortCode();
    const found = await ShortLink.exists({ code });
    exists = found !== null;
  }

  await ShortLink.create({
    code,
    targetUrl,
  });

  return `https://invst.me/${code}`;
}
