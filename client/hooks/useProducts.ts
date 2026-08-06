"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: string;
  stock: number;
  images: string[];
  createdAt: string;
}

interface ProductsResponse {
  items: Product[];
  total: number;
  page: number;
}

export function useProducts(tenantId: string | null) {
  return useQuery<ProductsResponse>({
    queryKey: ["products", tenantId],
    queryFn: async () => {
      const res = await apiClient.get(`/tenants/${tenantId}/products`);
      return res.data;
    },
    enabled: !!tenantId,
  });
}

export function useCreateProduct(tenantId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      category: string;
      price: number;
      stock: number;
      description?: string;
    }) => {
      const res = await apiClient.post(`/tenants/${tenantId}/products`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", tenantId] });
    },
  });
}

export function useUpdateProduct(tenantId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      data,
    }: {
      productId: string;
      data: { name: string; category: string; price: number; stock: number; description?: string };
    }) => {
      const res = await apiClient.patch(`/tenants/${tenantId}/products/${productId}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", tenantId] });
    },
  });
}

export function useDeleteProduct(tenantId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      await apiClient.delete(`/tenants/${tenantId}/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", tenantId] });
    },
  });
}

export type { Product };
