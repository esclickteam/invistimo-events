"use client";

import { useState } from "react";

type Props = {
  value: string;
};

export default function CopyButton({ value }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      alert("לא הצלחנו להעתיק. אפשר לסמן ולהעתיק ידנית.");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="
        mt-3
        inline-flex
        h-11
        items-center
        justify-center
        rounded-2xl
        bg-[#2F2924]
        px-5
        text-sm
        font-black
        text-white
        shadow-lg
        transition
        hover:scale-[1.01]
      "
    >
      {copied ? "המספר הועתק" : "העתק מספר"}
    </button>
  );
}