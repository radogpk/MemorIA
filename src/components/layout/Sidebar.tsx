"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  BookOpen,
  CheckSquare,
  LayoutDashboard,
  HeartHandshake,
} from "lucide-react";
import { useMemoria } from "@/lib/storage/store";
import { isPendingInvitation } from "@/lib/storage/model";
export const NAV_ITEMS = [
  { href: "/today", label: "Mi día", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/subjects", label: "Cursos", icon: BookOpen },
  { href: "/tasks", label: "Pendientes", icon: CheckSquare },
  { href: "/together", label: "Invitaciones", icon: HeartHandshake },
];
export function Sidebar() {
  const path = usePathname();
  const { activeProfile, partnerProfile, activities } = useMemoria();
  const incoming = activities.filter(
    (a) =>
      a.invitation?.recipient_id === activeProfile.id &&
      isPendingInvitation(a),
  ).length;
  return (
    <aside className="app-sidebar">
      <Link className="wordmark" href="/today">
        memorIA
        <span className="brand-dot" />
      </Link>
      <p className="sidebar-caption">
        Menos ruido.
        <br />
        Más presente.
      </p>
      <nav aria-label="Navegación principal">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={path === item.href || path.startsWith(`${item.href}/`) ? "active" : ""}
            aria-current={path === item.href || path.startsWith(`${item.href}/`) ? "page" : undefined}
          >
            <item.icon size={19} />
            <span>{item.label}</span>
            {item.href === "/together" && incoming > 0 && (
              <span className="count">{incoming}</span>
            )}
          </Link>
        ))}
      </nav>
      <div className="duo-note">
        <div className="paired-avatars">
          <span style={{ background: activeProfile.avatar_color }}>
            {activeProfile.name[0]}
          </span>
          <span style={{ background: partnerProfile?.avatar_color }}>
            {partnerProfile?.name[0]}
          </span>
        </div>
        <strong>
          Dos agendas.
          <br />
          Un espacio en común.
        </strong>
        <p>Lo tuyo, lo suyo y lo que planean juntos.</p>
        <Link href="/together">Ver planes compartidos</Link>
      </div>
      <Link className="sidebar-footer" href="/settings">
        Datos y respaldo
      </Link>
    </aside>
  );
}
