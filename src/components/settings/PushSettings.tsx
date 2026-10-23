"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { useMemoria } from "@/lib/storage/store";
type Credentials = { id: string; token: string };
const key = "memoria_push_device";
function credentials(create = false): Credentials | null {
  try { const saved = JSON.parse(localStorage.getItem(key) || "null"); if (saved?.id && saved?.token) return saved; } catch { /* Create only after an explicit action. */ }
  if (!create) return null;
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const value = { id: crypto.randomUUID(), token: btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "") };
  localStorage.setItem(key, JSON.stringify(value)); return value;
}
const api = async (method: string, body?: object) => {
  const identity = credentials();
  const response = await fetch("/api/push", { method, cache: "no-store", headers: { "Content-Type": "application/json", ...(identity ? { "x-device-id": identity.id, "x-device-token": identity.token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || "No se pudo configurar el aviso."); return data;
};
export function PushSettings() {
  const { activeProfile, profiles } = useMemoria();
  const [config, setConfig] = useState<{ configured: boolean; publicKey: string; device: { profile_id: string; reminder_minutes: number } | null } | null>(null);
  const [minutes, setMinutes] = useState(15), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [supported, setSupported] = useState(false);
  async function refresh() { const data = await api("GET"); setConfig(data); if (data.device) setMinutes(data.device.reminder_minutes); }
  useEffect(() => { setSupported(window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window); void refresh().catch((e) => setMessage(e.message)); }, [activeProfile.id]);
  const belongs = config?.device?.profile_id === activeProfile.id;
  async function activate() {
    setBusy(true); setMessage("");
    try {
      if (!config?.configured) throw new Error("Los avisos están pendientes de configurar en el servidor.");
      // Called directly by the user's click; never request permission on load.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Los avisos no están permitidos. Puedes habilitarlos en la configuración de este sitio.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const publicKey = Uint8Array.from(atob(config.publicKey.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - config.publicKey.length % 4) % 4)), (c) => c.charCodeAt(0));
      let subscription = await registration.pushManager.getSubscription();
      if (!credentials() && subscription) { await subscription.unsubscribe(); subscription = null; }
      subscription ||= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey });
      await api("POST", { ...credentials(true), profile_id: activeProfile.id, reminder_minutes: minutes, subscription: subscription.toJSON() });
      await refresh(); setMessage(`Avisos vinculados a ${activeProfile.name} en este dispositivo.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : "No se pudieron activar los avisos."); }
    finally { setBusy(false); }
  }
  async function disable() {
    setBusy(true); setMessage("");
    try { await api("DELETE", credentials()!); const registration = await navigator.serviceWorker.getRegistration(); await (await registration?.pushManager.getSubscription())?.unsubscribe(); await refresh(); setMessage("Avisos desactivados en este dispositivo."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "No se pudo desactivar."); } finally { setBusy(false); }
  }
  return <section className="settings-section" aria-labelledby="push-heading">
    <h2 id="push-heading"><Bell size={20} /> Avisos en este dispositivo</h2>
    <p>Invitaciones, respuestas y recordatorios de {activeProfile.name}, incluso con la app cerrada. Cambiar de perfil no cambia a quién pertenecen los avisos de este dispositivo.</p>
    {!supported && <p className="notice">Este navegador no ofrece avisos push o no usa una conexión segura. Abre la app publicada en HTTPS desde el navegador de tu celular.</p>}
    {config && !config.configured && <p className="notice">El servidor aún necesita activar sus claves de avisos y el programador de recordatorios.</p>}
    {config?.device && <p className="hint">Actualmente vinculado a {profiles.find((p) => p.id === config.device!.profile_id)?.name || "otro perfil"}.</p>}
    <label className="reminder-setting">Recordarme antes<select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>{[5, 10, 15, 30, 60].map((n) => <option value={n} key={n}>{n} minutos</option>)}</select></label>
    <div className="push-actions">
      <button className="button" onClick={activate} disabled={busy || !supported || !config?.configured}>{belongs ? "Guardar preferencias" : `Activar para ${activeProfile.name}`}</button>
      {config?.device && <><button className="button secondary" disabled={busy || !supported} onClick={async () => { setBusy(true); try { await api("POST", { ...credentials(), action: "test" }); setMessage("Aviso de prueba enviado. Revisa las notificaciones del dispositivo."); } catch (e) { setMessage(e instanceof Error ? e.message : "No se pudo enviar."); } finally { setBusy(false); } }}>Probar aviso</button><button className="text-button" disabled={busy} onClick={disable}><BellOff size={16} /> Desactivar</button></>}
    </div>
    <p className="hint">Los recordatorios requieren que el servicio de la nube y su programador estén activos. En iPhone, abre la app desde la pantalla de inicio para habilitar push.</p>
    {message && <p className="notice" role="status">{message}</p>}
  </section>;
}
