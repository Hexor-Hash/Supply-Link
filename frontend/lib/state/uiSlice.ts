import { StateCreator } from 'zustand';
import { SupplyLinkStore, UISlice } from './types';

export const createUISlice: StateCreator<SupplyLinkStore, [], [], UISlice> = (set) => ({
  searchQuery: '',
  filterEventType: null,
  sortBy: 'name',
  sortOrder: 'asc',
  notifications: [],
  lastFetched: null,
  compareIds: [],
  isAddProductModalOpen: false,
  isAddEventModalOpen: false,
  activePage: 'dashboard',

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterEventType: (filterEventType) => set({ filterEventType }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  addNotifications: (incoming) =>
    set((s) => ({
      notifications: [
        ...s.notifications,
        ...incoming.filter((n) => !s.notifications.some((e) => e.id === n.id)),
      ],
    })),
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  markAllNotificationsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),
  setLastFetched: (ts) => set({ lastFetched: ts }),
  toggleCompare: (id) =>
    set((s) => ({
      compareIds: s.compareIds.includes(id)
        ? s.compareIds.filter((x) => x !== id)
        : s.compareIds.length < 4
          ? [...s.compareIds, id]
          : s.compareIds,
    })),
  clearCompare: () => set({ compareIds: [] }),
  setIsAddProductModalOpen: (isAddProductModalOpen) => set({ isAddProductModalOpen }),
  setIsAddEventModalOpen: (isAddEventModalOpen) => set({ isAddEventModalOpen }),
  setActivePage: (activePage) => set({ activePage }),
});
