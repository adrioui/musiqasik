import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocalStorage } from "./useLocalStorage";

// Create a mock localStorage for testing
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
};

describe("useLocalStorage", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it("should return initialValue when key is missing", () => {
    const { result } = renderHook(() =>
      useLocalStorage("test-key", "default-value"),
    );

    expect(result.current[0]).toBe("default-value");
  });

  it("should return initialValue for complex types when key is missing", () => {
    const initialValue = { name: "test", count: 42 };
    const { result } = renderHook(() =>
      useLocalStorage("test-key", initialValue),
    );

    expect(result.current[0]).toEqual(initialValue);
  });

  it("should return stored value when key exists", () => {
    window.localStorage.setItem("test-key", JSON.stringify("stored-value"));

    const { result } = renderHook(() =>
      useLocalStorage("test-key", "default-value"),
    );

    expect(result.current[0]).toBe("stored-value");
  });

  it("should persist updates via setValue", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    act(() => {
      result.current[1]("updated");
    });

    expect(result.current[0]).toBe("updated");
    expect(JSON.parse(window.localStorage.getItem("test-key")!)).toBe(
      "updated",
    );
  });

  it("should handle functional updates", () => {
    const { result } = renderHook(() => useLocalStorage("counter", 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);

    act(() => {
      result.current[1]((prev) => prev + 5);
    });

    expect(result.current[0]).toBe(6);
    expect(JSON.parse(window.localStorage.getItem("counter")!)).toBe(6);
  });

  it("should handle array values", () => {
    const { result } = renderHook(() => useLocalStorage<string[]>("items", []));

    act(() => {
      result.current[1](["a", "b", "c"]);
    });

    expect(result.current[0]).toEqual(["a", "b", "c"]);
    expect(JSON.parse(window.localStorage.getItem("items")!)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("should handle object values", () => {
    const initialState = { theme: "light", fontSize: 14 };
    const { result } = renderHook(() =>
      useLocalStorage("settings", initialState),
    );

    act(() => {
      result.current[1]({ theme: "dark", fontSize: 16 });
    });

    expect(result.current[0]).toEqual({ theme: "dark", fontSize: 16 });
  });

  it("should fall back to initialValue on JSON parse failure", () => {
    // Set invalid JSON in localStorage
    window.localStorage.setItem("invalid-json", "not valid json {{{");

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { result } = renderHook(() =>
      useLocalStorage("invalid-json", "fallback"),
    );

    expect(result.current[0]).toBe("fallback");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should handle localStorage errors on write gracefully", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    // Mock localStorage.setItem to throw AFTER initial render
    const originalSetItem = localStorageMock.setItem;
    localStorageMock.setItem = vi.fn(() => {
      throw new Error("QuotaExceededError");
    });

    // Should not throw, should just warn
    act(() => {
      result.current[1]("new-value");
    });

    expect(consoleSpy).toHaveBeenCalled();

    // Restore original setItem
    localStorageMock.setItem = originalSetItem;
    consoleSpy.mockRestore();
  });

  it("should use same value across multiple hooks with same key", () => {
    window.localStorage.setItem("shared-key", JSON.stringify("shared-value"));

    const { result: result1 } = renderHook(() =>
      useLocalStorage("shared-key", "default1"),
    );
    const { result: result2 } = renderHook(() =>
      useLocalStorage("shared-key", "default2"),
    );

    expect(result1.current[0]).toBe("shared-value");
    expect(result2.current[0]).toBe("shared-value");
  });

  it("should handle boolean values", () => {
    const { result } = renderHook(() => useLocalStorage("enabled", false));

    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(JSON.parse(window.localStorage.getItem("enabled")!)).toBe(true);
  });

  it("should handle null values", () => {
    const { result } = renderHook(() =>
      useLocalStorage<string | null>("nullable", null),
    );

    expect(result.current[0]).toBe(null);

    act(() => {
      result.current[1]("not-null");
    });

    expect(result.current[0]).toBe("not-null");

    act(() => {
      result.current[1](null);
    });

    expect(result.current[0]).toBe(null);
  });
});
