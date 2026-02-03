import { NextResponse } from "next/server";
import { shortenUrl } from "@/lib/shortenUrl";
import { countSmsParts } from "@/lib/smsUtils";

/* ======================================================
   HELPERS
====================================================== */
async function shortenUrlsInText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex);

  if (!urls) return text;

  let result = text;

  for (const url of urls) {
    const shortUrl = await shortenUrl(url);
    result = result.replace(url, shortUrl);
  }

  return result;
}

/* ======================================================
   POST /api/sms/length
   מחשב אורך הודעת SMS אמיתית (אחרי קיצור קישורים)
====================================================== */
export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (typeof message !== "string") {
      return NextResponse.json(
        { error: "INVALID_MESSAGE" },
        { status: 400 }
      );
    }

    // ✂️ קיצור כל הקישורים לפני חישוב
    const finalText = await shortenUrlsInText(message);

    return NextResponse.json({
      length: finalText.length,          // תווים בפועל
      parts: countSmsParts(finalText),   // כמה SMS באמת
    });
  } catch (err) {
    console.error("❌ SMS LENGTH ERROR:", err);
    return NextResponse.json(
      { error: "FAILED_TO_CALCULATE_SMS_LENGTH" },
      { status: 500 }
    );
  }
}
