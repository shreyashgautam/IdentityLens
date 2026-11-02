import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthState } from '../types/auth';
import { loginApi, logoutApi, refreshApi, meApi, setAccessToken } from '../services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // Silent session restoration on application startup via HttpOnly refresh cookie
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const refreshResult = await refreshApi();
        if (refreshResult?.accessToken) {
          setAccessToken(refreshResult.accessToken);
          const meData = await meApi();
          if (isMounted) {
            setState({
              user: meData.user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            return;
          }
        }
      } catch {
        // Session does not exist or refresh token expired
      }

      if (isMounted) {
        setAccessToken(null);
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await loginApi(email, password);
      setAccessToken(data.accessToken);
      setState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setAccessToken(null);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: message
      });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } finally {
      setAccessToken(null);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
