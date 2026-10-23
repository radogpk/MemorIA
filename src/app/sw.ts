/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkOnly } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

self.addEventListener("push", (event: PushEvent) => {
  let data: { title?: string; body?: string; url?: string; tag?: string } = {};
  try { data = event.data?.json() || {}; } catch { /* Always display a visible, safe fallback. */ }
  const url = ["/today", "/together", "/settings"].includes(data.url || "") ? data.url! : "/together";
  event.waitUntil(Promise.all([
    self.registration.showNotification(data.title || "memorIA", { body: data.body || "Tienes novedades en tu agenda.", icon: "/icons/icon-192x192.svg", tag: (data.tag || "memoria").slice(0, 200), data: { url } }),
    self.clients.matchAll({ type: "window" }).then((clients) => { clients.forEach((client) => client.postMessage({ type: "MEMORIA_REFRESH" })); }),
  ]));
});
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const path = ["/today", "/together", "/settings"].includes(event.notification.data?.url) ? event.notification.data.url : "/together";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(new URL(path, self.location.origin).href); return existing.focus(); }
    return self.clients.openWindow(path);
  }));
});
