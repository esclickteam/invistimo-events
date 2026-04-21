"use client";

import { useGroupStore } from "@/store/groupStore";

type Props = {
  value?: any; // 🔥 חשוב - לא רק string
  onChange: (groupId: string | null) => void;
};

export default function GuestGroupSelect({ value, onChange }: Props) {
  const groups = useGroupStore((s) => s.groups);

  // 🔥 נרמול value (זה הפתרון האמיתי)
  const normalizedValue =
    typeof value === "object"
      ? value?._id || ""
      : value || "";

  return (
    <select
      value={normalizedValue}
      onChange={(e) =>
        onChange(e.target.value ? String(e.target.value) : null)
      }
      className="rounded-md border px-2 py-1 text-sm bg-white w-full"
    >
      <option value="">ללא קבוצה</option>

      {groups.map((group) => (
        <option key={String(group._id)} value={String(group._id)}>
          {group.name}
        </option>
      ))}
    </select>
  );
}