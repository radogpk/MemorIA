import type { Metadata, Viewport } from 'next';
import './globals.css';
import { MemoriaProvider } from '@/lib/storage/store';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { AppHeader } from '@/components/layout/AppHeader';

export const metadata: Metadata = {
  title: 'memorIA - Agenda y Calendario Académico',
  description: 'Gestor inteligente de actividades, horario de clases, exámenes y tareas con IA para estudiantes y académicos.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#090d16',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-blue-600/30 selection:text-blue-200">
        <MemoriaProvider>
          <div className="flex h-screen overflow-hidden bg-[#090d16]">
            {/* Desktop Sidebar */}
            <Sidebar />

            <div className="flex flex-1 flex-col overflow-hidden">
              <AppHeader />
              <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
                {children}
              </main>
              {/* Mobile Bottom Navigation */}
              <BottomNavigation />
            </div>
          </div>
        </MemoriaProvider>
      </body>
    </html>
  );
}
