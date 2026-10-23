"use client";
import { useMemoria } from "@/lib/storage/store";
export function ProfileSwitcher() {
  const { activeProfile, leaveProfile } = useMemoria();
  return (
    <div className="active-profile">
      <span
        className="avatar"
        style={{ background: activeProfile.avatar_color }}
        aria-hidden="true"
      >
        {activeProfile.name[0]}
      </span>
      <div>
        <strong>{activeProfile.name}</strong>
        <button className="text-button" onClick={leaveProfile}>
          Cambiar perfil
        </button>
      </div>
    </div>
  );
}
