import ShortLink from "@/models/ShortLink";
import { createShortCode } from "./createShortCode";

export async function shortenUrl(targetUrl: string) {
  let code = "";
  let exists = true;

  while (exists) {
    code = createShortCode();
    const found = await ShortLink.exists({ code });
    exists = found !== null;
  }

  await ShortLink.create({ code, targetUrl });

  return `https://invst.me/${code}`;
}
