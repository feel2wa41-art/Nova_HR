import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@nova-hr/shared';
import { getStoredToken, removeStoredToken } from '../utils/storage';
import { isTokenValid } from '../utils/token';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      
      if (token && isTokenValid(token)) {
        // TODO: Validate token with server and get user info
        // For now, just check if token exists and is valid
        setIsLoading(false);
      } else {
        removeStoredToken();
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = (userData: User, token: string) => {
    setUser(userData);
    // Token storage is handled by the login hook
  };

  const logout = () => {
    setUser(null);
    removeStoredToken();
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};