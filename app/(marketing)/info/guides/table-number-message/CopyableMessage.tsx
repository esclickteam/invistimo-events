"use client";

import { useCallback, useState } from "react";

type Props = {
  title: string;
  body: string;
  note?: string;
};

export default function CopyableMessage({ title, body, note }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [body]);

  return (
    <div className="flex h-full flex-col rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-lg font-black text-[#2C241C]">{title}</h3>
        <button
          type="button"
          onClick={copy}
          className="rounded-full border border-[#DCC7A6] bg-white px-3 py-1.5 text-xs font-bold text-[#5E4735] transition hover:bg-[#FFF8EA]"
        >
          {copied ? "הועתק" : "העתקה"}
        </button>
      </div>
      <pre className="mt-4 flex-1 whitespace-pre-wrap rounded-2xl border border-[#EADDC8] bg-[#FBF6EE] px-4 py-4 text-sm leading-7 text-[#3F3025]">
        {body}
      </pre>
      {note ? <p className="mt-3 text-xs leading-6 text-[#7A6042]">{note}</p> : null}
    </div>
  );
}
