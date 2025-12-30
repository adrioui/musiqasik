import { Effect } from "effect";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { NetworkError } from "@/lib/errors";

interface LastFmAuthState {
  isAuthenticated: boolean;
  username: string | null;
  sessionKey: string | null;
}

interface LastFmAuthContextValue extends LastFmAuthState {
  connect: () => void;
  disconnect: () => void;
  handleCallback: (token: string) => Promise<boolean>;
}

const LastFmAuthContext = createContext<LastFmAuthContextValue | null>(null);

const STORAGE_KEY = "lastfm_auth";
const API_KEY = import.meta.env.VITE_LASTFM_API_KEY;

// Effect-based API call for token exchange
const exchangeToken = (token: string) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch("/api/lastfm/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }),
      catch: (error) =>
        new NetworkError({
          message: "Failed to connect to server",
          cause: error,
        }),
    });

    if (!response.ok) {
      return yield* Effect.fail(
        new NetworkError({ message: `Server error: ${response.status}` }),
      );
    }

    const data = yield* Effect.tryPromise({
      try: () =>
        response.json() as Promise<{ sessionKey: string; username: string }>,
      catch: (error) =>
        new NetworkError({ message: "Invalid server response", cause: error }),
    });

    return data;
  });

export function LastFmAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LastFmAuthState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Invalid stored data
      }
    }
    return { isAuthenticated: false, username: null, sessionKey: null };
  });

  // Persist state to localStorage
  useEffect(() => {
    if (state.isAuthenticated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state]);

  const connect = useCallback(() => {
    // Redirect to Last.fm authorization
    const callbackUrl = `${window.location.origin}/auth/callback`;
    const authUrl = `https://www.last.fm/api/auth/?api_key=${API_KEY}&cb=${encodeURIComponent(callbackUrl)}`;
    window.location.href = authUrl;
  }, []);

  const disconnect = useCallback(() => {
    setState({ isAuthenticated: false, username: null, sessionKey: null });
  }, []);

  const handleCallback = useCallback(
    async (token: string): Promise<boolean> => {
      const result = await Effect.runPromise(
        exchangeToken(token).pipe(
          Effect.map((data) => ({ success: true as const, data })),
          Effect.catchAll((error) =>
            Effect.succeed({ success: false as const, error: error.message }),
          ),
        ),
      );

      if (result.success) {
        setState({
          isAuthenticated: true,
          username: result.data.username,
          sessionKey: result.data.sessionKey,
        });
        return true;
      }

      console.error("Last.fm auth error:", result.error);
      return false;
    },
    [],
  );

  return (
    <LastFmAuthContext.Provider
      value={{ ...state, connect, disconnect, handleCallback }}
    >
      {children}
    </LastFmAuthContext.Provider>
  );
}

export function useLastFmAuth() {
  const context = useContext(LastFmAuthContext);
  if (!context) {
    throw new Error("useLastFmAuth must be used within LastFmAuthProvider");
  }
  return context;
}
