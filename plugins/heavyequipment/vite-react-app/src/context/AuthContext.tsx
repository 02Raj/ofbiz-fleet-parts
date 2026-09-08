import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, checkSession, logout as apiLogout } from '../api/client';
import type { SessionResponse } from '../api/client';

interface User {
  userLoginId: string;
  partyId?: string;
  displayName: string;
  roles: string[];
  isPlatformAdmin: boolean;
  tenantId?: string;
  tenantName?: string;
}

interface LoginResult {
  success: boolean;
  isPlatformAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginError: string | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Check existing session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session: SessionResponse = await checkSession();
        if (session.authenticated && session.userLoginId) {
          setUser({
            userLoginId: session.userLoginId,
            partyId: session.partyId,
            displayName: session.displayName || session.userLoginId,
            roles: session.roles || [],
            isPlatformAdmin: session.isPlatformAdmin || false,
            tenantId: session.tenantId,
            tenantName: session.tenantName,
          });
        }
      } catch {
        // Session check failed, user is not authenticated
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<LoginResult> => {
    setLoginError(null);
    setIsLoading(true);

    try {
      const result = await apiLogin(username, password);

      if (result.success && result.userLoginId) {
        const isPlatformAdmin = result.isPlatformAdmin || false;
        setUser({
          userLoginId: result.userLoginId,
          partyId: result.partyId,
          displayName: result.displayName || result.userLoginId,
          roles: result.roles || [],
          isPlatformAdmin: isPlatformAdmin,
          tenantId: result.tenantId,
          tenantName: result.tenantName,
        });
        setIsLoading(false);
        return { success: true, isPlatformAdmin };
      } else {
        setLoginError(result.error || 'Login failed');
        setIsLoading(false);
        return { success: false };
      }
    } catch {
      setLoginError('Network error. Make sure OFBiz is running.');
      setIsLoading(false);
      return { success: false };
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, loginError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
