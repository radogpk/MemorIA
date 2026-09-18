'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useMemoria } from '@/lib/storage/store';
import { UserProfile } from '@/types/database.types';
import { Users, Check, Heart, Edit2, Sparkles, ChevronDown } from 'lucide-react';

export function ProfileSwitcher() {
  const { profiles, activeProfile, partnerProfile, setActiveProfile, updateProfile } = useMemoria();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditing(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProfile = (profile: UserProfile) => {
    setActiveProfile(profile);
    setIsOpen(false);
    setIsEditing(null);
  };

  const handleStartEdit = (e: React.MouseEvent, profile: UserProfile) => {
    e.stopPropagation();
    setIsEditing(profile.id);
    setEditNickname(profile.nickname || profile.name);
  };

  const handleSaveEdit = (e: React.FormEvent, profileId: string) => {
    e.preventDefault();
    if (editNickname.trim()) {
      updateProfile(profileId, { nickname: editNickname.trim() });
    }
    setIsEditing(null);
  };

  const isGirlfriend = activeProfile.role === 'partner' || activeProfile.id === 'prof-novia';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-800/80 py-1 pl-1.5 pr-2.5 text-xs text-white hover:border-slate-600 hover:bg-slate-700/80 transition shadow-sm select-none"
        title="Cambiar perfil activo de este dispositivo"
      >
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-inner"
          style={{ backgroundColor: activeProfile.avatar_color }}
        >
          {isGirlfriend ? '💖' : activeProfile.name.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[85px] truncate font-medium sm:max-w-[120px]">
          {activeProfile.nickname || activeProfile.name}
        </span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-700/80 bg-[#0d1424] p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 border-b border-slate-800/80">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Perfil en este teléfono
            </p>
            <p className="text-xs text-slate-300 font-medium">
              Selecciona quién está usando la app:
            </p>
          </div>

          <div className="mt-1 space-y-1">
            {profiles.map((p) => {
              const isSelected = p.id === activeProfile.id;
              const isPartner = p.role === 'partner' || p.id === 'prof-novia';

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectProfile(p)}
                  className={`group flex items-center justify-between rounded-lg px-2.5 py-2 cursor-pointer transition ${
                    isSelected
                      ? 'bg-blue-600/20 text-white border border-blue-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-md"
                      style={{ backgroundColor: p.avatar_color }}
                    >
                      {isPartner ? '💖' : p.name.charAt(0).toUpperCase()}
                    </span>

                    <div className="min-w-0 text-left">
                      {isEditing === p.id ? (
                        <form
                          onSubmit={(e) => handleSaveEdit(e, p.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1"
                        >
                          <input
                            type="text"
                            value={editNickname}
                            onChange={(e) => setEditNickname(e.target.value)}
                            className="h-6 w-28 rounded bg-slate-900 px-1.5 text-xs text-white border border-blue-500 focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] text-white"
                          >
                            OK
                          </button>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="truncate text-xs font-semibold text-white">
                              {p.nickname || p.name}
                            </span>
                            {isPartner && <Heart className="h-3 w-3 text-pink-400 fill-pink-400" />}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">
                            {isPartner ? 'Perfil Pareja' : 'Perfil Principal'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {isEditing !== p.id && (
                      <button
                        onClick={(e) => handleStartEdit(e, p)}
                        className="rounded p-1 text-slate-500 opacity-0 group-hover:opacity-100 hover:text-slate-200 transition"
                        title="Editar apodo"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                    {isSelected && <Check className="h-4 w-4 text-blue-400 shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Helper note */}
          <div className="mt-2 border-t border-slate-800/80 px-2.5 pt-2 pb-1 text-[10px] text-slate-400">
            <p>
              ✨ Sin contraseñas: tu pareja abre el link en su celular y solo selecciona su perfil.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
