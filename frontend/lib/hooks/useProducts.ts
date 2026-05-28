"use client";

import { useCallback, useEffect } from "react";
import { useStore } from "@/lib/state/store";
import { listProducts } from "@/lib/stellar/client";
import { MOCK_PRODUCTS } from "@/lib/mock/products";
import type { Product } from "@/lib/types";

const CACHE_TTL_MS = 60_000;

/**
 * Encapsulates product fetch logic with loading/error state (#47)
 * and TTL-based cache invalidation (#48).
 * Exposes registerOptimistic for optimistic product registration (#49).
 */
export function useProducts() {
  const {
    products,
    productsLoading,
    productsError,
    productsLastFetched,
    setProducts,
    setProductsLoading,
    setProductsError,
    setProductsLastFetched,
    addOptimisticProduct,
    confirmOptimisticProduct,
    removeOptimisticProduct,
  } = useStore();

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const { products: onChain } = await listProducts();
      setProducts(onChain.length > 0 ? onChain : MOCK_PRODUCTS);
      setProductsLastFetched(Date.now());
    } catch (err) {
      setProductsError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  }, [setProducts, setProductsLoading, setProductsError, setProductsLastFetched]);

  useEffect(() => {
    const now = Date.now();
    if (productsLastFetched && now - productsLastFetched < CACHE_TTL_MS) return;
    fetchProducts();
  }, [productsLastFetched, fetchProducts]);

  /** Force re-fetch by clearing the cache (#48) */
  const refresh = useCallback(() => {
    setProductsLastFetched(null);
  }, [setProductsLastFetched]);

  /**
   * Optimistically adds a product, runs the tx, then confirms or rolls back (#49).
   * @param product  The product to add immediately to the UI.
   * @param txFn     Async function that submits the on-chain transaction.
   * @param onError  Called with an error message if the transaction fails.
   */
  const registerOptimistic = useCallback(
    async (
      product: Product,
      txFn: () => Promise<void>,
      onError: (msg: string) => void
    ) => {
      addOptimisticProduct(product);
      try {
        await txFn();
        confirmOptimisticProduct(product.id);
      } catch (err) {
        removeOptimisticProduct(product.id);
        onError(err instanceof Error ? err.message : "Transaction failed");
      }
    },
    [addOptimisticProduct, confirmOptimisticProduct, removeOptimisticProduct]
  );

  return {
    products,
    loading: productsLoading,
    error: productsError,
    refresh,
    registerOptimistic,
  };
}
