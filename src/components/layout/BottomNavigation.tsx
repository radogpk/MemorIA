"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./Sidebar";
import { useMemoria } from "@/lib/storage/store";
import { isPendingInvitation } from "@/lib/storage/model";
export function BottomNavigation() {
  const path = usePathname();
  const { activities, activeProfile } = useMemoria();
  const incoming = activities.filter(
    (a) =>
      isPendingInvitation(a) && a.invitation?.recipient_id === activeProfile.id,
  ).length;
  const labels: Record<string, string> = {
    "/today": "Mi día",
    "/calendar": "Agenda",
    "/subjects": "Cursos",
    "/tasks": "Tareas",
    "/together": "Juntos",
  };
  return (
    <nav className="bottom-navigation" aria-label="Navegación móvil">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={
            path === item.href || path.startsWith(`${item.href}/`)
              ? "page"
              : undefined
          }
          className={
            path === item.href || path.startsWith(`${item.href}/`)
              ? "active"
              : ""
          }
        >
          <span className="nav-icon">
            <item.icon size={21} />
            {item.href === "/together" && incoming > 0 && (
              <span className="nav-count">{incoming}</span>
            )}
          </span>
          <span>{labels[item.href] || item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
