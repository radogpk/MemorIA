import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./mobile-agenda.css";
import { MemoriaProvider } from "@/lib/storage/store";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "memorIA - Agenda y Calendario Académico",
  description:
    "Cursos, laboratorios, pendientes e invitaciones en un espacio compartido para dos.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192x192.svg",
    apple: "/icons/icon-192x192.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101b2d",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased">
        <MemoriaProvider>
          <AppShell>{children}</AppShell>
        </MemoriaProvider>
      </body>
    </html>
  );
}
