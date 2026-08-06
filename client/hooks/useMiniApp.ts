"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import { CartItem } from "./useCart";

interface MiniAppProduct {
  id: string;
  name: string;
  category: string;
  price: string;
  stock: number;
  description: string | null;
}

interface MiniAppProductsResponse {
  items: MiniAppProduct[];
  total: number;
}

export function useMiniAppProducts(tenantId: string, search: string) {
  return useQuery<MiniAppProductsResponse>({
    queryKey: ["mini-app-products", tenantId, search],
    queryFn: async () => {
      const res = await apiClient.get(`/mini-app/tenants/${tenantId}/products`, {
        params: search ? { search } : undefined,
      });
      return res.data;
    },
  });
}

export function useMiniAppCheckout(tenantId: string) {
  return useMutation({
    mutationFn: async ({
      initData,
      devTestTelegramId,
      items,
    }: {
      initData?: string;
      devTestTelegramId?: string;
      items: CartItem[];
    }) => {
      const res = await apiClient.post(`/mini-app/tenants/${tenantId}/checkout`, {
        initData,
        devTestTelegramId,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      return res.data;
    },
  });
}

export type { MiniAppProduct };
