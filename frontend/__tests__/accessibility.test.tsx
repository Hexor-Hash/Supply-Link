/**
 * Accessibility tests using axe-core.
 * Runs axe on key pages and asserts zero critical/serious violations.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/font/google", () => ({
  Geist: () => ({ className: "mock-font" }),
}));

vi.mock("@/lib/state/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/state/store")>();
  const state = {
    walletAddress: null,
    products: [],
    events: [],
    lastFetched: null,
    productsLoading: false,
    productsError: null,
    eventsLoading: false,
    eventsError: null,
    productsLastFetched: null,
    eventsLastFetched: null,
    searchQuery: "",
    filterEventType: null,
    sortBy: "name" as const,
    sortOrder: "asc" as const,
    xlmBalance: null,
    networkMismatch: false,
    productPage: 0,
    productPageSize: 20,
    productTotal: 0,
    eventPage: 0,
    eventPageSize: 20,
    eventTotal: 0,
    setWalletAddress: vi.fn(),
    setProducts: vi.fn(),
    setEvents: vi.fn(),
    setLastFetched: vi.fn(),
    updateProductOwner: vi.fn(),
    addProduct: vi.fn(),
    addEvent: vi.fn(),
    setProductsLoading: vi.fn(),
    setProductsError: vi.fn(),
    setEventsLoading: vi.fn(),
    setEventsError: vi.fn(),
    setProductsLastFetched: vi.fn(),
    setEventsLastFetched: vi.fn(),
    setSearchQuery: vi.fn(),
    setFilterEventType: vi.fn(),
    setSortBy: vi.fn(),
    setSortOrder: vi.fn(),
    addOptimisticProduct: vi.fn(),
    confirmOptimisticProduct: vi.fn(),
    removeOptimisticProduct: vi.fn(),
    addOptimisticEvent: vi.fn(),
    confirmOptimisticEvent: vi.fn(),
    removeOptimisticEvent: vi.fn(),
    setProductPage: vi.fn(),
    setProductPageSize: vi.fn(),
    setProductTotal: vi.fn(),
    setEventPage: vi.fn(),
    setEventPageSize: vi.fn(),
    setEventTotal: vi.fn(),
    validateWalletConnection: vi.fn(),
    disconnect: vi.fn(),
    setXlmBalance: vi.fn(),
    setNetworkMismatch: vi.fn(),
  };
  return {
    ...actual,
    useStore: (selector?: (s: typeof state) => unknown) =>
      selector ? selector(state) : state,
    selectFilteredProducts: () => [],
  };
});

vi.mock("@/lib/stellar/client", () => ({
  getWalletAddress: vi.fn().mockResolvedValue(null),
  CONTRACT_ID: "CTEST000",
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
  RPC_URL: "https://soroban-testnet.stellar.org",
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

async function renderAndRunAxe(ui: React.ReactElement) {
  const { container } = render(ui);
  const results = await axe(container, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "best-practice"],
    },
    // Only fail on critical and serious violations
    resultTypes: ["violations"],
  });
  // Filter to critical + serious only
  results.violations = results.violations.filter((v) =>
    ["critical", "serious"].includes(v.impact ?? "")
  );
  return results;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Accessibility — landing page", () => {
  it("has no critical/serious axe violations", async () => {
    const { default: Page } = await import("@/app/page");
    const results = await renderAndRunAxe(<Page />);
    expect(results).toHaveNoViolations();
  });
});

describe("Accessibility — dashboard page", () => {
  it("has no critical/serious axe violations", async () => {
    const { default: Page } = await import("@/app/(app)/dashboard/page");
    const results = await renderAndRunAxe(<Page />);
    expect(results).toHaveNoViolations();
  });
});

describe("Accessibility — products page", () => {
  it("has no critical/serious axe violations", async () => {
    const { default: Page } = await import("@/app/(app)/products/page");
    const results = await renderAndRunAxe(<Page />);
    expect(results).toHaveNoViolations();
  });
});
