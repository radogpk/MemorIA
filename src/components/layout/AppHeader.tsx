"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Plus, Settings, CloudCheck, CloudOff, RefreshCw } from "lucide-react";
import { useMemoria } from "@/lib/storage/store";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { QuickAddModal } from "@/components/ai/QuickAddModal";
import { ActivityModal } from "@/components/tasks/ActivityModal";
export function AppHeader() {
  const [open, setOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const path = usePathname();
  const {
    syncStatus,
    syncError,
    engine,
    pendingCount,
    retrySync,
    hasRejectedChange,
    discardRejectedChange,
  } = useMemoria();
  useEffect(() => {
    const trigger = () => setOpen(true);
    const shortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("memoria:quick-add", trigger);
    window.addEventListener("keydown", shortcut);
    return () => {
      window.removeEventListener("memoria:quick-add", trigger);
      window.removeEventListener("keydown", shortcut);
    };
  }, []);
  const status =
    syncStatus === "saved"
      ? engine === "sqlite"
        ? "Guardado en servidor local"
        : "Sincronizado en la nube"
      : syncStatus === "syncing"
        ? `Guardando${pendingCount ? ` ${pendingCount} cambio(s)` : ""}…`
        : syncStatus === "loading"
          ? "Conectando…"
          : "Cambios en este dispositivo";
  return (
    <>
      <header className="app-header">
        <div className="header-context">
          <Link className="mobile-brand" href="/today">
            memorIA
          </Link>
          <span className="route-title">
            {path === "/today"
              ? "Tu espacio académico"
              : path === "/calendar"
                ? "Agenda"
                : path === "/subjects"
                  ? "Cursos y sesiones"
                  : path.startsWith("/together")
                    ? "Espacio compartido"
                    : "Pendientes"}
          </span>
        </div>
        <div className="header-controls">
          <Link
            href="/settings"
            aria-label="Ver estado del guardado y respaldos"
            className={`save-status ${syncStatus === "error" ? "has-error" : ""}`}
            title={status}
          >
            {syncStatus === "saved" ? (
              <CloudCheck size={15} />
            ) : syncStatus === "error" || syncStatus === "offline" ? (
              <CloudOff size={15} />
            ) : (
              <RefreshCw size={15} />
            )}
            <span aria-live="polite">{status}</span>
          </Link>
          <ProfileSwitcher />
          <Link
            href="/settings"
            className="icon-button header-settings"
            aria-label={`Ajustes. ${status}`}
            title={status}
          >
            <Settings size={20} />
            <span
              className={`header-sync-dot ${syncStatus === "saved" ? "" : "unsaved"}`}
              aria-hidden="true"
            />
          </Link>
          <button
            className="button small global-add"
            onClick={() =>
              path === "/calendar"
                ? window.dispatchEvent(
                    new Event("memoria:add-calendar-activity"),
                  )
                : setManualOpen(true)
            }
          >
            <Plus size={21} />
            <span>Añadir</span>
          </button>
        </div>
      </header>
      {syncError && (
        <div className="sync-notice" role="alert">
          <span>{syncError}</span>
          <button className="text-button" onClick={() => void retrySync()}>
            Reintentar
          </button>
          {hasRejectedChange && (
            <button className="text-button" onClick={discardRejectedChange}>
              Descartar cambio rechazado y recargar
            </button>
          )}
        </div>
      )}
      <QuickAddModal isOpen={open} onClose={() => setOpen(false)} />
      <ActivityModal
        isOpen={manualOpen}
        onClose={() => setManualOpen(false)}
        onOpenQuickAdd={() => setOpen(true)}
      />
    </>
  );
}
