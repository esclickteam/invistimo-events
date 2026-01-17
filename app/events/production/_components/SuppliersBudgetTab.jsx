"use client";

import { useState } from "react";

/* ======================
   CONFIG – תחומים ותתי תחומים
====================== */

const CATEGORIES = [
  {
    id: "photo",
    name: "צילום",
    subs: ["סטילס", "וידאו", "מגנטים", "רחפן", "סושיאל"],
  },
  {
    id: "music",
    name: "מוזיקה",
    subs: ["DJ", "להקה", "נגן סקסופון", "זמר חופה"],
  },
  {
    id: "food",
    name: "אוכל ושתייה",
    subs: ["קייטרינג", "בר אלכוהול", "קינוחים"],
  },
];

/* ======================
   MOCK ספקים (בהמשך DB)
====================== */

const SUPPLIERS_DB = {
  "photo-סטילס": [
    {
      id: "s1",
      name: "עידן לוי",
      price: 8500,
      phone: "050-1234567",
      link: "https://instagram.com/idan",
    },
    {
      id: "s2",
      name: "רון צילום",
      price: 9500,
      phone: "052-7654321",
      link: "https://ronphoto.co.il",
    },
  ],
  "music-DJ": [
    {
      id: "s3",
      name: "DJ איתי",
      price: 7000,
      phone: "054-3332222",
      link: "https://instagram.com/dj_itay",
    },
  ],
};

/* ======================
   MAIN COMPONENT
====================== */

export default function SuppliersTab() {
  const [selectedRows, setSelectedRows] = useState([]);
  const [openPicker, setOpenPicker] = useState(null);

  function openSupplierPicker(rowIndex) {
    setOpenPicker(rowIndex);
  }

  function selectSupplier(rowIndex, supplier) {
    const updated = [...selectedRows];
    updated[rowIndex] = {
      ...updated[rowIndex],
      supplier,
      totalPrice: supplier.price,
    };
    setSelectedRows(updated);
    setOpenPicker(null);
  }

  function addRow(category, sub) {
    setSelectedRows((prev) => [
      ...prev,
      {
        category: category.name,
        sub,
        supplier: null,
        totalPrice: "",
        advance: "",
        balance: "",
        files: [],
      },
    ]);
  }

  function updateField(index, field, value) {
    const updated = [...selectedRows];
    updated[index][field] = value;
    setSelectedRows(updated);
  }

  return (
    <div className="space-y-10 max-w-6xl" dir="rtl">

      {/* ======================
          הוספת שורות לפי תחום
      ====================== */}
      <section className="bg-white p-5 rounded-2xl border space-y-4">
        <h3 className="font-semibold text-lg">➕ הוספת ספק לאירוע</h3>

        {CATEGORIES.map((cat) => (
          <div key={cat.id} className="flex flex-wrap gap-3">
            <span className="font-medium">{cat.name}:</span>
            {cat.subs.map((sub) => (
              <button
                key={sub}
                onClick={() => addRow(cat, sub)}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
              >
                {sub}
              </button>
            ))}
          </div>
        ))}
      </section>

      {/* ======================
          טבלת ספקים סגורים
      ====================== */}
      <section className="bg-white p-5 rounded-2xl border">
        <h3 className="font-semibold text-lg mb-4">
          📋 ספקים שנבחרו לאירוע
        </h3>

        {selectedRows.length === 0 ? (
          <p className="text-sm text-gray-500">
            עדיין לא נבחרו ספקים
          </p>
        ) : (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">תחום</th>
                <th className="p-2">תת־תחום</th>
                <th className="p-2">ספק</th>
                <th className="p-2">מחיר כולל</th>
                <th className="p-2">מקדמה</th>
                <th className="p-2">יתרה</th>
                <th className="p-2">קבצים</th>
                <th className="p-2">בחירה</th>
              </tr>
            </thead>

            <tbody>
              {selectedRows.map((row, i) => {
                const key = `${row.category === "צילום" ? "photo" : "music"}-${row.sub}`;
                const suppliers = SUPPLIERS_DB[key] || [];

                return (
                  <>
                    <tr key={i} className="border-t">
                      <td className="p-2">{row.category}</td>
                      <td className="p-2">{row.sub}</td>
                      <td className="p-2">
                        {row.supplier ? row.supplier.name : "—"}
                      </td>
                      <td className="p-2">
                        <input
                          className="border rounded px-2 py-1 w-24"
                          value={row.totalPrice}
                          onChange={(e) =>
                            updateField(i, "totalPrice", e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="border rounded px-2 py-1 w-24"
                          value={row.advance}
                          onChange={(e) =>
                            updateField(i, "advance", e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="border rounded px-2 py-1 w-24"
                          value={row.balance}
                          onChange={(e) =>
                            updateField(i, "balance", e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input type="file" multiple />
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => openSupplierPicker(i)}
                          className="px-3 py-1 border rounded text-sm"
                        >
                          {row.supplier ? "החלף ספק" : "בחר ספק"}
                        </button>
                      </td>
                    </tr>

                    {/* ======================
                        רשימת בחירה (נפתחת מהטבלה!)
                    ====================== */}
                    {openPicker === i && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="p-3">
                          <table className="w-full text-sm border">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="p-2">שם</th>
                                <th className="p-2">מחיר</th>
                                <th className="p-2">טלפון</th>
                                <th className="p-2">קישור</th>
                                <th className="p-2">בחירה</th>
                              </tr>
                            </thead>
                            <tbody>
                              {suppliers.map((s) => (
                                <tr key={s.id} className="border-t">
                                  <td className="p-2">{s.name}</td>
                                  <td className="p-2">₪{s.price}</td>
                                  <td className="p-2">{s.phone}</td>
                                  <td className="p-2">
                                    <a
                                      href={s.link}
                                      target="_blank"
                                      className="text-blue-600 underline"
                                    >
                                      קישור
                                    </a>
                                  </td>
                                  <td className="p-2">
                                    <button
                                      onClick={() =>
                                        selectSupplier(i, s)
                                      }
                                      className="bg-black text-white px-3 py-1 rounded"
                                    >
                                      בחר
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
