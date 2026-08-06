"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";

const STORAGE_KEY = "gebeya_selected_tenant_id";

export function useTenant() {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.tenants.length === 0) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    const validStored = user.tenants.find((t) => t.id === stored);
    setTenantId(validStored ? stored : user.tenants[0].id);
  }, [user]);

  const selectTenant = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setTenantId(id);
  };

  const currentTenant = user?.tenants.find((t) => t.id === tenantId) ?? null;

  return { tenantId, currentTenant, tenants: user?.tenants ?? [], selectTenant };
}
