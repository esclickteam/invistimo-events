"use client";

import { useGroupStore } from "@/store/groupStore";

type Props = {
  value?: string | null;
  onChange: (groupId: string | null) => void;
};

export default function GuestGroupSelect({ value, onChange }: Props) {
  const groups = useGroupStore((s) => s.groups);

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="rounded-md border px-2 py-1 text-sm bg-white"
    >
      <option value="">ללא קבוצה</option>

      {groups.map((group) => (
        <option key={group._id} value={group._id}>
          {group.name}
        </option>
      ))}
    </select>
  );
}
