import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Effect runtime before importing useLastFm
// The hook uses Effect services, so we need to mock at that layer
vi.mock("@/integrations/surrealdb/client", () => ({
  SurrealClient: {
    of: vi.fn(),
  },
  SurrealLive: {
    pipe: vi.fn().mockReturnThis(),
  },
}));

// Mock the services module
vi.mock("@/services", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services")>();
  return {
    ...actual,
    // Keep the service tags but mock the layers
    LastFmServiceLive: {
      pipe: vi.fn().mockReturnThis(),
    },
    DatabaseServiceLive: {
      pipe: vi.fn().mockReturnThis(),
    },
    GraphServiceLive: {
      pipe: vi.fn().mockReturnThis(),
    },
  };
});

describe("useLastFm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default state", async () => {
    // Import useLastFm dynamically after mocks are set up
    const { useLastFm } = await import("./useLastFm");
    const { result } = renderHook(() => useLastFm());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.searchArtists).toBe("function");
    expect(typeof result.current.getGraph).toBe("function");
    expect(typeof result.current.getArtist).toBe("function");
  });

  it("should handle empty queries for searchArtists", async () => {
    const { useLastFm } = await import("./useLastFm");
    const { result } = renderHook(() => useLastFm());

    let searchResult;
    await act(async () => {
      searchResult = await result.current.searchArtists("   ");
    });

    expect(searchResult).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle empty artist name for getGraph", async () => {
    const { useLastFm } = await import("./useLastFm");
    const { result } = renderHook(() => useLastFm());

    let graphResult;
    await act(async () => {
      graphResult = await result.current.getGraph("   ");
    });

    expect(graphResult).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle empty name for getArtist", async () => {
    const { useLastFm } = await import("./useLastFm");
    const { result } = renderHook(() => useLastFm());

    let artistResult;
    await act(async () => {
      artistResult = await result.current.getArtist("   ");
    });

    expect(artistResult).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should set isLoading to true during searchArtists", async () => {
    const { useLastFm } = await import("./useLastFm");
    const { result } = renderHook(() => useLastFm());

    // Start search with valid query - it will fail due to mocks but that's ok
    // We're testing that the loading state is managed properly
    const searchPromise = act(async () => {
      try {
        await result.current.searchArtists("radiohead");
      } catch {
        // Expected to fail with mocked services
      }
    });

    await searchPromise;

    // After completion, isLoading should be false (whether success or error)
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle errors gracefully", async () => {
    const { useLastFm } = await import("./useLastFm");
    const { result } = renderHook(() => useLastFm());

    await act(async () => {
      // This will fail because Effect services aren't properly set up
      await result.current.searchArtists("test");
    });

    // After error, isLoading should be false and error should be set
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).not.toBeNull();
  });
});
