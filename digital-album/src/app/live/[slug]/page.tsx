"use client";

import { useEffect, useState, use } from "react";

type LiveData = {
  active: boolean;
  hostNames: string;
  title: string;
  autoAdvanceMs?: number;
  items: { id: string; url: string; dedication: string | null }[];
};

export default function LiveScreenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [data, setData] = useState<LiveData | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const res = await fetch(`/api/public/live/${slug}`);
      const json = await res.json();
      if (!cancelled && json.ok) setData(json.data);
    }
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [slug]);

  useEffect(() => {
    if (!data?.active || !data.items.length) return;
    const ms = data.autoAdvanceMs || 6000;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % data.items.length);
    }, ms);
    return () => clearInterval(id);
  }, [data]);

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-black text-white">
        טוען מסך LIVE…
      </main>
    );
  }

  if (!data.active) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--ink)] text-[var(--card)]">
        <div className="text-center px-6">
          <p className="font-display text-5xl">{data.hostNames}</p>
          <p className="mt-3 opacity-70">השידור החי אינו פעיל כרגע</p>
        </div>
      </main>
    );
  }

  const item = data.items[index % data.items.length];

  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      {item ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={item.id}
          src={item.url}
          alt=""
          className="absolute inset-0 h-full w-full object-contain animate-soft-scale"
        />
      ) : null}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-8 text-white">
        <p className="font-display text-4xl">{data.hostNames}</p>
        {item?.dedication ? <p className="mt-2 opacity-90">{item.dedication}</p> : null}
      </div>
    </main>
  );
}
