"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, ShoppingBag, BarChart3, Settings, LogOut } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  role: "OWNER" | "STAFF";
}

interface SidebarProps {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  onSelectTenant: (id: string) => void;
  onLogout: () => void;
}

const navItems = [
  { href: "/products", label: "Products", icon: Package },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ currentTenant, tenants, onSelectTenant, onLogout }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col bg-indigo text-white">
      <div className="px-6 py-6">
        <div className="text-lg font-semibold tracking-tight">Gebeya Bot</div>
        <div className="tilet-rule mt-2 w-10 opacity-80" />
      </div>

      {tenants.length > 0 && (
        <div className="mx-4 mb-4">
          <select
            value={currentTenant?.id ?? ""}
            onChange={(e) => onSelectTenant(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white
              focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id} className="text-ink">
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="flex-1 px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                ${active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70
            transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} strokeWidth={2} />
          Log out
        </button>
      </div>
    </aside>
  );
}
