import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn().mockResolvedValue(true),
}));

// Import after mock
const { useStore } = await import("@/lib/state/store");

const PRODUCT = {
  id: "prod-1",
  name: "Coffee Beans",
  origin: "Ethiopia",
  owner: "GABC123",
  timestamp: 1000,
  active: true,
  authorizedActors: [],
};

const EVENT = {
  productId: "prod-1",
  location: "Addis Ababa",
  actor: "GABC123",
  timestamp: 2000,
  eventType: "HARVEST" as const,
  metadata: "{}",
};

beforeEach(() => {
  act(() => {
    useStore.setState({
      walletAddress: null,
      xlmBalance: null,
      networkMismatch: false,
      products: [],
      events: [],
      productsLoading: false,
      productsError: null,
      eventsLoading: false,
      eventsError: null,
      productsLastFetched: null,
      eventsLastFetched: null,
    });
  });
});

// ── walletSlice ───────────────────────────────────────────────────────────────

describe("walletSlice", () => {
  it("setWalletAddress updates walletAddress", () => {
    const { result } = renderHook(() => useStore());
    act(() => result.current.setWalletAddress("GABC123"));
    expect(result.current.walletAddress).toBe("GABC123");
  });

  it("disconnect clears wallet and resets data", () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.setWalletAddress("GABC123");
      result.current.addProduct(PRODUCT);
      result.current.disconnect();
    });
    expect(result.current.walletAddress).toBeNull();
    expect(result.current.products).toHaveLength(0);
  });
});

// ── productsSlice ─────────────────────────────────────────────────────────────

describe("productsSlice", () => {
  it("addProduct appends a product", () => {
    const { result } = renderHook(() => useStore());
    act(() => result.current.addProduct(PRODUCT));
    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].id).toBe("prod-1");
  });

  it("setProducts replaces the list", () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.addProduct(PRODUCT);
      result.current.setProducts([{ ...PRODUCT, id: "prod-2" }]);
    });
    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].id).toBe("prod-2");
  });

  it("setProductsLoading toggles loading flag", () => {
    const { result } = renderHook(() => useStore());
    act(() => result.current.setProductsLoading(true));
    expect(result.current.productsLoading).toBe(true);
    act(() => result.current.setProductsLoading(false));
    expect(result.current.productsLoading).toBe(false);
  });

  it("setProductsError sets error message", () => {
    const { result } = renderHook(() => useStore());
    act(() => result.current.setProductsError("fetch failed"));
    expect(result.current.productsError).toBe("fetch failed");
    act(() => result.current.setProductsError(null));
    expect(result.current.productsError).toBeNull();
  });

  it("setProductsLastFetched invalidates cache when set to null", () => {
    const { result } = renderHook(() => useStore());
    act(() => result.current.setProductsLastFetched(Date.now()));
    expect(result.current.productsLastFetched).not.toBeNull();
    act(() => result.current.setProductsLastFetched(null));
    expect(result.current.productsLastFetched).toBeNull();
  });
});

// ── eventsSlice ───────────────────────────────────────────────────────────────

describe("eventsSlice", () => {
  it("addEvent appends an event", () => {
    const { result } = renderHook(() => useStore());
    act(() => result.current.addEvent(EVENT));
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].eventType).toBe("HARVEST");
  });

  it("setEvents replaces the list", () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.addEvent(EVENT);
      result.current.setEvents([{ ...EVENT, eventType: "SHIPPING" }]);
    });
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].eventType).toBe("SHIPPING");
  });

  it("setEventsLoading toggles loading flag", () => {
    const { result } = renderHook(() => useStore());
    act(() => result.current.setEventsLoading(true));
    expect(result.current.eventsLoading).toBe(true);
  });

  it("setEventsError sets error message", () => {
    const { result } = renderHook(() => useStore());
    act(() => result.current.setEventsError("network error"));
    expect(result.current.eventsError).toBe("network error");
  });

  it("setEventsLastFetched updates cache timestamp", () => {
    const { result } = renderHook(() => useStore());
    const ts = Date.now();
    act(() => result.current.setEventsLastFetched(ts));
    expect(result.current.eventsLastFetched).toBe(ts);
  });
});
