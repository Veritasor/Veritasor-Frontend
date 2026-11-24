import { FunctionalConsentWrapper, grantFunctionalConsent } from '../test/functional-consent-fixture'
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DensityToggle from "./DensityToggle";

describe("DensityToggle", () => {
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchMock = vi.spyOn(global, "fetch").mockImplementation(async () => {
      return {
        ok: true,
        json: async () => ({ density: "comfortable" }),
      } as Response;
    });
    localStorage.clear();
    grantFunctionalConsent();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders correctly with default state", () => {
    render(<DensityToggle workspace="test-ws" />, { wrapper: FunctionalConsentWrapper });
    
    const group = screen.getByRole("radiogroup", { name: "Display density" });
    expect(group).toBeInTheDocument();
    
    const comfortable = screen.getByRole("radio", { name: /Comfortable/i });
    const compact = screen.getByRole("radio", { name: /Compact/i });
    
    expect(comfortable).toBeInTheDocument();
    expect(compact).toBeInTheDocument();
    
    expect(comfortable).toHaveAttribute("aria-checked", "true");
    expect(compact).toHaveAttribute("aria-checked", "false");
  });

  it("changes state to compact when clicked", async () => {
    render(<DensityToggle workspace="test-ws" />, { wrapper: FunctionalConsentWrapper });
    
    const compact = screen.getByRole("radio", { name: /Compact/i });
    fireEvent.click(compact);
    
    expect(compact).toHaveAttribute("aria-checked", "true");
    
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/preferences/density"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ workspace: "test-ws", density: "compact" }),
      })
    );
  });

  it("handles server failure and rolls back state", async () => {
    fetchMock.mockImplementation(async (_url: unknown, options?: RequestInit) => {
      if (options?.method === 'PUT') {
         return { ok: false } as Response;
      }
      return { ok: true, json: async () => ({ density: "comfortable" }) } as Response;
    });
    
    const onPersistError = vi.fn();
    render(<DensityToggle workspace="test-ws" onPersistError={onPersistError} />, { wrapper: FunctionalConsentWrapper });
    
    const compact = screen.getByRole("radio", { name: /Compact/i });
    fireEvent.click(compact);
    
    // optimistically sets to true
    expect(compact).toHaveAttribute("aria-checked", "true");
    
    await waitFor(() => {
      expect(onPersistError).toHaveBeenCalledWith("Could not save density preference. Changes reverted.");
    });
    
    const comfortable = screen.getByRole("radio", { name: /Comfortable/i });
    expect(comfortable).toHaveAttribute("aria-checked", "true");
    expect(compact).toHaveAttribute("aria-checked", "false");
  });

  it("handles network error and rolls back state", async () => {
    fetchMock.mockImplementation(async (_url: unknown, options?: RequestInit) => {
      if (options?.method === 'PUT') {
         return Promise.reject(new Error("Network Error"));
      }
      return { ok: true, json: async () => ({ density: "comfortable" }) } as Response;
    });
    
    const onPersistError = vi.fn();
    render(<DensityToggle workspace="test-ws" onPersistError={onPersistError} />, { wrapper: FunctionalConsentWrapper });
    
    const compact = screen.getByRole("radio", { name: /Compact/i });
    fireEvent.click(compact);
    
    await waitFor(() => {
      expect(onPersistError).toHaveBeenCalledWith("Could not save density preference. Changes reverted.");
    });
    
    const comfortable = screen.getByRole("radio", { name: /Comfortable/i });
    expect(comfortable).toHaveAttribute("aria-checked", "true");
  });

  it("works gracefully when onPersistError is not provided and an error occurs", async () => {
    fetchMock.mockImplementation(async (_url: unknown, options?: RequestInit) => {
      if (options?.method === 'PUT') {
         return { ok: false } as Response;
      }
      return { ok: true, json: async () => ({ density: "comfortable" }) } as Response;
    });
    
    render(<DensityToggle workspace="test-ws" />, { wrapper: FunctionalConsentWrapper });
    
    const compact = screen.getByRole("radio", { name: /Compact/i });
    fireEvent.click(compact);
    
    await waitFor(() => {
      const comfortable = screen.getByRole("radio", { name: /Comfortable/i });
      expect(comfortable).toHaveAttribute("aria-checked", "true");
    });
  });

  it("handles empty workspace prop (invalid input representation)", () => {
    render(<DensityToggle workspace="" />, { wrapper: FunctionalConsentWrapper });
    const comfortable = screen.getByRole("radio", { name: /Comfortable/i });
    expect(comfortable).toBeInTheDocument();
  });

  it("implements roving tabindex with only the selected radio tabbable", () => {
    render(<DensityToggle workspace="test-ws" />, { wrapper: FunctionalConsentWrapper });
    const comfortable = screen.getByRole("radio", { name: /Comfortable/i });
    const compact = screen.getByRole("radio", { name: /Compact/i });

    expect(comfortable).toHaveAttribute("tabindex", "0");
    expect(compact).toHaveAttribute("tabindex", "-1");

    fireEvent.click(compact);

    expect(comfortable).toHaveAttribute("tabindex", "-1");
    expect(compact).toHaveAttribute("tabindex", "0");
  });

  it("changes selection and moves focus with arrow keys, Home, and End", () => {
    render(<DensityToggle workspace="test-ws" />, { wrapper: FunctionalConsentWrapper });
    const comfortable = screen.getByRole("radio", { name: /Comfortable/i });
    const compact = screen.getByRole("radio", { name: /Compact/i });

    comfortable.focus();
    fireEvent.keyDown(comfortable, { key: "ArrowRight" });
    expect(compact).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(compact);

    fireEvent.keyDown(compact, { key: "ArrowLeft" });
    expect(comfortable).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(comfortable);

    fireEvent.keyDown(comfortable, { key: "ArrowDown" });
    expect(compact).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(compact);

    fireEvent.keyDown(compact, { key: "ArrowUp" });
    expect(comfortable).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(comfortable);

    fireEvent.keyDown(comfortable, { key: "End" });
    expect(compact).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(compact);

    fireEvent.keyDown(compact, { key: "Home" });
    expect(comfortable).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(comfortable);
  });

  it("announces density changes politely in a status live region", () => {
    render(<DensityToggle workspace="test-ws" />, { wrapper: FunctionalConsentWrapper });
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("");

    const comfortable = screen.getByRole("radio", { name: /Comfortable/i });
    fireEvent.keyDown(comfortable, { key: "ArrowRight" });
    expect(status).toHaveTextContent("Display density changed to Compact");
  });
});
