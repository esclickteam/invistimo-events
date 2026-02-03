import { NextResponse } from "next/server";
import { shortenUrl } from "@/lib/shortenUrl";
import { countSmsParts } from "@/lib/smsUtils";

async function shortenUrlsInText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex);
  if (!urls) return text;

  let result = text;
  for (const url of urls) {
    const short = await shortenUrl(url);
    result = result.replace(url, short);
  }
  return result;
}

export async function POST(req: Request) {
  const { message } = await req.json();

  let finalText = await shortenUrlsInText(message);

  return NextResponse.json({
    length: finalText.length,
    parts: countSmsParts(finalText),
  });
}
