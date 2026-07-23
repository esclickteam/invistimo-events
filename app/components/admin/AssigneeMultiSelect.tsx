"use client";

type AssigneeOption = {
  _id: string;
  name?: string;
  email?: string;
};

type AssigneeMultiSelectProps = {
  label: string;
  options: AssigneeOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyLabel?: string;
};

export default function AssigneeMultiSelect({
  label,
  options,
  selectedIds,
  onChange,
  emptyLabel = "לא נבחרו",
}: AssigneeMultiSelectProps) {
  const selectedSet = new Set(selectedIds.map(String));

  function toggle(id: string) {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  }

  const selectedLabels = options
    .filter((option) => selectedSet.has(String(option._id)))
    .map((option) => option.name || option.email || option._id);

  return (
    <div>
      <span className="mb-2 block text-sm font-black text-[#6B5A48]">
        {label}
      </span>

      <div
        className="
          max-h-48 overflow-auto rounded-2xl
          border border-[#E7D8C6]
          bg-white p-2
        "
      >
        {options.length === 0 ? (
          <p className="px-2 py-2 text-sm font-bold text-[#9B9187]">
            אין אפשרויות זמינות
          </p>
        ) : (
          options.map((option) => {
            const id = String(option._id);
            const checked = selectedSet.has(id);

            return (
              <label
                key={id}
                className="
                  flex cursor-pointer items-center gap-3
                  rounded-xl px-3 py-2.5
                  text-sm font-bold text-[#3A2A1C]
                  transition hover:bg-[#FFF9EF]
                "
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(id)}
                  className="h-4 w-4 accent-[#B97821]"
                />
                <span>{option.name || option.email || id}</span>
              </label>
            );
          })
        )}
      </div>

      <p className="mt-2 text-xs font-bold text-[#8B7B68]">
        {selectedLabels.length > 0
          ? `נבחרו: ${selectedLabels.join(", ")}`
          : emptyLabel}
      </p>
    </div>
  );
}
