"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { FAQ_SECTIONS } from "@/lib/seo/publicFaq";

export default function FAQAccordion() {
  const [open, setOpen] = useState(null);

  return (
    <div className="space-y-10">
      {FAQ_SECTIONS.map((section, sIndex) => (
        <div key={sIndex}>
          <h2 className="text-2xl font-bold mb-4 text-[#5c4632]">
            {section.title}
          </h2>

          <div className="space-y-3">
            {section.items.map((item, iIndex) => {
              const id = `${sIndex}-${iIndex}`;
              const isOpen = open === id;

              return (
                <div
                  key={id}
                  className="border border-[#eadfce] rounded-xl bg-white"
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : id)}
                    className="w-full flex justify-between items-center px-5 py-4 text-right"
                  >
                    <span className="font-semibold">{item.q}</span>
                    <ChevronDown
                      className={`transition ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-[#7b6754] leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
