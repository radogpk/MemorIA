"use client";
import { useState } from "react";
import { FileUp } from "lucide-react";
import { useMemoria } from "@/lib/storage/store";
import {
  buildRestorePreview,
  parseBackup,
  snapshotKey,
  type RestorePreview,
} from "@/lib/storage/restore";

const labels = {
  subjects: "Curso",
  recurrentClasses: "Sesión",
  activities: "Actividad",
  profiles: "Perfil",
};
const statuses = {
  restore: "Recuperar",
  duplicate: "Ya existe",
  conflict: "Conservar actual",
};
export function RestoreBackup() {
  const store = useMemoria();
  const [preview, setPreview] = useState<RestorePreview | null>(null),
    [message, setMessage] = useState("");
  const [fileName, setFileName] = useState(""),
    [busy, setBusy] = useState(false),
    [completed, setCompleted] = useState(0);
  const outdated = preview && preview.baseKey !== snapshotKey(store);
  return (
    <div className="restore-backup">
      <h3>Recuperar desde un respaldo</h3>
      <p className="hint">
        Revisa el archivo antes de guardar. Solo se recuperan registros que
        faltan; se conservan las versiones actuales cuando hay diferencias. Los
        perfiles y sus preferencias actuales se mantienen.
      </p>
      <label className="backup-file">
        <FileUp size={18} /> Elegir archivo de respaldo
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            setPreview(null);
            setMessage("");
            setCompleted(0);
            if (!file) return;
            setBusy(true);
            setFileName(file.name);
            try {
              if (file.size > 2_000_000)
                throw new Error("El archivo supera 2 MB.");
              const backup = parseBackup(await file.text());
              setPreview(
                buildRestorePreview(backup, store, store.activeProfile.id),
              );
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "No se pudo leer el respaldo.",
              );
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      {busy && <p role="status">Revisando archivo…</p>}
      {preview && (
        <div className="restore-preview">
          <h4>Vista previa: {fileName}</h4>
          <div className="restore-counts">
            <span>
              <strong>{preview.mutations.length}</strong> por recuperar
            </span>
            <span>
              {preview.rows.filter((r) => r.status === "duplicate").length} ya
              existen
            </span>
            <span>
              {preview.rows.filter((r) => r.status === "conflict").length} con
              diferencias o cruces
            </span>
          </div>
          <p className="hint">
            Las sesiones se vinculan al curso existente cuando es un duplicado.
            Las citas que cruzan otro compromiso o su traslado quedan fuera de
            la recuperación.
          </p>
          <details open>
            <summary>Ver registros ({preview.rows.length})</summary>
            <ul className="restore-records">
              {preview.rows.map((row, index) => (
                <li key={index}>
                  <div>
                    <span className="hint">{labels[row.table]}</span>
                    <strong>{row.title}</strong>
                    {row.reason && <span className="hint">{row.reason}</span>}
                  </div>
                  <span className={`restore-status ${row.status}`}>
                    {statuses[row.status]}
                  </span>
                </li>
              ))}
            </ul>
          </details>
          {outdated && (
            <p className="notice" role="status">
              Los datos cambiaron desde esta revisión. Actualiza la vista previa
              antes de recuperar.
            </p>
          )}
          <p className="hint">
            Al confirmar, se guarda una copia anterior en este dispositivo y los
            registros nuevos se envían juntos a la base de datos.
          </p>
          <div className="push-actions">
            <button
              className="button"
              disabled={
                !preview.mutations.length ||
                !!outdated ||
                store.syncStatus !== "saved" ||
                busy
              }
              onClick={() => {
                try {
                  store.restoreBackup(preview);
                  setCompleted(preview.mutations.length);
                  setPreview(null);
                  setMessage("");
                } catch (error) {
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : "No se pudo restaurar.",
                  );
                }
              }}
            >
              Recuperar {preview.mutations.length}{" "}
              {preview.mutations.length === 1
                ? "registro nuevo"
                : "registros nuevos"}
            </button>
            <button
              className="button secondary"
              onClick={() => {
                try {
                  setPreview(
                    buildRestorePreview(
                      preview.backup,
                      store,
                      store.activeProfile.id,
                    ),
                  );
                  setMessage("");
                } catch (e) {
                  setMessage(
                    e instanceof Error ? e.message : "No se pudo actualizar.",
                  );
                }
              }}
            >
              Actualizar vista previa
            </button>
            <button
              className="text-button"
              onClick={() => {
                setPreview(null);
                setMessage("");
              }}
            >
              Descartar archivo
            </button>
          </div>
          {store.syncStatus !== "saved" && (
            <p className="hint">
              Primero deben guardarse los cambios pendientes y recuperarse la
              conexión.
            </p>
          )}
        </div>
      )}
      {!!completed && (
        <p className="notice" role="status">
          {store.syncStatus === "saved"
            ? `Restauración guardada: ${completed} ${completed === 1 ? "registro recuperado" : "registros recuperados"}.`
            : `${completed} registros preparados en este dispositivo. Revisa el estado del guardado para confirmar su sincronización.`}
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <button
        className="text-button"
        onClick={() => {
          const saved = localStorage.getItem("memoria_before_restore");
          if (!saved) {
            setMessage(
              "Todavía no hay una copia anterior a una restauración en este dispositivo.",
            );
            return;
          }
          const url = URL.createObjectURL(
            new Blob([saved], { type: "application/json" }),
          );
          const a = document.createElement("a");
          a.href = url;
          a.download = "memoria-antes-de-restaurar.json";
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        Descargar copia anterior a la restauración
      </button>
    </div>
  );
}
