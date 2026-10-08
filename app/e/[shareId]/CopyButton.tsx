"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type Props = {
  value: string;
  label?: string;
  successLabel?: string;
};

export default function CopyButton({
  value,
  label = "העתקת מספר ל-Bit",
  successLabel = "המספר הועתק בהצלחה",
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2200);
    } catch {
      alert("לא הצלחנו להעתיק. אפשר לסמן ולהעתיק ידנית.");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="
        inline-flex
        min-h-11
        items-center
        justify-center
        gap-2
        rounded-2xl
        bg-[#2F2924]
        px-4
        text-xs
        font-black
        text-white
        shadow-[0_10px_24px_rgba(47,41,36,0.22)]
        transition
        hover:-translate-y-0.5
        hover:shadow-[0_14px_30px_rgba(47,41,36,0.30)]
      "
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          {successLabel}
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {label}
        </>
      )}
    </button>
  );
}
