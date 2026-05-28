"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProductById, getEventsByProductId, getAllProducts } from "@/lib/mock/products";
import type { Product, TrackingEvent } from "@/lib/types";
import * as client from "@/lib/stellar/client";

// ─── Product Queries ───────────────────────────────────────────────────────

export function useProduct(productId: string | null) {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: () => {
      if (!productId) throw new Error("Product ID is required");
      return getProductById(productId);
    },
    enabled: !!productId,
  });
}

export function useProducts(page = 0, pageSize = 20) {
  return useQuery({
    queryKey: ["products", page, pageSize],
    queryFn: async () => {
      const products = getAllProducts();
      const total = products.length;
      const paginated = products.slice(page * pageSize, (page + 1) * pageSize);
      return { products: paginated, total };
    },
  });
}

export function useAllProducts() {
  return useQuery({
    queryKey: ["products-all"],
    queryFn: () => getAllProducts(),
  });
}

// ─── Event Queries ────────────────────────────────────────────────────────

export function useTrackingEvents(productId: string | null) {
  return useQuery({
    queryKey: ["events", productId],
    queryFn: () => {
      if (!productId) throw new Error("Product ID is required");
      return getEventsByProductId(productId);
    },
    enabled: !!productId,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────

export function useRegisterProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      productId: string;
      name: string;
      origin: string;
      description: string;
      callerAddress: string;
    }) => {
      return client.registerProduct(
        data.productId,
        data.name,
        data.origin,
        data.description,
        data.callerAddress
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-all"] });
    },
  });
}

export function useTransferOwnership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      productId: string;
      newOwner: string;
      callerAddress: string;
    }) => {
      return client.transferOwnership(
        data.productId,
        data.newOwner,
        data.callerAddress
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product", variables.productId] });
    },
  });
}

export function useAddAuthorizedActor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      productId: string;
      actor: string;
      callerAddress: string;
    }) => {
      return client.addAuthorizedActor(
        data.productId,
        data.actor,
        data.callerAddress
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product", variables.productId] });
    },
  });
}

export function useRemoveAuthorizedActor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      productId: string;
      actor: string;
      callerAddress: string;
    }) => {
      return client.removeAuthorizedActor(
        data.productId,
        data.actor,
        data.callerAddress
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product", variables.productId] });
    },
  });
}
