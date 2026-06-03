import { motion } from "framer-motion";
import React from "react";

export default function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className="modal-overlay">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        className="modal-card"
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="modal-close absolute right-4 top-4 border border-white/10 bg-white/6 text-slate-100 transition hover:bg-white/12"
          >
            ×
          </button>
        )}
        {children}
      </motion.div>
    </div>
  );
}
