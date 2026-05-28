import type { Product, TrackingEvent, EventType, Notification } from '@/lib/types';

export interface WalletSlice {
  walletAddress: string | null;
  xlmBalance: string | null;
  networkMismatch: boolean;
  setWalletAddress: (address: string | null) => void;
  setXlmBalance: (balance: string | null) => void;
  setNetworkMismatch: (mismatch: boolean) => void;
  validateWalletConnection: () => Promise<void>;
  disconnect: () => void;
}

export interface ProductsSlice {
  products: Product[];
  productsLoading: boolean;
  productsError: string | null;
  productsLastFetched: number | null;
  productPage: number;
  productPageSize: number;
  productTotal: number;
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  setProductsLoading: (v: boolean) => void;
  setProductsError: (v: string | null) => void;
  setProductsLastFetched: (ts: number | null) => void;
  updateProductOwner: (productId: string, newOwner: string) => void;
  addOptimisticProduct: (product: Product) => void;
  confirmOptimisticProduct: (productId: string) => void;
  removeOptimisticProduct: (productId: string) => void;
  setProductPage: (page: number) => void;
  setProductPageSize: (size: number) => void;
  setProductTotal: (total: number) => void;
}

export interface EventsSlice {
  events: TrackingEvent[];
  eventsLoading: boolean;
  eventsError: string | null;
  eventsLastFetched: number | null;
  eventPage: number;
  eventPageSize: number;
  eventTotal: number;
  selectedProductId: string | null;
  setEvents: (events: TrackingEvent[]) => void;
  addEvent: (event: TrackingEvent) => void;
  setEventsLoading: (v: boolean) => void;
  setEventsError: (v: string | null) => void;
  setEventsLastFetched: (ts: number | null) => void;
  addOptimisticEvent: (event: TrackingEvent) => void;
  confirmOptimisticEvent: (productId: string, timestamp: number) => void;
  removeOptimisticEvent: (productId: string, timestamp: number) => void;
  setEventPage: (page: number) => void;
  setEventPageSize: (size: number) => void;
  setEventTotal: (total: number) => void;
  setSelectedProductId: (id: string | null) => void;
}

export interface UISlice {
  searchQuery: string;
  filterEventType: EventType | null;
  sortBy: 'name' | 'timestamp';
  sortOrder: 'asc' | 'desc';
  notifications: Notification[];
  lastFetched: number | null;
  compareIds: string[];
  isAddProductModalOpen: boolean;
  isAddEventModalOpen: boolean;
  activePage: string;
  setSearchQuery: (q: string) => void;
  setFilterEventType: (t: EventType | null) => void;
  setSortBy: (by: 'name' | 'timestamp') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  addNotifications: (notifications: Notification[]) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  setLastFetched: (ts: number) => void;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  setIsAddProductModalOpen: (open: boolean) => void;
  setIsAddEventModalOpen: (open: boolean) => void;
  setActivePage: (page: string) => void;
}

export type SupplyLinkStore = WalletSlice & ProductsSlice & EventsSlice & UISlice;
