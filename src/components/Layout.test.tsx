import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import Layout from "./Layout";
import { LocaleProvider } from "../i18n/provider";
import * as BillingContextModule from "./BillingContext";

function renderWithProviders(ui: React.ReactElement, { initialEntries = ["/"] } = {}) {
  return render(
    <LocaleProvider>
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>
    </LocaleProvider>
  );
}

describe("Layout - BillingBannerSlot", () => {
  it("shows the failed payment banner when a failed payment exists", () => {
    // Provide failedPayment for the banner test
    const mockDismiss = vi.fn();
    vi.spyOn(BillingContextModule, "useBilling").mockReturnValue({
      failedPayment: {
        id: "fp_001",
        invoiceId: "inv_005",
        invoicePeriod: "March 2026",
        amount: 29.0,
        dueDate: "2026-03-15",
        failureReason: "Card declined",
        lastAttemptAt: "2026-07-28T09:00:00Z",
      },
      setFailedPayment: vi.fn(),
      dismissFailedPayment: mockDismiss,
    });

    renderWithProviders(<Layout />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/A recent payment failed/i)).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("hides the banner when dismissFailedPayment is called (simulate success/empty path)", () => {
    let currentFailedPayment: any = {
      id: "fp_001",
      invoiceId: "inv_005",
      invoicePeriod: "March 2026",
      amount: 29.0,
      dueDate: "2026-03-15",
      failureReason: "Card declined",
      lastAttemptAt: "2026-07-28T09:00:00Z",
    };

    const spy = vi.spyOn(BillingContextModule, "useBilling").mockImplementation(() => ({
      failedPayment: currentFailedPayment,
      setFailedPayment: (val: any) => {
        currentFailedPayment = val;
      },
      dismissFailedPayment: () => {
        currentFailedPayment = null;
      },
    }));

    const { rerender } = renderWithProviders(<Layout />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();

    const dismissButton = screen.getByRole("button", { name: /Update payment method/i });
    expect(dismissButton).toBeInTheDocument();

    fireEvent.click(dismissButton);

    rerender(
      <LocaleProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Layout />
        </MemoryRouter>
      </LocaleProvider>
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/A recent payment failed/i)).not.toBeInTheDocument();

    spy.mockRestore();
  });
});

describe("Layout - CommandPalette Integration", () => {
  it("opens the command palette when Ctrl+K is pressed and ignores when typing in an input", () => {
    renderWithProviders(<Layout />);

    expect(screen.queryByRole("dialog", { name: /command palette/i })).not.toBeInTheDocument();

    // Not opened when triggered inside an editable field
    const testInput = document.createElement("input");
    document.body.appendChild(testInput);
    testInput.focus();

    fireEvent.keyDown(testInput, { key: "k", ctrlKey: true });
    expect(screen.queryByRole("dialog", { name: /command palette/i })).not.toBeInTheDocument();

    testInput.remove();

    // Opened when pressed outside editable field
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByRole("dialog", { name: /command palette/i })).toBeInTheDocument();
  });

  it("opens the command palette when Cmd+K (metaKey) is pressed", () => {
    renderWithProviders(<Layout />);

    expect(screen.queryByRole("dialog", { name: /command palette/i })).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "k", metaKey: true });

    expect(screen.getByRole("dialog", { name: /command palette/i })).toBeInTheDocument();
  });

  it("opens the command palette when the top-bar search button is clicked", () => {
    renderWithProviders(<Layout />);

    const searchButton = screen.getByRole("button", { name: /search or type command/i });
    expect(searchButton).toBeInTheDocument();

    fireEvent.click(searchButton);

    expect(screen.getByRole("dialog", { name: /command palette/i })).toBeInTheDocument();
  });

  it("closes the command palette and restores focus to previously focused element when Escape is pressed", () => {
    renderWithProviders(<Layout />);

    const searchButton = screen.getByRole("button", { name: /search or type command/i });
    searchButton.focus();
    expect(searchButton).toHaveFocus();

    fireEvent.click(searchButton);
    expect(screen.getByRole("dialog", { name: /command palette/i })).toBeInTheDocument();

    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: /command palette/i })).not.toBeInTheDocument();
    expect(searchButton).toHaveFocus();
  });

  it("navigates and closes the palette when a navigation command is selected", () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="attestations" element={<div>Attestations Page Loaded</div>} />
        </Route>
      </Routes>
    );

    const searchButton = screen.getByRole("button", { name: /search or type command/i });
    fireEvent.click(searchButton);

    expect(screen.getByRole("dialog", { name: /command palette/i })).toBeInTheDocument();

    const attestationsOption = screen.getByRole("option", { name: /go to attestations/i });
    fireEvent.click(attestationsOption);

    // Palette closes
    expect(screen.queryByRole("dialog", { name: /command palette/i })).not.toBeInTheDocument();
    // Navigated to destination
    expect(screen.getByText("Attestations Page Loaded")).toBeInTheDocument();
  });

  it("supports the sequential chord Ctrl+K -> W to open workspace switcher in search mode", () => {
    renderWithProviders(<Layout />);

    // Step 1: Ctrl+K
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByRole("dialog", { name: /command palette/i })).toBeInTheDocument();

    // Step 2: W within chord window
    fireEvent.keyDown(document, { key: "w" });

    // Palette is closed and workspace switcher listbox is open in search mode
    expect(screen.queryByRole("dialog", { name: /command palette/i })).not.toBeInTheDocument();
    expect(screen.getByRole("listbox", { name: /select workspace/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Find workspace…")).toBeInTheDocument();
  });
});

