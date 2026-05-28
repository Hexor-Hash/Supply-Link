import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { Product } from '@/lib/types';
import { createWalletSlice } from './walletSlice';
import { createProductsSlice } from './productsSlice';
import { createEventsSlice } from './eventsSlice';
import { createUISlice } from './uiSlice';
import { SupplyLinkStore } from './types';

export const useStore = create<SupplyLinkStore>()(
  persist(
    (...a) => ({
      ...createWalletSlice(...a),
      ...createProductsSlice(...a),
      ...createEventsSlice(...a),
      ...createUISlice(...a),
    }),
    {
      name: 'supply-link-store',
      partialize: (state) => ({
        walletAddress: state.walletAddress,
        notifications: state.notifications,
      }),
    },
  ),
);

/** Derived selector: filtered + sorted products (#50).
 *
 *  Uses useShallow so the returned array reference only changes when the
 *  content changes, preventing unnecessary re-renders of large product lists.
 */
export function selectFilteredProducts(state: SupplyLinkStore): Product[] {
  const { products, searchQuery, filterEventType, sortBy, sortOrder } = state;

  const result = products.filter((p) => {
    const matchesSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterEventType === null || true;
    return matchesSearch && matchesFilter;
  });

  return [...result].sort((a, b) => {
    const av = sortBy === 'name' ? a.name : a.timestamp;
    const bv = sortBy === 'name' ? b.name : b.timestamp;
    if (av < bv) return sortOrder === 'asc' ? -1 : 1;
    if (av > bv) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
}

/** Stable hook wrapper — prevents re-renders unless the filtered list actually changes. */
export function useFilteredProducts(): Product[] {
  return useStore(useShallow(selectFilteredProducts));
}
