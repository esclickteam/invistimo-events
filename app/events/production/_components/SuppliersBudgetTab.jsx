"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  Fragment,
} from "react";

import {
  ChevronDown,
  Plus,
  Sparkles,
  Wallet,
  Receipt,
  Camera,
  Music2,
  Building2,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

const CATEGORY_ICONS = {
  "צילום": Camera,
  "מוזיקה ובידור": Music2,
  "אולם ואוכל": Building2,
};

export default function SuppliersTab({ eventId }) {
  const [categories, setCategories] = useState([]);
  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(true);

  const [openAddModal, setOpenAddModal] = useState(false);

  const [expandedCategory, setExpandedCategory] =
    useState(null);

  const [compareModal, setCompareModal] =
    useState(null);

  const [previewFile, setPreviewFile] = useState(null);

  const supplierNameTimeout = useRef(null);

  /* ======================
     LOAD
  ====================== */

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const [catsRes, rowsRes] = await Promise.all([
          fetch("/api/suppliers/categories"),
          fetch(`/api/events/${eventId}/suppliers`),
        ]);

        const cats = await catsRes.json();
        const eventSuppliers = await rowsRes.json();

        setCategories(cats);

        setRows(
          eventSuppliers.map((r) => ({
            id: r._id,
            categoryId: r.categoryId,
            category: r.category,
            sub: r.sub,

            supplierName: r.supplierName || "",
            supplierId: r.supplierId || null,

            price: r.price || 0,
            advance: r.advance || 0,
            balance: r.balance || 0,

            notes: r.notes || "",

            files: r.files || [],
          }))
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [eventId]);

  /* ======================
     SUMMARY
  ====================== */

  const summary = useMemo(() => {
    const total = rows.reduce(
      (sum, r) => sum + Number(r.price || 0),
      0
    );

    const paid = rows.reduce(
      (sum, r) => sum + Number(r.advance || 0),
      0
    );

    return {
      total,
      paid,
      balance: total - paid,
      count: rows.length,
    };
  }, [rows]);

  /* ======================
     GROUP BY CATEGORY
  ====================== */

  const grouped = useMemo(() => {
    const map = {};

    rows.forEach((r) => {
      if (!map[r.category]) {
        map[r.category] = [];
      }

      map[r.category].push(r);
    });

    return map;
  }, [rows]);

  /* ======================
     ADD ROW
  ====================== */

  async function addRow({
    categoryId,
    categoryName,
    sub,
  }) {
    const res = await fetch(
      `/api/events/${eventId}/suppliers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId,
          category: categoryName,
          sub,
        }),
      }
    );

    const created = await res.json();

    setRows((prev) => [
      ...prev,
      {
        id: created._id,
        categoryId,
        category: categoryName,
        sub,

        supplierName: "",
        supplierId: null,

        price: 0,
        advance: 0,
        balance: 0,

        notes: "",

        files: [],
      },
    ]);
  }

  /* ======================
     UPDATE
  ====================== */

  async function updateRow(
    rowId,
    field,
    value
  ) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;

        const updated = {
          ...r,
          [field]: value,
        };

        if (
          field === "price" ||
          field === "advance"
        ) {
          updated.balance = Math.max(
            Number(updated.price || 0) -
              Number(updated.advance || 0),
            0
          );
        }

        return updated;
      })
    );

    await fetch(
      `/api/events/${eventId}/suppliers/${rowId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [field]: value,
        }),
      }
    );
  }

  /* ======================
     REMOVE
  ====================== */

  async function removeRow(rowId) {
    setRows((prev) =>
      prev.filter((r) => r.id !== rowId)
    );

    await fetch(
      `/api/events/${eventId}/suppliers/${rowId}`,
      {
        method: "DELETE",
      }
    );
  }

  /* ======================
     FILES
  ====================== */

  async function handleFiles(rowId, fileList) {
    if (!fileList?.length) return;

    const formData = new FormData();

    Array.from(fileList).forEach((f) =>
      formData.append("files", f)
    );

    const res = await fetch(
      `/api/events/${eventId}/suppliers/${rowId}/files`,
      {
        method: "POST",
        body: formData,
      }
    );

    const savedFiles = await res.json();

    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, files: savedFiles }
          : r
      )
    );
  }

  /* ======================
     SELECT SUPPLIER
  ====================== */

  async function selectSupplier(
    row,
    supplier
  ) {
    const updated = {
      supplierId: supplier._id,
      supplierName: supplier.name,
      price: supplier.basePrice || 0,
      advance: 0,
      balance: supplier.basePrice || 0,
    };

    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              ...updated,
            }
          : r
      )
    );

    await fetch(
      `/api/events/${eventId}/suppliers/${row.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updated),
      }
    );

    setCompareModal(null);
  }

  if (loading) {
    return (
      <div className="py-32 text-center text-gray-400">
        טוען ספקים...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-8"
    >
      {/* MAIN */}
      <main className="space-y-8">

        {/* HERO */}
        <section
          className="
            rounded-[36px]
            border
            border-white/60
            bg-white/80
            backdrop-blur-xl
            p-7
            shadow-[0_20px_60px_rgba(124,58,237,0.08)]
          "
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="
                    h-14
                    w-14
                    rounded-2xl
                    bg-gradient-to-br
                    from-violet-500
                    to-purple-400
                    flex
                    items-center
                    justify-center
                    text-white
                    shadow-lg
                  "
                >
                  <Sparkles size={24} />
                </div>

                <div>
                  <p className="text-sm text-purple-600 font-semibold">
                    Supplier Workspace
                  </p>

                  <h1 className="text-3xl font-black text-[#1E1B2E]">
                    ספקים לאירוע
                  </h1>
                </div>
              </div>

              <p className="text-gray-500">
                ניהול ספקים, תשלומים, חוזים,
                קבצים והשוואות מחיר במקום אחד.
              </p>
            </div>

            <button
              onClick={() =>
                setOpenAddModal(true)
              }
              className="
                rounded-2xl
                bg-gradient-to-r
                from-violet-600
                to-purple-500
                text-white
                px-6
                py-4
                font-bold
                shadow-[0_15px_40px_rgba(124,58,237,0.25)]
                hover:-translate-y-1
                transition
              "
            >
              <div className="flex items-center gap-2">
                <Plus size={18} />
                הוסף ספק / תחום
              </div>
            </button>
          </div>
        </section>

        {/* SUMMARY */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">

          <SummaryCard
            title="ספקים"
            value={summary.count}
            icon={<Sparkles size={20} />}
          />

          <SummaryCard
            title="התחייבויות"
            value={`₪${summary.total.toLocaleString()}`}
            icon={<Receipt size={20} />}
          />

          <SummaryCard
            title="שולם"
            value={`₪${summary.paid.toLocaleString()}`}
            icon={<Wallet size={20} />}
          />

          <SummaryCard
            title="יתרה"
            value={`₪${summary.balance.toLocaleString()}`}
            icon={<AlertCircle size={20} />}
          />
        </div>

        {/* CATEGORIES */}
        <div className="space-y-5">

          {Object.entries(grouped).map(
            ([category, items]) => {
              const Icon =
                CATEGORY_ICONS[category] ||
                Sparkles;

              const open =
                expandedCategory === category;

              return (
                <section
                  key={category}
                  className="
                    rounded-[30px]
                    border
                    border-white/60
                    bg-white/80
                    backdrop-blur-xl
                    overflow-hidden
                    shadow-[0_18px_50px_rgba(124,58,237,0.06)]
                  "
                >
                  {/* HEADER */}
                  <button
                    onClick={() =>
                      setExpandedCategory(
                        open ? null : category
                      )
                    }
                    className="
                      w-full
                      px-7
                      py-6
                      flex
                      items-center
                      justify-between
                    "
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="
                          h-14
                          w-14
                          rounded-2xl
                          bg-purple-50
                          flex
                          items-center
                          justify-center
                          text-violet-600
                        "
                      >
                        <Icon size={24} />
                      </div>

                      <div className="text-right">
                        <h2 className="text-xl font-black text-[#1E1B2E]">
                          {category}
                        </h2>

                        <p className="text-sm text-gray-500 mt-1">
                          {items.length} ספקים
                        </p>
                      </div>
                    </div>

                    <ChevronDown
                      className={`transition ${
                        open
                          ? "rotate-180"
                          : ""
                      }`}
                    />
                  </button>

                  {/* BODY */}
                  {open && (
                    <div className="px-7 pb-7 space-y-5">

                      {items.map((row) => (
                        <SupplierCard
                          key={row.id}
                          row={row}
                          onUpdate={updateRow}
                          onRemove={removeRow}
                          onFiles={handleFiles}
                          onCompare={() =>
                            setCompareModal(row)
                          }
                          setPreviewFile={
                            setPreviewFile
                          }
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            }
          )}
        </div>
      </main>

      {/* SIDEBAR */}
      <aside className="space-y-6">

        <div
          className="
            sticky
            top-24
            rounded-[32px]
            border
            border-white/60
            bg-white/80
            backdrop-blur-xl
            p-6
            shadow-[0_20px_60px_rgba(124,58,237,0.08)]
          "
        >
          <h3 className="text-xl font-black text-[#1E1B2E]">
            מצב ספקים
          </h3>

          <div className="mt-6 space-y-4">

            <StatusRow
              label="ספקים"
              value={summary.count}
            />

            <StatusRow
              label="שולם"
              value={`₪${summary.paid.toLocaleString()}`}
            />

            <StatusRow
              label="יתרה"
              value={`₪${summary.balance.toLocaleString()}`}
            />
          </div>

          <div
            className="
              mt-8
              rounded-2xl
              bg-gradient-to-br
              from-violet-50
              to-purple-50
              border
              border-purple-100
              p-4
            "
          >
            <p className="font-bold text-[#1E1B2E]">
              💡 המלצה חכמה
            </p>

            <p className="text-sm text-gray-600 mt-2 leading-6">
              מומלץ להעלות חוזים וקבצים לכל
              ספק כדי לשמור הכל מסודר במקום
              אחד.
            </p>
          </div>
        </div>
      </aside>

      {/* ADD MODAL */}
      {openAddModal && (
        <AddSupplierModal
          categories={categories}
          onClose={() =>
            setOpenAddModal(false)
          }
          onAdd={(data) => {
            addRow(data);
            setOpenAddModal(false);
          }}
        />
      )}

      {/* COMPARE MODAL */}
      {compareModal && (
        <SupplierCompareModal
          row={compareModal}
          onClose={() =>
            setCompareModal(null)
          }
          onSelect={(supplier) =>
            selectSupplier(
              compareModal,
              supplier
            )
          }
        />
      )}

      {/* FILE PREVIEW */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() =>
            setPreviewFile(null)
          }
        />
      )}
    </div>
  );
}

/* ========================= */

function SummaryCard({
  title,
  value,
  icon,
}) {
  return (
    <div
      className="
        rounded-[28px]
        border
        border-white/60
        bg-white/80
        backdrop-blur-xl
        p-5
        shadow-[0_15px_40px_rgba(124,58,237,0.06)]
      "
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {title}
          </p>

          <h3 className="text-2xl font-black mt-2 text-[#1E1B2E]">
            {value}
          </h3>
        </div>

        <div
          className="
            h-12
            w-12
            rounded-2xl
            bg-purple-50
            flex
            items-center
            justify-center
            text-violet-600
          "
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ========================= */

function SupplierCard({
  row,
  onUpdate,
  onRemove,
  onFiles,
  onCompare,
  setPreviewFile,
}) {
  const paymentStatus =
    Number(row.balance || 0) === 0
      ? "paid"
      : Number(row.advance || 0) > 0
      ? "partial"
      : "unpaid";

  return (
    <div
      className="
        rounded-[28px]
        border
        border-gray-100
        bg-white
        p-6
        space-y-5
      "
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <div>
          <p className="text-sm text-gray-500">
            {row.sub}
          </p>

          <h3 className="text-xl font-black text-[#1E1B2E] mt-1">
            {row.supplierName ||
              "לא נבחר ספק"}
          </h3>
        </div>

        <div className="flex items-center gap-3 flex-wrap">

          <button
            onClick={onCompare}
            className="
              rounded-xl
              bg-purple-50
              text-purple-700
              border
              border-purple-100
              px-4
              py-2
              text-sm
              font-semibold
            "
          >
            השווה ספקים
          </button>

          <button
            onClick={() =>
              onRemove(row.id)
            }
            className="
              rounded-xl
              bg-red-50
              text-red-600
              border
              border-red-100
              px-4
              py-2
              text-sm
              font-semibold
            "
          >
            הסר
          </button>
        </div>
      </div>

      {/* STATUS */}
      <div className="flex items-center gap-3">

        {paymentStatus === "paid" && (
          <Badge
            color="green"
            text="שולם מלא"
          />
        )}

        {paymentStatus === "partial" && (
          <Badge
            color="yellow"
            text="מקדמה שולמה"
          />
        )}

        {paymentStatus === "unpaid" && (
          <Badge
            color="red"
            text="לא שולם"
          />
        )}
      </div>

      {/* FINANCIAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <MoneyField
          label="מחיר"
          value={row.price}
          onChange={(v) =>
            onUpdate(row.id, "price", v)
          }
        />

        <MoneyField
          label="מקדמה"
          value={row.advance}
          onChange={(v) =>
            onUpdate(row.id, "advance", v)
          }
        />

        <MoneyField
          label="יתרה"
          value={row.balance}
          disabled
        />
      </div>

      {/* FILES */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-[#1E1B2E]">
            קבצים וחוזים
          </p>

          <label
            className="
              cursor-pointer
              rounded-xl
              bg-black
              text-white
              px-4
              py-2
              text-sm
            "
          >
            <div className="flex items-center gap-2">
              <Upload size={16} />
              העלאת קובץ
            </div>

            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) =>
                onFiles(
                  row.id,
                  e.target.files
                )
              }
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">

          {row.files?.length === 0 && (
            <div className="text-sm text-gray-400">
              עדיין לא הועלו קבצים
            </div>
          )}

          {row.files?.map((file, idx) => (
            <button
              key={idx}
              onClick={() =>
                setPreviewFile(file)
              }
              className="
                rounded-2xl
                border
                border-gray-200
                bg-gray-50
                px-4
                py-3
                text-sm
                hover:bg-gray-100
                transition
              "
            >
              📎 {file.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========================= */

function AddSupplierModal({
  categories,
  onClose,
  onAdd,
}) {
  const [customMode, setCustomMode] =
    useState(false);

  const [categoryId, setCategoryId] =
    useState("");

  const [sub, setSub] = useState("");

  const [customCategory, setCustomCategory] =
    useState("");

  const [customSub, setCustomSub] =
    useState("");

  const category = categories.find(
    (c) => c._id === categoryId
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

      <div className="bg-white rounded-[32px] w-full max-w-xl p-8 space-y-6">

        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black text-[#1E1B2E]">
            הוספת ספק / תחום
          </h3>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        {!customMode ? (
          <>
            <select
              className="w-full rounded-2xl border border-gray-200 p-4"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSub("");
              }}
            >
              <option value="">
                בחר תחום
              </option>

              {categories.map((c) => (
                <option
                  key={c._id}
                  value={c._id}
                >
                  {c.name}
                </option>
              ))}
            </select>

            {category && (
              <select
                className="w-full rounded-2xl border border-gray-200 p-4"
                value={sub}
                onChange={(e) =>
                  setSub(e.target.value)
                }
              >
                <option value="">
                  בחר תת תחום
                </option>

                {category.subs.map((s) => (
                  <option
                    key={s}
                    value={s}
                  >
                    {s}
                  </option>
                ))}
              </select>
            )}
          </>
        ) : (
          <>
            <input
              className="w-full rounded-2xl border border-gray-200 p-4"
              placeholder="תחום מותאם אישית"
              value={customCategory}
              onChange={(e) =>
                setCustomCategory(
                  e.target.value
                )
              }
            />

            <input
              className="w-full rounded-2xl border border-gray-200 p-4"
              placeholder="תת תחום"
              value={customSub}
              onChange={(e) =>
                setCustomSub(
                  e.target.value
                )
              }
            />
          </>
        )}

        <button
          onClick={() =>
            setCustomMode(!customMode)
          }
          className="text-sm text-purple-600 font-semibold"
        >
          {customMode
            ? "חזור לרשימת תחומים"
            : "+ תחום מותאם אישית"}
        </button>

        <div className="flex justify-end gap-3">

          <button
            onClick={onClose}
            className="px-5 py-3"
          >
            ביטול
          </button>

          <button
            onClick={() => {
              if (!customMode) {
                if (!category || !sub)
                  return;

                onAdd({
                  categoryId: category._id,
                  categoryName:
                    category.name,
                  sub,
                });

                return;
              }

              if (
                !customCategory ||
                !customSub
              )
                return;

              onAdd({
                categoryId: "custom",
                categoryName:
                  customCategory,
                sub: customSub,
              });
            }}
            className="
              rounded-2xl
              bg-black
              text-white
              px-6
              py-3
              font-semibold
            "
          >
            הוסף
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================= */

function SupplierCompareModal({
  row,
  onClose,
  onSelect,
}) {
  const [suppliers, setSuppliers] =
    useState([]);

  useEffect(() => {
    fetch(
      `/api/suppliers?category=${row.category}&sub=${row.sub}`
    )
      .then((r) => r.json())
      .then(setSuppliers);
  }, [row]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

      <div className="bg-white rounded-[32px] w-full max-w-5xl p-8">

        <div className="flex items-center justify-between mb-8">

          <div>
            <h3 className="text-3xl font-black text-[#1E1B2E]">
              השוואת ספקים
            </h3>

            <p className="text-gray-500 mt-2">
              {row.category} · {row.sub}
            </p>
          </div>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {suppliers.map((s) => (
            <div
              key={s._id}
              className="
                rounded-[28px]
                border
                border-gray-200
                p-6
                space-y-5
              "
            >
              <div>
                <h3 className="text-xl font-black text-[#1E1B2E]">
                  {s.name}
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  {s.phone}
                </p>
              </div>

              <div className="space-y-3 text-sm">

                <div className="flex justify-between">
                  <span className="text-gray-500">
                    מחיר
                  </span>

                  <span className="font-bold">
                    ₪
                    {Number(
                      s.basePrice || 0
                    ).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">
                    דירוג
                  </span>

                  <span className="font-bold">
                    ⭐ 4.9
                  </span>
                </div>
              </div>

              <button
                onClick={() =>
                  onSelect(s)
                }
                className="
                  w-full
                  rounded-2xl
                  bg-gradient-to-r
                  from-violet-600
                  to-purple-500
                  text-white
                  py-3
                  font-bold
                "
              >
                בחר ספק
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========================= */

function MoneyField({
  label,
  value,
  onChange,
  disabled,
}) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-2">
        {label}
      </p>

      <input
        disabled={disabled}
        value={value}
        onChange={(e) =>
          onChange?.(e.target.value)
        }
        className="
          w-full
          rounded-2xl
          border
          border-gray-200
          bg-white/80
          px-4
          py-3
          outline-none
          focus:border-purple-300
          focus:ring-4
          focus:ring-purple-100
          disabled:bg-gray-50
        "
      />
    </div>
  );
}

/* ========================= */

function Badge({ color, text }) {
  const styles = {
    green:
      "bg-green-50 text-green-700 border-green-100",
    yellow:
      "bg-yellow-50 text-yellow-700 border-yellow-100",
    red:
      "bg-red-50 text-red-700 border-red-100",
  };

  return (
    <div
      className={`rounded-full border px-4 py-2 text-sm font-semibold ${styles[color]}`}
    >
      {text}
    </div>
  );
}

/* ========================= */

function StatusRow({
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">
        {label}
      </span>

      <span className="font-bold text-[#1E1B2E]">
        {value}
      </span>
    </div>
  );
}

/* ========================= */

function FilePreviewModal({
  file,
  onClose,
}) {
  const name = file?.name || "קובץ";
  const url = file?.url;

  const isPdf =
    (file?.type || "").includes("pdf") ||
    name.toLowerCase().endsWith(".pdf");

  const isImage =
    (file?.type || "").startsWith("image/");

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">

      <div className="bg-white w-full max-w-6xl rounded-[32px] overflow-hidden">

        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="font-bold truncate">
            {name}
          </div>

          <button
            onClick={onClose}
            className="
              rounded-xl
              bg-black
              text-white
              px-4
              py-2
            "
          >
            סגור
          </button>
        </div>

        <div className="h-[80vh] bg-gray-50 flex items-center justify-center">

          {isPdf ? (
            <button
              onClick={() =>
                window.open(
                  url,
                  "_blank"
                )
              }
              className="
                rounded-2xl
                bg-black
                text-white
                px-6
                py-4
              "
            >
              פתח PDF
            </button>
          ) : isImage ? (
            <img
              src={url}
              alt={name}
              className="max-h-full max-w-full"
            />
          ) : (
            <button
              onClick={() =>
                window.open(
                  url,
                  "_blank"
                )
              }
              className="
                rounded-2xl
                bg-black
                text-white
                px-6
                py-4
              "
            >
              פתח קובץ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}