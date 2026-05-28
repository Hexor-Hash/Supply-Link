import { StateCreator } from 'zustand';
import { isConnected } from '@stellar/freighter-api';
import { SupplyLinkStore, WalletSlice } from './types';

export const createWalletSlice: StateCreator<SupplyLinkStore, [], [], WalletSlice> = (set) => ({
  walletAddress: null,
  xlmBalance: null,
  networkMismatch: false,

  setWalletAddress: (walletAddress) => set({ walletAddress }),
  setXlmBalance: (xlmBalance) => set({ xlmBalance }),
  setNetworkMismatch: (networkMismatch) => set({ networkMismatch }),

  validateWalletConnection: async () => {
    const connected = await isConnected();
    if (!connected) set({ walletAddress: null });
  },

  disconnect: () =>
    set({
      walletAddress: null,
      products: [],
      events: [],
      lastFetched: null,
      productsLastFetched: null,
      eventsLastFetched: null,
      productPage: 0,
      eventPage: 0,
    }),
});
