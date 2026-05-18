"use client";

import React, { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ImageIcon,
  MapPin,
  Plus,
  Search,
  Users,
} from "lucide-react";

type DemoHall = {
  id: string;
  complexName: string;
  name: string;
  location: string;
  minGuests: number;
  maxGuests: number;
  pricePerGuest: number;
  eventTypes: string[];
  features: string[];
  activeEvents: number;
  status: "active" | "inactive";
};

const demoHalls: DemoHall[] = [
  {
    id: "1",
    complexName: "מתחם בראשית",
    name: "אולם גפן",
    location: "נס ציונה",
    minGuests: 180,
    maxGuests: 320,
    pricePerGuest: 320,
    eventTypes: ["חתונה", "בר מצווה", "אירוע חברה"],
    features: ["מסכי לד", "גן חופה", "רחבת ריקודים"],
    activeEvents: 12,
    status: "active",
  },
  {
    id: "2",
    complexName: "מתחם בראשית",
    name: "אולם הדר",
    location: "נס ציונה",
    minGuests: 250,
    maxGuests: 480,
    pricePerGuest: 360,
    eventTypes: ["חתונה", "אירוע חברה"],
    features: ["חופה חיצונית", "סוויטת חתן כלה", "בר פרימיום"],
    activeEvents: 18,
    status: "active",
  },
  {
    id: "3",
    complexName: "מתחם בראשית",
    name: "אולם כרם",
    location: "נס ציונה",
    minGuests: 400,
    maxGuests: 700,
    pricePerGuest: 410,
    eventTypes: ["חתונה גדולה", "כנס", "אירוע חברה"],
    features: ["במה", "מערכת הגברה", "חדר VIP"],
    activeEvents: 9,
    status: "active",
  },
];

export default function VenueHallsTab() {
  const [query, setQuery] = useState("");

  const filteredHalls = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return demoHalls;

    return demoHalls.filter((hall) =>
      [
        hall.complexName,
        hall.name,
        hall.location,
        ...hall.eventTypes,
        ...hall.features,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [query]);

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-black text-[#a5824f]">מתחם ואולמות</p>

            <h2 className="mt-2 text-2xl font-black text-[#2f261d]">
              ניהול אולמות במתחם
            </h2>

            <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-[#7b6a58]">
              כאן בעל המתחם מנהל את כל האולמות, הקיבולת, המחירים, סוגי
              האירועים, סקיצות, תמונות וסטטוס פעילות.
            </p>
          </div>

          <button
            type="button"
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2f261d] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#493a2d]"
          >
            <Plus size={18} />
            הוספת אולם
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <InfoBox label="מתחמים" value="1" />
          <InfoBox label="אולמות פעילים" value="3" />
          <InfoBox label="קיבולת מקסימלית" value="1,500" />
        </div>
      </div>

      <div className="rounded-[2rem] border border-[#eadfce] bg-white p-4 shadow-sm">
        <div className="relative">
          <Search
            size={18}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9b8974]"
          />

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש אולם, מתחם, סוג אירוע או מאפיין..."
            className="h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffaf4] pr-11 text-sm font-bold text-[#2f261d] outline-none transition placeholder:text-[#a99a89] focus:border-[#d6b46d]"
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {filteredHalls.map((hall) => (
          <article
            key={hall.id}
            className="overflow-hidden rounded-[2rem] border border-[#eadfce] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex h-40 items-center justify-center bg-gradient-to-br from-[#f1e6d4] to-[#fffaf4]">
              <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-white/80 text-[#a5824f] shadow-sm">
                <ImageIcon size={32} />
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-[#a5824f]">
                    {hall.complexName}
                  </p>

                  <h3 className="mt-1 text-xl font-black text-[#2f261d]">
                    {hall.name}
                  </h3>
                </div>

                <span className="rounded-full bg-[#eaf7ef] px-3 py-1 text-xs font-black text-[#2e7d46]">
                  פעיל
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm font-bold text-[#7b6a58]">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-[#a5824f]" />
                  {hall.location}
                </div>

                <div className="flex items-center gap-2">
                  <Users size={16} className="text-[#a5824f]" />
                  {hall.minGuests}–{hall.maxGuests} אורחים
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#a5824f]" />
                  ₪{hall.pricePerGuest} למנה בסיס
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {hall.eventTypes.map((type) => (
                  <span
                    key={type}
                    className="rounded-full bg-[#f7f2ea] px-3 py-1 text-xs font-black text-[#7a5a25]"
                  >
                    {type}
                  </span>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-[#fffaf4] p-4">
                <p className="text-xs font-black text-[#8a7966]">
                  אירועים פעילים
                </p>
                <p className="mt-1 text-2xl font-black text-[#2f261d]">
                  {hall.activeEvents}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredHalls.length === 0 && (
        <div className="rounded-[2rem] border border-dashed border-[#d9c7aa] bg-white p-10 text-center shadow-sm">
          <Building2 className="mx-auto text-[#a5824f]" size={34} />
          <h3 className="mt-4 text-xl font-black text-[#2f261d]">
            לא נמצאו אולמות
          </h3>
          <p className="mt-2 text-sm font-bold text-[#7b6a58]">
            נסי לשנות את מילת החיפוש או להוסיף אולם חדש.
          </p>
        </div>
      )}
    </section>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#f0e6d7] bg-[#fffaf4] p-4">
      <p className="text-xs font-black text-[#8a7966]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#2f261d]">{value}</p>
    </div>
  );
}