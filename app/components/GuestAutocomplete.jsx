"use client";

import { Combobox } from "@headlessui/react";
import { useState } from "react";

export default function GuestAutocomplete({ guests, onSelect }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered =
    query === ""
      ? guests
      : guests.filter((g) =>
          g.name.toLowerCase().includes(query.toLowerCase()) ||
          g.phone.replace(/\D/g, "").includes(query.replace(/\D/g, ""))
        );

  return (
    <div className="w-full">
      <Combobox
        value={selected}
        onChange={(guest) => {
          setSelected(guest);
          onSelect(guest._id);
        }}
      >
        <div className="relative">
          <Combobox.Input
            className="w-full border border-[#e2d6c8] rounded-xl p-3"
            displayValue={(guest) =>
              guest ? `${guest.name} (${guest.phone})` : ""
            }
            onChange={(event) => setQuery(event.target.value)}
            placeholder="בחר/י מוזמן או הקלד/י לחיפוש…"
          />

          <Combobox.Options className="absolute z-50 w-full mt-1 bg-white border border-[#e2d6c8] rounded-xl shadow-lg max-h-60 overflow-auto">
            {filtered.length === 0 && query !== "" ? (
              <div className="p-3 text-gray-500">אין תוצאות</div>
            ) : (
              filtered.map((guest) => (
                <Combobox.Option
                  key={guest._id}
                  value={guest}
                  className={({ active }) =>
                    `cursor-pointer select-none p-3 ${
                      active ? "bg-[#f7f3ee]" : ""
                    }`
                  }
                >
                  {guest.name} ({guest.phone})
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </div>
      </Combobox>
    </div>
  );
}
