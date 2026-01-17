"use client";

import { useState } from "react";

const SUPPLIER_CATEGORIES = [
  {
    key: "dj",
    label: "🎧 DJ",
    suppliers: [
      {
        id: "dj1",
        name: "DJ עידו לוי",
        price: 10000,
        deposit: 3000,
        phone: "050-1234567",
        instagram: "https://instagram.com/djido",
        website: "",
      },
      {
        id: "dj2",
        name: "DJ רועי ביטון",
        price: 12000,
        deposit: 4000,
        phone: "052-7654321",
        instagram: "",
        website: "https://royedj.co.il",
      },
    ],
  },
  {
    key: "venue",
    label: "🏛️ אולם",
    suppliers: [
      {
        id: "v1",
        name: "גן האירועים עדן",
        price: 70000,
        deposit: 15000,
        phone: "03-5551234",
        instagram: "https://instagram.com/edenhall",
        website: "https://edenhall.co.il",
      },
    ],
  },
];

export default function SuppliersBudgetTab() {
  const [selectedSuppliers, setSelectedSuppliers] = useState({});

  function selectSupplier(categoryKey, supplierId) {
    setSelectedSuppliers((prev) => ({
      ...prev,
      [categoryKey]: supplierId,
    }));
  }

  return (
    <div className="space-y-8 max-w-6xl" dir="rtl">
      {SUPPLIER_CATEGORIES.map((category) => (
        <section
          key={category.key}
          className="bg-white border rounded-2xl p-6 space-y-4"
        >
          <h3 className="font-semibold text-lg">
            {category.label}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="p-3 text-right">בחירה</th>
                  <th className="p-3 text-right">שם ספק</th>
                  <th className="p-3 text-right">מחיר</th>
                  <th className="p-3 text-right">מקדמה</th>
                  <th className="p-3 text-right">יתרה</th>
                  <th className="p-3 text-right">יצירת קשר</th>
                </tr>
              </thead>

              <tbody>
                {category.suppliers.map((supplier) => {
                  const isSelected =
                    selectedSuppliers[category.key] === supplier.id;

                  return (
                    <tr
                      key={supplier.id}
                      className={`border-t hover:bg-gray-50 ${
                        isSelected ? "bg-green-50" : ""
                      }`}
                    >
                      <td className="p-3">
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() =>
                            selectSupplier(category.key, supplier.id)
                          }
                        />
                      </td>

                      <td className="p-3 font-medium">
                        {supplier.name}
                      </td>

                      <td className="p-3">
                        ₪{supplier.price.toLocaleString()}
                      </td>

                      <td className="p-3">
                        ₪{supplier.deposit.toLocaleString()}
                      </td>

                      <td className="p-3">
                        ₪
                        {(supplier.price - supplier.deposit).toLocaleString()}
                      </td>

                      <td className="p-3 flex gap-3">
                        <a
                          href={`tel:${supplier.phone}`}
                          className="text-blue-600 underline"
                        >
                          טלפון
                        </a>

                        {supplier.instagram && (
                          <a
                            href={supplier.instagram}
                            target="_blank"
                            className="text-pink-600 underline"
                          >
                            אינסטגרם
                          </a>
                        )}

                        {supplier.website && (
                          <a
                            href={supplier.website}
                            target="_blank"
                            className="text-gray-700 underline"
                          >
                            אתר
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selectedSuppliers[category.key] && (
            <div className="text-sm text-green-700 font-medium">
              ✔ ספק נבחר
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
