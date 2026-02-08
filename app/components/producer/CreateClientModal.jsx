"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import CreateClientByProducer from "@/app/components/producer/CreateClientByProducer";
import CreateStaffByProducer from "@/app/components/producer/CreateStaffByProducer";

export default function CreateClientModal({ open, onClose, onSuccess }) {
  const [createType, setCreateType] = useState("client"); // client | producer_staff

  useEffect(() => {
    if (open) setCreateType("client");
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.96, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 20, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="
            relative
            z-10
            w-full
            max-w-xl
            bg-white
            rounded-2xl
            shadow-xl
            max-h-[90vh]
            flex
            flex-col
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
            <h2 className="text-lg font-semibold">יצירת משתמש חדש</h2>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100"
              aria-label="סגירה"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* סוג משתמש */}
          <div className="px-6 pt-4 shrink-0">
            <label className="block text-sm font-medium mb-2">סוג משתמש</label>
            <select
              value={createType}
              onChange={(e) => setCreateType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="client">לקוח</option>
              <option value="producer_staff">עובד מפיק</option>
            </select>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto grow">
            {createType === "client" ? (
              // לא נוגעים בכלל בלוגיקה של הלקוח
              <CreateClientByProducer
                onSuccess={() => {
                  onSuccess?.();
                  onClose?.();
                }}
              />
            ) : (
              <CreateStaffByProducer
                onSuccess={() => {
                  onSuccess?.();
                  onClose?.();
                }}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
