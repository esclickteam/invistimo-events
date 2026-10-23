"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { FAQ_SECTIONS } from "@/lib/seo/publicFaq";

/**
 * Answers stay in the DOM for crawlers and AI readers.
 * The accordion only toggles visibility CSS, never removes answer text.
 */
export default function FAQAccordion() {
  const [open, setOpen] = useState(null);

  return (
    <div className="space-y-10">
      {FAQ_SECTIONS.map((section, sIndex) => (
        <div key={sIndex}>
          <h2 className="mb-4 text-2xl font-bold text-[#5c4632]">{section.title}</h2>

          <div className="space-y-3">
            {section.items.map((item, iIndex) => {
              const id = `${sIndex}-${iIndex}`;
              const isOpen = open === id;

              return (
                <div key={id} className="rounded-xl border border-[#eadfce] bg-white">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${id}`}
                    onClick={() => setOpen(isOpen ? null : id)}
                    className="flex w-full items-center justify-between px-5 py-4 text-right"
                  >
                    <span className="font-semibold">{item.q}</span>
                    <ChevronDown className={`transition ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                  </button>

                  <div
                    id={`faq-answer-${id}`}
                    className={`px-5 pb-5 leading-relaxed text-[#7b6754] ${
                      isOpen ? "block" : "hidden"
                    }`}
                  >
                    {item.a}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
