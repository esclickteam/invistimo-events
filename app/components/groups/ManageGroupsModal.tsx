"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useGroupStore } from "@/store/groupStore";

type Props = {
  open: boolean;
  onClose: () => void;
  invitationId: string; // ⭐ חובה לשמירה
};

export default function ManageGroupsModal({
  open,
  onClose,
  invitationId,
}: Props) {
  const groups = useGroupStore((s) => s.groups);
  const setGroups = useGroupStore((s) => s.setGroups);

  const [newGroupName, setNewGroupName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  /* ===============================
     ➕ יצירת קבוצה
  =============================== */
  const handleAdd = async () => {
    if (!newGroupName.trim() || !invitationId) return;

    setSaving(true);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId,
          name: newGroupName.trim(),
        }),
      });

      const data = await res.json();
      if (!data.success) return;

      setGroups([...groups, data.group]);
      setNewGroupName("");
    } finally {
      setSaving(false);
    }
  };

  /* ===============================
     ✏️ עדכון שם קבוצה
  =============================== */
  const handleRename = async (id: string, name: string) => {
    // UX מיידי
    setGroups(
      groups.map((g) => (g._id === id ? { ...g, name } : g))
    );

    await fetch(`/api/groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  };

  /* ===============================
     🗑️ מחיקת קבוצה
  =============================== */
  const handleDelete = async (id: string) => {
    setGroups(groups.filter((g) => g._id !== id));

    await fetch(`/api/groups/${id}`, {
      method: "DELETE",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-[#FFF7F2] p-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">ניהול קבוצות</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add group */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="שם קבוצה"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1 rounded-full border px-4 py-2 text-sm outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            className="flex items-center gap-1 rounded-full bg-[#EAD3C4] px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            הוסף
          </button>
        </div>

        {/* Groups list */}
        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {groups.length === 0 && (
            <div className="text-center text-sm text-gray-500">
              עדיין לא נוספו קבוצות
            </div>
          )}

          {groups.map((group) => (
            <div
              key={group._id}
              className="flex items-center gap-2 rounded-lg bg-white px-3 py-2"
            >
              <input
                type="text"
                value={group.name}
                onChange={(e) =>
                  handleRename(group._id, e.target.value)
                }
                className="flex-1 bg-transparent text-sm outline-none"
              />

              <button
                onClick={() => handleDelete(group._id)}
                className="text-gray-400 hover:text-red-500"
                title="מחיקת קבוצה"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-full border px-5 py-2 text-sm"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
