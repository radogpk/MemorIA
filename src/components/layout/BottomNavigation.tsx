"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./Sidebar";
export function BottomNavigation() {
  const path = usePathname();
  return (
    <nav className="bottom-navigation" aria-label="Navegación móvil">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={path === item.href || path.startsWith(`${item.href}/`) ? "page" : undefined}
          className={path === item.href || path.startsWith(`${item.href}/`) ? "active" : ""}
        >
          <item.icon size={20} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
