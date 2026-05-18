"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";

type Supplier = {
  _id: string;
  category: string;
  businessName: string;
  contactName: string;
  phone: string;
  status: "pending" | "confirmed" | "paid";
  price: number;
  paid: number;
  notes: string;
};

type Props = {
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, "_id">) => void;
  updateSupplier: (supplierId: string, payload: Partial<Supplier>) => void;
  deleteSupplier: (supplierId: string) => void;
};

export default function DemoSuppliersTab({
  suppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
}: Props) {
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");

  const handleAdd = () => {
    if (!businessName.trim()) return;

    addSupplier({
      category: category.trim() || "ספק כללי",
      businessName: businessName.trim(),
      contactName: "איש קשר דמו",
      phone: "050-0000000",
      status: "pending",
      price: 3000,
      paid: 0,
      notes: "ספק שנוסף בדמו בלבד.",
    });

    setBusinessName("");
    setCategory("");
  };

  return (
    <section className="rounded-3xl border border-[#e6d7c8] bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black text-[#2f241c]">ספקים</h2>
          <p className="text-sm text-[#7b6a58]">
            ניהול ספקים לדוגמה — ללא שמירה אמיתית.
          </p>
        </div>

        <div className="grid gap-2 md:flex">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="תחום ספק"
            className="rounded-2xl border border-[#d8c5b3] px-4 py-2 text-sm outline-none focus:border-[#8a5a2b]"
          />

          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="שם ספק"
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

      <div className="grid gap-3 md:grid-cols-2">
        {suppliers.map((supplier) => (
          <div
            key={supplier._id}
            className="rounded-3xl border border-[#eadccd] bg-[#fffaf5] p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#8f8478]">
                  {supplier.category}
                </p>
                <h3 className="text-lg font-black text-[#2f241c]">
                  {supplier.businessName}
                </h3>
                <p className="text-sm text-[#7b6a58]">
                  {supplier.contactName} · {supplier.phone}
                </p>
              </div>

              <StatusBadge status={supplier.status} />
            </div>

            <div className="grid gap-2 text-sm">
              <p className="font-bold text-[#6f4b2b]">
                מחיר: {supplier.price.toLocaleString()} ₪
              </p>
              <p className="font-bold text-[#6f4b2b]">
                שולם: {supplier.paid.toLocaleString()} ₪
              </p>
              <p className="text-[#7b6a58]">{supplier.notes}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  updateSupplier(supplier._id, {
                    status:
                      supplier.status === "pending"
                        ? "confirmed"
                        : supplier.status === "confirmed"
                        ? "paid"
                        : "pending",
                    paid:
                      supplier.status === "confirmed"
                        ? supplier.price
                        : supplier.paid,
                  })
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c5b3] bg-white px-3 py-2 text-sm font-bold text-[#6f4b2b]"
              >
                <CheckCircle2 size={16} />
                שנה סטטוס
              </button>

              <button
                type="button"
                onClick={() => deleteSupplier(supplier._id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-white px-3 py-2 text-sm font-bold text-red-600"
              >
                <Trash2 size={16} />
                מחיקה
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: Supplier["status"] }) {
  const label =
    status === "paid" ? "שולם" : status === "confirmed" ? "מאושר" : "בהמתנה";

  return (
    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#6f4b2b]">
      {label}
    </span>
  );
}