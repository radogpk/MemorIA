"use client";
import { useState, useEffect } from "react";
import { Download, Database, RefreshCw } from "lucide-react";
import { useMemoria } from "@/lib/storage/store";
import { PushSettings } from "@/components/settings/PushSettings";
import { AcademicSettings } from "@/components/settings/AcademicSettings";
import { RestoreBackup } from "@/components/settings/RestoreBackup";
export default function SettingsPage() {
  const {
    profiles,
    subjects,
    recurrentClasses,
    activities,
    engine,
    syncStatus,
    syncError,
    pendingCount,
    retrySync,
    activeProfile,
    updateProfile,
  } = useMemoria();
  const [nickname, setNickname] = useState(
    activeProfile.nickname || activeProfile.name,
  );
  const [message, setMessage] = useState("");
  useEffect(() => {
    setNickname(activeProfile.nickname || activeProfile.name);
    setMessage("");
  }, [activeProfile.id]);
  function backup() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version: 4,
            exported_at: new Date().toISOString(),
            rejected_changes: JSON.parse(
              localStorage.getItem("memoria_rejected_changes") || "[]",
            ),
            snapshot: { profiles, subjects, recurrentClasses, activities },
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memoria-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="page settings-page">
      <div className="page-heading">
        <div>
          <h1>Tus datos, a la vista.</h1>
          <p>
            Consulta el guardado y conserva una copia del espacio compartido.
          </p>
        </div>
      </div>
      <section className="settings-section">
        <div className="section-heading">
          <h2>
            <Database size={20} /> Almacenamiento
          </h2>
          <span className="response-state accepted">
            {engine === "sqlite"
              ? "Base local del servidor"
              : engine === "supabase"
                ? "Supabase"
                : "Conectando"}
          </span>
        </div>
        <p>
          {engine === "sqlite"
            ? "Los dos perfiles usan la misma base persistente en este servidor. Para compartir entre dispositivos, ambos deben abrir la misma dirección con el servidor encendido."
            : "Los datos de ambos perfiles se guardan en el proyecto Supabase configurado en el servidor."}
        </p>
        <p className="hint">
          {pendingCount} cambios pendientes.{" "}
          {syncStatus === "saved"
            ? "Todo guardado."
            : syncStatus === "syncing"
              ? "Guardando…"
              : "Comprueba la conexión."}
        </p>
        {syncError && <p className="notice error">{syncError}</p>}
        <button className="button secondary" onClick={() => void retrySync()}>
          <RefreshCw size={16} /> Comprobar sincronización
        </button>
      </section>
      <PushSettings />
      <AcademicSettings key={activeProfile.id} />
      <section className="settings-section">
        <h2>Respaldo del espacio</h2>
        <p>
          Descarga cursos, sesiones, actividades e invitaciones de ambos
          perfiles en un archivo JSON. Incluye los cambios que aún no se han
          sincronizado.
        </p>
        <button className="button" onClick={backup}>
          <Download size={17} /> Descargar respaldo
        </button>
        <RestoreBackup key={activeProfile.id} />
      </section>
      <section className="settings-section">
        <h2>Tu perfil</h2>
        <form
          className="profile-edit"
          key={activeProfile.id}
          onSubmit={(e) => {
            e.preventDefault();
            try {
              updateProfile(activeProfile.id, {
                nickname: nickname.trim() || activeProfile.name,
              });
              setMessage("Apodo guardado.");
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : "No se pudo guardar.",
              );
            }
          }}
        >
          <label>
            Apodo de {activeProfile.name}
            <input
              aria-label="Apodo"
              maxLength={60}
              defaultValue={activeProfile.nickname || activeProfile.name}
              onChange={(e) => setNickname(e.target.value)}
            />
          </label>
          <button className="button secondary">Guardar apodo</button>
        </form>
        <p className="hint" role="status">
          {message}
        </p>
      </section>
    </div>
  );
}
