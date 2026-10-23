"use client";
import { useEffect, useRef, useId, ReactNode } from "react";
import { X } from "lucide-react";
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (open && d && !d.open) d.showModal();
    if (!open && d?.open) d.close();
    return () => {
      if (d?.open) d.close();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`app-dialog ${wide ? "dialog-wide" : ""}`}
      onCancel={onClose}
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header className="dialog-header">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Cerrar"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      {open && children}
    </dialog>
  );
}
