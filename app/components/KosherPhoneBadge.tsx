export default function KosherPhoneBadge({ active }: { active?: boolean }) {
  if (!active) return null;
  return (
    <span className="pointer-events-auto relative z-20 inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black leading-none text-emerald-800">
      מספר כשר
    </span>
  );
}
