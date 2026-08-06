"use client";

import { ShoppingBag } from "lucide-react";
import { useTenant } from "../../../hooks/useTenant";
import { useOrders, useUpdateOrderStatus, OrderStatus } from "../../../hooks/useOrders";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";

const statusTone: Record<OrderStatus, "neutral" | "gold" | "green" | "red" | "indigo"> = {
  PENDING: "gold",
  PAID: "indigo",
  DISPATCHED: "indigo",
  COMPLETED: "green",
  CANCELLED: "red",
};

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  PAID: "DISPATCHED",
  DISPATCHED: "COMPLETED",
};

const nextLabel: Partial<Record<OrderStatus, string>> = {
  PAID: "Mark dispatched",
  DISPATCHED: "Mark completed",
};

export default function OrdersPage() {
  const { tenantId, currentTenant } = useTenant();
  const { data, isLoading } = useOrders(tenantId);
  const updateStatus = useUpdateOrderStatus(tenantId);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Orders</h1>
        <p className="mt-1 text-sm text-ink/60">
          Real-time orders from {currentTenant?.name ?? "your store"}'s buyers
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-ink/40">Loading…</div>
      ) : data && data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {data.items.map((order) => {
            const advance = nextStatus[order.status];
            return (
              <Card key={order.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-ink/40">
                        #{order.id.slice(-8)}
                      </span>
                      <Badge tone={statusTone[order.status]}>{order.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-ink/70">
                      {order.items.map((i) => `${i.quantity}× ${i.product?.name ?? "Unknown product"}`).join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-ink/40">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-medium text-ink">
                      {order.totalAmount} ETB
                    </div>
                    {advance && (
                      <button
                        onClick={() =>
                          updateStatus.mutate({ orderId: order.id, status: advance })
                        }
                        disabled={updateStatus.isPending}
                        className="mt-2 text-sm font-medium text-indigo hover:underline disabled:opacity-50"
                      >
                        {nextLabel[order.status]} →
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <ShoppingBag size={28} className="text-ink/30" />
          <div>
            <p className="font-medium text-ink">No orders yet</p>
            <p className="mt-1 text-sm text-ink/50">
              Orders from your Telegram bot will show up here the moment someone buys.
            </p>
          </div>
          <div className="tilet-rule w-12" />
        </Card>
      )}
    </div>
  );
}
