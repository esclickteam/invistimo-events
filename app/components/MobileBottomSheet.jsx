"use client";

export default function MobileBottomSheet({
  open,
  title,
  onClose,
  children,
  height = "52vh",
}) {
  return (
    <>
      {/* overlay */}
      <div
        onClick={onClose}
        className={`
          md:hidden fixed inset-0 z-40
          bg-black/30 transition
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
      />

      {/* sheet */}
      <div
        className={`
          md:hidden fixed left-0 right-0 bottom-0 z-50
          bg-white rounded-t-2xl
          border-t border-gray-200
          transition-transform duration-200
          pb-[env(safe-area-inset-bottom)]
          ${open ? "translate-y-0" : "translate-y-full"}
        `}
        style={{ height }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold text-gray-800">{title}</div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900"
          >
            סגור
          </button>
        </div>

        <div className="h-full overflow-auto p-4">{children}</div>
      </div>
    </>
  );
}
