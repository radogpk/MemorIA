"use client";
import { ArrowRight } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useMemoria } from "@/lib/storage/store";
import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";
import { BottomNavigation } from "./BottomNavigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    isLoaded,
    hasSelectedProfile,
    profiles,
    setActiveProfile,
    activeProfile,
  } = useMemoria();
  const router = useRouter();
  const path = usePathname();
  if (!isLoaded)
    return (
      <main className="profile-entry">
        <p role="status">Preparando tu espacio…</p>
      </main>
    );
  if (!hasSelectedProfile)
    return (
      <main className="profile-entry">
        <div className="profile-entry-content">
          <span className="entry-wordmark">
            memorIA<span aria-hidden="true">.</span>
          </span>
          <h1>¿Quién va a entrar?</h1>
          <p>
            Elige tu perfil para ver tus cursos y pendientes, responder
            invitaciones y organizar planes juntos.
          </p>
          <div className="profile-choices">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                className="profile-choice"
                onClick={() => {
              router.replace(path === "/together" ? "/together" : "/today");
                  setActiveProfile(profile);
                }}
              >
                <span
                  className="entry-avatar"
                  style={{ background: profile.avatar_color }}
                  aria-hidden="true"
                >
                  {profile.name[0]}
                </span>
                <strong>{profile.name}</strong>
                {profile.nickname && profile.nickname !== profile.name && (
                  <span className="hint">{profile.nickname}</span>
                )}
                <span className="profile-enter">
                  Entrar <ArrowRight size={17} />
                </span>
              </button>
            ))}
          </div>
          <p className="hint">
            Dos perfiles en un espacio compartido. Puedes cambiar de perfil en
            cualquier momento.
          </p>
        </div>
      </main>
    );
  return (
    <div className="app-shell" key={activeProfile.id}>
      <Sidebar />
      <div className="app-workspace">
        <AppHeader />
        <main className="app-main">{children}</main>
        <BottomNavigation />
      </div>
    </div>
  );
}
