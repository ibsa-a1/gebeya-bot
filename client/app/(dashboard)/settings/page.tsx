"use client";

import { useState, useEffect } from "react";
import { useTenant } from "../../../hooks/useTenant";
import { apiClient } from "../../../lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";

export default function SettingsPage() {
  const { tenantId, currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [discoverable, setDiscoverable] = useState(true);
  const [chapaSecretKey, setChapaSecretKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentTenant) {
      setName(currentTenant.name);
    }
  }, [currentTenant]);

  const updateTenant = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { name, discoverable };
      if (chapaSecretKey) payload.chapaSecretKey = chapaSecretKey;
      const res = await apiClient.patch(`/tenants/${tenantId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      setSaved(true);
      setChapaSecretKey("");
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (!currentTenant) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink/60">Configure {currentTenant.name}</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-5">
          <Input label="Store name" value={name} onChange={(e) => setName(e.target.value)} />

          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={discoverable}
              onChange={(e) => setDiscoverable(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-indigo"
            />
            Show this store in cross-store search
          </label>

          <div className="border-t border-border pt-5">
            <Input
              label="Chapa secret key"
              type="password"
              placeholder="Leave blank to keep the current key"
              value={chapaSecretKey}
              onChange={(e) => setChapaSecretKey(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-ink/40">
              Stored encrypted. Only enter a value here to replace it.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={() => updateTenant.mutate()} loading={updateTenant.isPending}>
              Save changes
            </Button>
            {saved && <span className="text-sm text-market-green">Saved</span>}
          </div>
        </div>
      </Card>
    </div>
  );
}
