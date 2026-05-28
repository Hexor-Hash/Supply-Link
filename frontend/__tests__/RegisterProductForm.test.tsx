import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRegisterProduct = vi.fn();
const mockAddProduct = vi.fn();
const mockToastLoading = vi.fn().mockReturnValue("toast-id");
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockToastDismiss = vi.fn();

vi.mock("@/lib/stellar/client", () => ({
  registerProduct: mockRegisterProduct,
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
  CONTRACT_ID: "CTEST000",
  RPC_URL: "https://soroban-testnet.stellar.org",
}));

vi.mock("@/lib/hooks/useToast", () => ({
  useToast: () => ({
    loading: mockToastLoading,
    success: mockToastSuccess,
    error: mockToastError,
    dismiss: mockToastDismiss,
  }),
}));

vi.mock("@/components/products/ImageUpload", () => ({
  ImageUpload: () => <div data-testid="image-upload" />,
}));

let walletAddress: string | null = "GABC123";

vi.mock("@/lib/state/store", () => ({
  useStore: (selector?: (s: { walletAddress: string | null; addProduct: typeof mockAddProduct }) => unknown) => {
    const state = { walletAddress, addProduct: mockAddProduct };
    return selector ? selector(state) : state;
  },
}));

// Radix Dialog needs pointer events
Object.defineProperty(window, "PointerEvent", { value: MouseEvent });

import { RegisterProductForm } from "@/components/products/RegisterProductForm";

function renderForm(open = true) {
  return render(<RegisterProductForm open={open} onOpenChange={vi.fn()} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  walletAddress = "GABC123";
});

describe("RegisterProductForm", () => {
  it("renders all form fields", () => {
    renderForm();
    expect(screen.getByLabelText(/product id/i) ?? screen.getByPlaceholderText(/prod-/i) ?? screen.getByRole("textbox", { name: /product id/i })).toBeTruthy();
    expect(screen.getByPlaceholderText(/organic coffee/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ethiopia/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/additional details/i)).toBeInTheDocument();
  });

  it("shows validation error for empty name", async () => {
    renderForm();
    // Clear the name field and submit
    const nameInput = screen.getByPlaceholderText(/organic coffee/i);
    await userEvent.clear(nameInput);
    fireEvent.click(screen.getByRole("button", { name: /register product/i }));
    await waitFor(() => {
      expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
    });
  });

  it("shows validation error for empty origin", async () => {
    renderForm();
    const originInput = screen.getByPlaceholderText(/ethiopia/i);
    await userEvent.clear(originInput);
    fireEvent.click(screen.getByRole("button", { name: /register product/i }));
    await waitFor(() => {
      expect(screen.getByText(/origin is required/i)).toBeInTheDocument();
    });
  });

  it("shows validation error for empty product ID", async () => {
    renderForm();
    const idInput = screen.getAllByRole("textbox")[0];
    await userEvent.clear(idInput);
    fireEvent.click(screen.getByRole("button", { name: /register product/i }));
    await waitFor(() => {
      expect(screen.getByText(/product id is required/i)).toBeInTheDocument();
    });
  });

  it("disables submit button while submitting", async () => {
    mockRegisterProduct.mockImplementation(() => new Promise((r) => setTimeout(() => r("tx_hash"), 300)));
    renderForm();
    await userEvent.type(screen.getByPlaceholderText(/organic coffee/i), "Coffee");
    await userEvent.type(screen.getByPlaceholderText(/ethiopia/i), "Ethiopia");
    fireEvent.click(screen.getByRole("button", { name: /register product/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /registering/i })).toBeDisabled();
    });
  });

  it("calls registerProduct with correct arguments on valid submit", async () => {
    mockRegisterProduct.mockResolvedValue("tx_hash_123");
    renderForm();
    const idInput = screen.getAllByRole("textbox")[0];
    await userEvent.clear(idInput);
    await userEvent.type(idInput, "prod-test");
    await userEvent.type(screen.getByPlaceholderText(/organic coffee/i), "Coffee Beans");
    await userEvent.type(screen.getByPlaceholderText(/ethiopia/i), "Ethiopia");
    fireEvent.click(screen.getByRole("button", { name: /register product/i }));
    await waitFor(() => {
      expect(mockRegisterProduct).toHaveBeenCalledWith(
        "prod-test",
        "Coffee Beans",
        "Ethiopia",
        "",
        "GABC123"
      );
    });
  });

  it("shows success toast and closes modal on success", async () => {
    const mockOnOpenChange = vi.fn();
    mockRegisterProduct.mockResolvedValue("tx_hash_123");
    render(<RegisterProductForm open={true} onOpenChange={mockOnOpenChange} />);
    await userEvent.type(screen.getByPlaceholderText(/organic coffee/i), "Coffee Beans");
    await userEvent.type(screen.getByPlaceholderText(/ethiopia/i), "Ethiopia");
    fireEvent.click(screen.getByRole("button", { name: /register product/i }));
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.stringContaining("Coffee Beans"),
        "tx_hash_123"
      );
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("shows error toast on contract call failure", async () => {
    mockRegisterProduct.mockRejectedValue(new Error("Contract error"));
    renderForm();
    await userEvent.type(screen.getByPlaceholderText(/organic coffee/i), "Coffee Beans");
    await userEvent.type(screen.getByPlaceholderText(/ethiopia/i), "Ethiopia");
    fireEvent.click(screen.getByRole("button", { name: /register product/i }));
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Registration failed", "Contract error");
    });
  });
});
