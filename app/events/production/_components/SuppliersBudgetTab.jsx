"use client";

import { useState } from "react";

/* ======================
   MOCK DATA (בהמשך DB)
====================== */

const INITIAL_CATEGORIES = [
  {
    id: "photo",
    name: "צילום",
    subcategories: [
      {
        id: "magnet",
        name: "מגנטים",
        selectedVendorId: null,
        vendors: [
          {
            id: "v1",
            name: "מגנטיקס",
            price: 7000,
            phone: "050-1234567",
            instagram: "https://instagram.com/magnetix",
            website: "",
          },
          {
            id: "v2",
            name: "פיקס מגנטים",
            price: 8500,
            phone: "050-7654321",
            instagram: "",
            website: "https://pixmagnet.co.il",
          },
        ],
      },
      {
        id: "still",
        name: "סטילס",
        selectedVendorId: null,
        vendors: [],
      },
    ],
  },
];

export default function SuppliersTab() {
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [openCategoryId, setOpenCategoryId] = useState(null);

  /* ======================
     ACTIONS
  ====================== */

  function selectVendor(categoryId, subId, vendorId) {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id !== categoryId
          ? cat
          : {
              ...cat,
              subcategories: cat.subcategories.map((sub) =>
                sub.id !== subId
                  ? sub
                  : { ...sub, selectedVendorId: vendorId }
              ),
            }
      )
    );
  }

  function toggleCategory(id) {
    setOpenCategoryId(openCategoryId === id ? null : id);
  }

  /* ======================
     RENDER
  ====================== */

  return (
    <div className="space-y-6 max-w-5xl" dir="rtl">
      <h2 className="text-xl font-semibold">📦 ספקים ותקציב</h2>

      {categories.map((category) => (
        <section
          key={category.id}
          className="border rounded-2xl bg-white p-5 space-y-4"
        >
          {/* Category Header */}
          <button
            onClick={() => toggleCategory(category.id)}
            className="w-full flex justify-between items-center"
          >
            <span className="text-lg font-semibold">{category.name}</span>
            <span className="text-sm text-gray-500">
              {openCategoryId === category.id ? "סגור" : "פתח"}
            </span>
          </button>

          {/* Subcategories */}
          {openCategoryId === category.id && (
            <div className="space-y-6 pt-2">
              {category.subcategories.map((sub) => {
                const selectedVendor = sub.vendors.find(
                  (v) => v.id === sub.selectedVendorId
                );

                return (
                  <div
                    key={sub.id}
                    className="border rounded-xl p-4 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{sub.name}</h4>

                      {selectedVendor && (
                        <span className="text-green-600 text-sm">
                          ✔ נבחר: {selectedVendor.name}
                        </span>
                      )}
                    </div>

                    {/* Vendors Table */}
                    {sub.vendors.length === 0 ? (
                      <p className="text-sm text-gray-400">
                        עדיין לא נוספו ספקים לתת־תחום זה
                      </p>
                    ) : (
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="text-gray-500">
                            <th className="text-right py-2">בחירה</th>
                            <th className="text-right">שם ספק</th>
                            <th className="text-right">מחיר</th>
                            <th className="text-right">יצירת קשר</th>
                          </tr>
                        </thead>

                        <tbody>
                          {sub.vendors.map((vendor) => (
                            <tr
                              key={vendor.id}
                              className={`border-t ${
                                vendor.id === sub.selectedVendorId
                                  ? "bg-green-50"
                                  : ""
                              }`}
                            >
                              <td className="py-2">
                                <input
                                  type="radio"
                                  checked={
                                    vendor.id === sub.selectedVendorId
                                  }
                                  onChange={() =>
                                    selectVendor(
                                      category.id,
                                      sub.id,
                                      vendor.id
                                    )
                                  }
                                />
                              </td>

                              <td>{vendor.name}</td>
                              <td>₪{vendor.price.toLocaleString()}</td>

                              <td className="space-x-2">
                                {vendor.instagram && (
                                  <a
                                    href={vendor.instagram}
                                    target="_blank"
                                    className="text-blue-600 underline"
                                  >
                                    אינסטגרם
                                  </a>
                                )}
                                {vendor.website && (
                                  <a
                                    href={vendor.website}
                                    target="_blank"
                                    className="text-blue-600 underline"
                                  >
                                    אתר
                                  </a>
                                )}
                                <span>{vendor.phone}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}

      {/* UX Hint */}
      <p className="text-xs text-gray-400">
        ניתן להוסיף תחומים, תתי־תחומים וספקים דרך ניהול מתקדם (בהמשך).
        רק ספק אחד ניתן לבחירה בכל תת־תחום.
      </p>
    </div>
  );
}
