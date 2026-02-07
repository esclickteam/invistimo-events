"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import CreateClientByProducer from "@/app/components/producer/CreateClientByProducer";

export default function CreateClientModal({ open, onClose }) {
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
        <div
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
        />

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
          {/* ===== Header (קבוע, לא גולל) ===== */}
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
            <h2 className="text-lg font-semibold">
              יצירת לקוח חדש
            </h2>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ===== Body (גולל) ===== */}
          <div className="p-6 overflow-y-auto grow">
            <CreateClientByProducer onSuccess={onClose} />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
