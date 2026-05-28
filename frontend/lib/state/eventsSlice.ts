import { StateCreator } from 'zustand';
import { SupplyLinkStore, EventsSlice } from './types';

export const createEventsSlice: StateCreator<SupplyLinkStore, [], [], EventsSlice> = (set) => ({
  events: [],
  eventsLoading: false,
  eventsError: null,
  eventsLastFetched: null,
  eventPage: 0,
  eventPageSize: 20,
  eventTotal: 0,
  selectedProductId: null,

  setEvents: (events) => set({ events }),
  addEvent: (event) => set((s) => ({ events: [...s.events, event] })),
  setEventsLoading: (eventsLoading) => set({ eventsLoading }),
  setEventsError: (eventsError) => set({ eventsError }),
  setEventsLastFetched: (eventsLastFetched) => set({ eventsLastFetched }),
  addOptimisticEvent: (event) =>
    set((s) => ({ events: [...s.events, { ...event, pending: true }] })),
  confirmOptimisticEvent: (productId, timestamp) =>
    set((s) => ({
      events: s.events.map((e) =>
        e.productId === productId && e.timestamp === timestamp ? { ...e, pending: false } : e,
      ),
    })),
  removeOptimisticEvent: (productId, timestamp) =>
    set((s) => ({
      events: s.events.filter((e) => !(e.productId === productId && e.timestamp === timestamp)),
    })),
  setEventPage: (eventPage) => set({ eventPage }),
  setEventPageSize: (eventPageSize) => set({ eventPageSize }),
  setEventTotal: (eventTotal) => set({ eventTotal }),
  setSelectedProductId: (selectedProductId) => set({ selectedProductId }),
});
