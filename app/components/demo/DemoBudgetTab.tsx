"use client";

import { useState } from "react";
import { Plus, Trash2, CreditCard } from "lucide-react";

type BudgetItem = {
  _id: string;
  title: string;
  category: string;
  total: number;
  paid: number;
  status: "unpaid" | "partial" | "paid";
  dueDate: string;
};

type Stats = {
  totalBudget: number;
  paidAmount: number;
  remainingAmount: number;
};

type Props = {
  budgetItems: BudgetItem[];
  stats: Stats;
  addBudgetItem: (item: Omit<BudgetItem, "_id">) => void;
  updateBudgetItem: (itemId: string, payload: Partial<BudgetItem>) => void;
  deleteBudgetItem: (itemId: string) => void;
};

export default function DemoBudgetTab({
  budgetItems,
  stats,
  addBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
}: Props) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");

  const handleAdd = () => {
    const total = Number(amount);

    if (!title.trim() || !total) return;

    addBudgetItem({
      title: title.trim(),
      category: "הוצאה כללית",
      total,
      paid: 0,
      status: "unpaid",
      dueDate: "2026-09-01",
    });

    setTitle("");
    setAmount("");
  };

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="סה״כ תקציב" value={`${stats.totalBudget.toLocaleString()} ₪`} />
        <StatCard label="שולם" value={`${stats.paidAmount.toLocaleString()} ₪`} />
        <StatCard label="נותר לתשלום" value={`${stats.remainingAmount.toLocaleString()} ₪`} />
      </div>

      <div className="rounded-3xl border border-[#e6d7c8] bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-[#2f241c]">תקציב ותשלומים</h2>
            <p className="text-sm text-[#7b6a58]">
              אפשר להוסיף הוצאה ולסמן תשלום בדמו בלבד.
            </p>
          </div>

          <div className="grid gap-2 md:flex">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="שם הוצאה"
              className="rounded-2xl border border-[#d8c5b3] px-4 py-2 text-sm outline-none focus:border-[#8a5a2b]"
            />

            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="סכום"
              type="number"
              className="rounded-2xl border border-[#d8c5b3] px-4 py-2 text-sm outline-none focus:border-[#8a5a2b]"
            />

            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#8a5a2b] px-4 py-2 text-sm font-bold text-white"
            >
              <Plus size={16} />
              הוסף
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {budgetItems.map((item) => {
            const remaining = item.total - item.paid;

            return (
              <div
                key={item._id}
                className="rounded-3xl border border-[#eadccd] bg-[#fffaf5] p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-black text-[#2f241c]">{item.title}</h3>
                    <p className="text-sm text-[#7b6a58]">
                      {item.category} · לתשלום עד {item.dueDate}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm font-bold">
                    <span className="rounded-full bg-white px-3 py-1 text-[#6f4b2b]">
                      סה״כ: {item.total.toLocaleString()} ₪
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-[#6f4b2b]">
                      שולם: {item.paid.toLocaleString()} ₪
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-[#6f4b2b]">
                      נותר: {remaining.toLocaleString()} ₪
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateBudgetItem(item._id, {
                        paid: item.total,
                        status: "paid",
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c5b3] bg-white px-3 py-2 text-sm font-bold text-[#6f4b2b]"
                  >
                    <CreditCard size={16} />
                    סמן שולם
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteBudgetItem(item._id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-white px-3 py-2 text-sm font-bold text-red-600"
                  >
                    <Trash2 size={16} />
                    מחיקה
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#e6d7c8] bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-[#7b6a58]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#2f241c]">{value}</p>
    </div>
  );
}