import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';

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

const STORAGE_KEY = 'lastfm_auth';
const API_KEY = import.meta.env.VITE_LASTFM_API_KEY;

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

  const handleCallback = useCallback(async (token: string): Promise<boolean> => {
    try {
      // Exchange token for session via backend
      const response = await fetch('/api/lastfm/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Failed to authenticate');
      }

      const { sessionKey, username } = await response.json();
      setState({ isAuthenticated: true, username, sessionKey });
      return true;
    } catch (error) {
      console.error('Last.fm auth error:', error);
      return false;
    }
  }, []);

  return (
    <LastFmAuthContext.Provider value={{ ...state, connect, disconnect, handleCallback }}>
      {children}
    </LastFmAuthContext.Provider>
  );
}

export function useLastFmAuth() {
  const context = useContext(LastFmAuthContext);
  if (!context) {
    throw new Error('useLastFmAuth must be used within LastFmAuthProvider');
  }
  return context;
}
