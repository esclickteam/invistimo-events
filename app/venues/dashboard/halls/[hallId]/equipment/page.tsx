"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Package, Plus, RefreshCw } from "lucide-react";

type Equipment = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  reserved: number;
  available: number;
  notes: string;
  status: string;
};

type Assignment = {
  id: string;
  equipmentId: string;
  equipmentName: string;
  eventId: string | null;
  quantity: number;
  status: string;
  notes: string;
};

export default function VenueEquipmentPage() {
  const params = useParams<{ hallId: string }>();
  const hallId = params?.hallId || "";

  const [items, setItems] = useState<Equipment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [assignEquipmentId, setAssignEquipmentId] = useState("");
  const [assignEventId, setAssignEventId] = useState("");
  const [assignQty, setAssignQty] = useState("1");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(
          hallId
        )}/equipment?assignments=1`,
        { cache: "no-store", credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "טעינה נכשלה");
      }
      setItems(data.equipment || []);
      setAssignments(data.assignments || []);
      if (!assignEquipmentId && data.equipment?.[0]?.id) {
        setAssignEquipmentId(data.equipment[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "טעינה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hallId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hallId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const activeItems = useMemo(
    () => items.filter((i) => i.status !== "retired"),
    [items]
  );

  const createItem = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/equipment`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_item",
            name: name.trim(),
            quantity: Number(qty) || 0,
            notes,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "שמירה נכשלה");
      setName("");
      setQty("1");
      setNotes("");
      setToast("נוסף");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const assign = async () => {
    if (!assignEquipmentId || saving) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/equipment`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "assign",
            equipmentId: assignEquipmentId,
            eventId: assignEventId.trim() || undefined,
            quantity: Number(assignQty) || 1,
            status: "reserved",
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "שיוך נכשל");
      setToast("שויך");
      setAssignEventId("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שיוך נכשל");
    } finally {
      setSaving(false);
    }
  };

  const updateAssignment = async (id: string, status: string) => {
    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/equipment`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_assignment",
            assignmentId: id,
            status,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "עדכון נכשל");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "עדכון נכשל");
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-7" dir="rtl">
      <header className="mb-5 rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black text-[#9b8a73]">ניהול אולם › ציוד</div>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black">
              <Package className="text-[#b98121]" />
              ציוד ותחזוקה
            </h1>
            <p className="mt-2 text-sm font-bold text-[#7f705d]">
              מלאי אולם, שיוך לאירועים, החזרות וחריגות — scoped לאולם בלבד.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            רענון
          </button>
        </div>
      </header>

      {toast ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {toast}
        </div>
      ) : null}
      {error ? (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="mb-5 rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black">הוספת פריט</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="שם פריט"
            className="h-11 rounded-xl border border-[#eadfce] px-3 text-sm font-bold"
          />
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            type="number"
            min={0}
            placeholder="כמות"
            className="h-11 rounded-xl border border-[#eadfce] px-3 text-sm font-bold"
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="הערות"
            className="h-11 rounded-xl border border-[#eadfce] px-3 text-sm font-bold"
          />
          <button
            type="button"
            disabled={saving || !name.trim()}
            onClick={() => void createItem()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#b98121] px-4 text-sm font-black text-white disabled:opacity-40"
          >
            <Plus size={16} />
            הוסף
          </button>
        </div>
      </section>

      <section className="mb-5 rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black">מלאי</h2>
        {loading ? (
          <div className="py-10 text-center text-sm font-bold text-[#8a7b68]">טוען...</div>
        ) : activeItems.length === 0 ? (
          <div className="py-10 text-center text-sm font-bold text-[#8a7b68]">
            אין פריטי ציוד עדיין
          </div>
        ) : (
          <div className="mt-3 space-y-2 md:hidden">
            {activeItems.map((item) => (
              <article
                key={`card-${item.id}`}
                className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3"
              >
                <div className="text-sm font-black text-[#2b241c]">{item.name}</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                  <div className="rounded-xl bg-white px-2 py-2">
                    <div className="text-[#8a7b68]">כמות</div>
                    <div className="text-[#2b241c]">{item.quantity}</div>
                  </div>
                  <div className="rounded-xl bg-white px-2 py-2">
                    <div className="text-[#8a7b68]">שמור</div>
                    <div className="text-[#2b241c]">{item.reserved}</div>
                  </div>
                  <div className="rounded-xl bg-white px-2 py-2">
                    <div className="text-[#8a7b68]">זמין</div>
                    <div className="text-emerald-700">{item.available}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-3 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[700px] text-right text-sm">
              <thead>
                <tr className="border-b border-[#eadfce] text-xs font-black text-[#8a7b68]">
                  <th className="px-3 py-2">שם</th>
                  <th className="px-3 py-2">כמות</th>
                  <th className="px-3 py-2">שמור</th>
                  <th className="px-3 py-2">זמין</th>
                  <th className="px-3 py-2">הערות</th>
                </tr>
              </thead>
              <tbody>
                {activeItems.map((item) => (
                  <tr key={item.id} className="border-b border-[#f4ead9]">
                    <td className="px-3 py-3 font-black">{item.name}</td>
                    <td className="px-3 py-3 font-bold">{item.quantity}</td>
                    <td className="px-3 py-3 font-bold">{item.reserved}</td>
                    <td className="px-3 py-3 font-black text-emerald-700">
                      {item.available}
                    </td>
                    <td className="px-3 py-3 text-xs font-bold text-[#8a7b68]">
                      {item.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-5 rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black">שיוך לאירוע</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <select
            value={assignEquipmentId}
            onChange={(e) => setAssignEquipmentId(e.target.value)}
            className="h-11 rounded-xl border border-[#eadfce] px-3 text-sm font-bold"
          >
            {activeItems.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} (זמין {i.available})
              </option>
            ))}
          </select>
          <input
            value={assignEventId}
            onChange={(e) => setAssignEventId(e.target.value)}
            placeholder="eventId מאומת (אופציונלי)"
            className="h-11 rounded-xl border border-[#eadfce] px-3 text-sm font-bold"
          />
          <input
            value={assignQty}
            onChange={(e) => setAssignQty(e.target.value)}
            type="number"
            min={1}
            className="h-11 rounded-xl border border-[#eadfce] px-3 text-sm font-bold"
          />
          <button
            type="button"
            disabled={saving || !assignEquipmentId}
            onClick={() => void assign()}
            className="h-11 rounded-xl bg-[#1f1b17] px-4 text-sm font-black text-white disabled:opacity-40"
          >
            שייך / שמור
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {assignments.length === 0 ? (
            <div className="text-sm font-bold text-[#8a7b68]">אין שיוכים עדיין</div>
          ) : (
            assignments.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-4 py-3"
              >
                <div>
                  <div className="text-sm font-black">
                    {a.equipmentName || a.equipmentId} × {a.quantity}
                  </div>
                  <div className="text-xs font-bold text-[#8a7b68]">
                    {a.status}
                    {a.eventId ? ` · event ${a.eventId}` : " · ללא אירוע"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["out", "returned", "missing", "damaged"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => void updateAssignment(a.id, st)}
                      className="rounded-lg border border-[#eadfce] bg-white px-2.5 py-1 text-xs font-black"
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
