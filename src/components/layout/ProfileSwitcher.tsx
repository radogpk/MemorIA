"use client";
import { ChevronDown } from "lucide-react";
import { useMemoria } from "@/lib/storage/store";
export function ProfileSwitcher() {
  const { activeProfile, leaveProfile } = useMemoria();
  return (
    <button
      className="active-profile"
      onClick={leaveProfile}
      aria-label={`Cambiar perfil. Perfil actual: ${activeProfile.name}`}
    >
      <span
        className="avatar"
        style={{ background: activeProfile.avatar_color }}
        aria-hidden="true"
      >
        {activeProfile.name[0]}
      </span>
      <span className="profile-button-text">
        <strong>{activeProfile.name}</strong>
        <small>Cambiar perfil</small>
      </span>
      <ChevronDown size={14} />
    </button>
  );
}
