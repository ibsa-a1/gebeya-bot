"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { useTenant } from "../../hooks/useTenant";
import { Sidebar } from "../../components/dashboard/Sidebar";
import { TopBar } from "../../components/dashboard/TopBar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { tenantId, currentTenant, tenants, selectTenant } = useTenant();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar
        currentTenant={currentTenant}
        tenants={tenants}
        onSelectTenant={selectTenant}
        onLogout={logout}
      />
      <div className="flex flex-1 flex-col">
        <TopBar user={user} currentTenant={currentTenant} />
        <main className="flex-1 px-8 py-8">
          {tenantId ? (
            children
          ) : (
            <div className="flex h-64 items-center justify-center text-ink/50">
              You don't have access to any storefronts yet.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
