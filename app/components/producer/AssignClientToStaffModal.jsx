"use client";

import { useEffect, useMemo, useState } from "react";

export default function AssignClientToStaffModal({ open, onClose, client, onSaved }) {
  const [staff, setStaff] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !client?._id) return;

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/producer/staff/list", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.message || "שגיאה בטעינת עובדים");

        if (!mounted) return;
        const list = Array.isArray(data.staff) ? data.staff : [];
        setStaff(list);

        const pre = new Set(
          list
            .filter((s) =>
              Array.isArray(s.assignedClientIds) &&
              s.assignedClientIds.some((id) => String(id) === String(client._id))
            )
            .map((s) => String(s._id))
        );
        setSelected(pre);
      } catch (e) {
        if (mounted) setError(e.message || "שגיאה");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, client?._id]);

  const toggle = (staffId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const id = String(staffId);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const changedMap = useMemo(() => {
    const map = new Map();
    for (const s of staff) {
      const sid = String(s._id);
      const oldIds = Array.isArray(s.assignedClientIds) ? s.assignedClientIds.map(String) : [];
      const hasBefore = oldIds.includes(String(client?._id));
      const hasAfter = selected.has(sid);
      if (hasBefore !== hasAfter) map.set(sid, { oldIds, hasAfter });
    }
    return map;
  }, [staff, selected, client?._id]);

  const save = async () => {
    try {
      setSaving(true);
      setError("");

      for (const [staffId, info] of changedMap.entries()) {
        const oldIds = info.oldIds;
        let nextIds = oldIds;

        if (info.hasAfter) {
          nextIds = Array.from(new Set([...oldIds, String(client._id)]));
        } else {
          nextIds = oldIds.filter((id) => id !== String(client._id));
        }

        const res = await fetch("/api/producer/staff/assign-clients", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffId,
            clientIds: nextIds,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || "שגיאה בשמירה");
        }
      }

      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(e.message || "שגיאה");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div style={backdrop}>
      <div style={modal}>
        <h3 style={{ marginTop: 0 }}>הקצאת עובדים ללקוח</h3>
        <p style={{ marginTop: 0, color: "#666" }}>
          לקוח: <b>{client?.name || "-"}</b> ({client?.email || "-"})
        </p>

        {loading ? (
          <p>טוען עובדים...</p>
        ) : (
          <div style={{ maxHeight: 320, overflow: "auto", border: "1px solid #eee", borderRadius: 10, padding: 8 }}>
            {staff.length === 0 ? (
              <p style={{ margin: 8 }}>אין עובדים זמינים</p>
            ) : (
              staff.map((s) => {
                const sid = String(s._id);
                const checked = selected.has(sid);
                return (
                  <label key={sid} style={row}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(sid)}
                    />
                    <span style={{ marginInlineStart: 8 }}>
                      {s.name} — {s.email}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        )}

        {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={onClose} disabled={saving}>ביטול</button>
          <button onClick={save} disabled={saving || loading}>
            {saving ? "שומר..." : "שמור הקצאה"}
          </button>
        </div>
      </div>
    </div>
  );
}

const backdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const modal = {
  width: "min(680px, 95vw)",
  background: "#fff",
  borderRadius: 14,
  padding: 16,
};

const row = {
  display: "flex",
  alignItems: "center",
  padding: "8px 6px",
  borderBottom: "1px solid #f3f3f3",
};
