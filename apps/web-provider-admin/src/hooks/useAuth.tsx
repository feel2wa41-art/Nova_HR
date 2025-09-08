import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { authAPI } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Create default context value to prevent errors during hot reloading
const defaultAuthContext: AuthContextType = {
  user: null,
  login: async () => {},
  logout: () => {},
  isLoading: false,
  isAuthenticated: false,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const useAuth = () => {
  const context = useContext(AuthContext);
  // With the default context, this should never be null, but keep the check for safety
  if (!context || context === defaultAuthContext) {
    // During development, this might happen during hot reloads
    console.warn('useAuth called without AuthProvider or during hot reload');
  }
  return context;
};

export const useAuthProvider = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('provider_admin_token');
      const storedUser = localStorage.getItem('provider_admin_user');

      if (token && storedUser) {
        try {
          // Verify token is still valid
          const profile = await authAPI.getProfile();
          setUser(profile);
        } catch (error) {
          // Token is invalid, clear storage
          localStorage.removeItem('provider_admin_token');
          localStorage.removeItem('provider_admin_user');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      const { accessToken, user: userData } = response;
      
      // Store auth data
      localStorage.setItem('provider_admin_token', accessToken);
      localStorage.setItem('provider_admin_user', JSON.stringify(userData));
      
      setUser(userData);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('provider_admin_token');
    localStorage.removeItem('provider_admin_user');
    setUser(null);
  };

  return {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user,
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuthProvider();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};