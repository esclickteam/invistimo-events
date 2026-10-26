"use client";

import { useCallback, useState } from "react";
import { Copy, Check } from "lucide-react";

type Props = {
  text: string;
  label?: string;
  title?: string;
};

export default function CopyableMessage({
  text,
  label = "העתיקו את הנוסח",
  title = "דוגמה להודעה",
}: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [text]);

  return (
    <div className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(58,39,20,0.05)]">
      <p className="text-sm font-black text-[#7A5530]">{title}</p>
      <blockquote className="mt-3 whitespace-pre-wrap rounded-2xl border border-[#EADDC8] bg-white px-4 py-3 text-sm leading-7 text-[#3F3025] md:text-base">
        {text}
      </blockquote>
      <button
        type="button"
        onClick={onCopy}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#DCC7A6] bg-white px-5 py-2.5 text-sm font-bold text-[#5E4735] transition hover:bg-[#FFF8EA] print:hidden"
      >
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {copied ? "הועתק" : label}
      </button>
    </div>
  );
}
