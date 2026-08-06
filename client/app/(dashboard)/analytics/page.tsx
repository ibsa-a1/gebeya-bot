"use client";

import { BarChart3 } from "lucide-react";
import { useTenant } from "../../../hooks/useTenant";
import { useOrders } from "../../../hooks/useOrders";
import { useProducts } from "../../../hooks/useProducts";
import { Card } from "../../../components/ui/Card";

export default function AnalyticsPage() {
  const { tenantId, currentTenant } = useTenant();
  const { data: ordersData, isLoading: ordersLoading } = useOrders(tenantId);
  const { data: productsData, isLoading: productsLoading } = useProducts(tenantId);

  const isLoading = ordersLoading || productsLoading;
  const orders = ordersData?.items ?? [];

  const paidOrders = orders.filter((o) => o.status !== "PENDING" && o.status !== "CANCELLED");
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const uniqueCustomers = new Set(orders.map((o) => o.customerTelegramId)).size;

  const productCounts = new Map<string, number>();
  for (const order of paidOrders) {
    for (const item of order.items) {
      const name = item.product?.name ?? "Unknown product";
      productCounts.set(name, (productCounts.get(name) ?? 0) + item.quantity);
    }
  }
  const topProducts = [...productCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Analytics</h1>
        <p className="mt-1 text-sm text-ink/60">
          How {currentTenant?.name ?? "your store"} is doing
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-ink/40">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-5">
              <p className="text-xs uppercase tracking-wide text-ink/50">Total revenue</p>
              <p className="mt-2 font-mono text-2xl font-medium text-ink">
                {totalRevenue.toLocaleString()} <span className="text-sm text-ink/50">ETB</span>
              </p>
              <p className="mt-1 text-xs text-ink/40">from {paidOrders.length} paid orders</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs uppercase tracking-wide text-ink/50">Customers</p>
              <p className="mt-2 font-mono text-2xl font-medium text-ink">{uniqueCustomers}</p>
              <p className="mt-1 text-xs text-ink/40">unique buyers</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs uppercase tracking-wide text-ink/50">Products listed</p>
              <p className="mt-2 font-mono text-2xl font-medium text-ink">
                {productsData?.total ?? 0}
              </p>
              <p className="mt-1 text-xs text-ink/40">in your catalog</p>
            </Card>
          </div>

          <Card className="mt-6 p-6">
            <p className="mb-4 text-sm font-medium text-ink/70">Top products</p>
            {topProducts.length > 0 ? (
              <div className="flex flex-col gap-3">
                {topProducts.map(([name, qty], i) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-5 font-mono text-xs text-ink/40">{i + 1}</span>
                    <span className="flex-1 text-sm text-ink">{name}</span>
                    <span className="font-mono text-sm text-ink/60">{qty} sold</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <BarChart3 size={24} className="text-ink/30" />
                <p className="text-sm text-ink/50">No paid orders yet — sales will show up here.</p>
                <div className="tilet-rule w-12" />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
