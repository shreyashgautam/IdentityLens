import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthState, AuthUser } from '../types/auth';
import {
  loginApi,
  verifyOtpApi,
  resendOtpApi,
  registerApi,
  logoutApi,
  refreshApi,
  meApi,
  setAccessToken,
  getAccessToken,
  type LoginResult
} from '../services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyOtp: (mfaToken: string, otp: string) => Promise<{ accessToken: string; user: AuthUser }>;
  resendOtp: (mfaToken: string) => Promise<{ mfaToken: string; expiresIn: number; otpCode?: string; message: string }>;
  register: (organization: string, email: string, password: string, displayName?: string) => Promise<void>;
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

  // Silent session restoration on application startup/reload
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        // 1. Fast path: If session token exists in sessionStorage, verify active session
        const existingToken = getAccessToken();
        if (existingToken) {
          try {
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
          } catch {
            // Existing token expired or invalid; fall through to refresh rotation
          }
        }

        // 2. Slow path: Silently rotate refresh token via HttpOnly cookie only if user previously authenticated
        const hadPriorSession = sessionStorage.getItem('identitylens_has_session') === 'true' || !!getAccessToken();
        if (hadPriorSession) {
          const refreshResult = await refreshApi();
          if (refreshResult?.accessToken) {
            setAccessToken(refreshResult.accessToken);
            sessionStorage.setItem('identitylens_has_session', 'true');
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
    setState((prev) => ({ ...prev, error: null }));
    try {
      const data = await loginApi(email, password);
      if (data.mfaRequired) {
        return data;
      }
      if (data.accessToken && data.user) {
        setAccessToken(data.accessToken);
        setState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      }
      return data;
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

  const verifyOtp = useCallback(async (mfaToken: string, otp: string) => {
    setState((prev) => ({ ...prev, error: null }));
    try {
      const data = await verifyOtpApi(mfaToken, otp);
      setAccessToken(data.accessToken);
      sessionStorage.setItem('identitylens_has_session', 'true');
      setState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid verification code. Please check and try again.';
      setState((prev) => ({
        ...prev,
        error: message
      }));
      throw err;
    }
  }, []);

  const resendOtp = useCallback(async (mfaToken: string) => {
    try {
      return await resendOtpApi(mfaToken);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend code.';
      setState((prev) => ({ ...prev, error: message }));
      throw err;
    }
  }, []);

  const register = useCallback(async (organization: string, email: string, password: string, displayName?: string) => {
    setState((prev) => ({ ...prev, error: null }));
    try {
      const data = await registerApi({ organization, email, password, displayName });
      setAccessToken(data.accessToken);
      sessionStorage.setItem('identitylens_has_session', 'true');
      setState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
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
      sessionStorage.removeItem('identitylens_has_session');
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
        verifyOtp,
        resendOtp,
        register,
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
