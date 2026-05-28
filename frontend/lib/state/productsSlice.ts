import { StateCreator } from 'zustand';
import { SupplyLinkStore, ProductsSlice } from './types';

export const createProductsSlice: StateCreator<SupplyLinkStore, [], [], ProductsSlice> = (set) => ({
  products: [],
  productsLoading: false,
  productsError: null,
  productsLastFetched: null,
  productPage: 0,
  productPageSize: 20,
  productTotal: 0,

  setProducts: (products) => set({ products }),
  addProduct: (product) => set((s) => ({ products: [...s.products, product] })),
  setProductsLoading: (productsLoading) => set({ productsLoading }),
  setProductsError: (productsError) => set({ productsError }),
  setProductsLastFetched: (productsLastFetched) => set({ productsLastFetched }),
  updateProductOwner: (productId, newOwner) =>
    set((s) => ({
      products: s.products.map((p) => (p.id === productId ? { ...p, owner: newOwner } : p)),
    })),
  addOptimisticProduct: (product) =>
    set((s) => ({ products: [...s.products, { ...product, pending: true }] })),
  confirmOptimisticProduct: (productId) =>
    set((s) => ({
      products: s.products.map((p) => (p.id === productId ? { ...p, pending: false } : p)),
    })),
  removeOptimisticProduct: (productId) =>
    set((s) => ({ products: s.products.filter((p) => p.id !== productId) })),
  setProductPage: (productPage) => set({ productPage }),
  setProductPageSize: (productPageSize) => set({ productPageSize }),
  setProductTotal: (productTotal) => set({ productTotal }),
});
