"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";

type OrderStatus = "PENDING" | "PAID" | "DISPATCHED" | "COMPLETED" | "CANCELLED";

interface OrderItem {
  id: string;
  quantity: number;
  priceAtPurchase: string;
  product: { name: string };
}

interface Order {
  id: string;
  customerTelegramId: string;
  status: OrderStatus;
  totalAmount: string;
  createdAt: string;
  items: OrderItem[];
}

interface OrdersResponse {
  items: Order[];
  total: number;
  page: number;
}

export function useOrders(tenantId: string | null) {
  return useQuery<OrdersResponse>({
    queryKey: ["orders", tenantId],
    queryFn: async () => {
      const res = await apiClient.get(`/tenants/${tenantId}/orders`);
      return res.data;
    },
    enabled: !!tenantId,
    refetchInterval: 15_000, // orders can arrive from real buyers any time — poll for freshness
  });
}

export function useUpdateOrderStatus(tenantId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const res = await apiClient.patch(`/tenants/${tenantId}/orders/${orderId}/status`, {
        status,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", tenantId] });
    },
  });
}

export type { Order, OrderStatus };
