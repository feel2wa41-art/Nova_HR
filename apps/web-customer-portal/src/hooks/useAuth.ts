import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  title?: string;
  permissions?: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => Promise<void>;
  hasRole: (role: string | string[]) => boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
  isHRManager: () => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          // Use real API
          const response = await authApi.login({ email, password });
          
          // Store tokens
          localStorage.setItem('nova_hr_token', response.accessToken);
          localStorage.setItem('nova_hr_refresh_token', response.refreshToken);
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        // Clear tokens
        localStorage.removeItem('nova_hr_token');
        localStorage.removeItem('nova_hr_refresh_token');
        
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      initializeAuth: async () => {
        const token = localStorage.getItem('nova_hr_token');
        if (token) {
          try {
            set({ isLoading: true });
            const userProfile = await authApi.getProfile();
            set({
              user: userProfile,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (error) {
            // Token is invalid, clear everything
            localStorage.removeItem('nova_hr_token');
            localStorage.removeItem('nova_hr_refresh_token');
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } else {
          set({ isLoading: false });
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      hasRole: (role: string | string[]) => {
        const { user } = get();
        if (!user) return false;
        
        if (Array.isArray(role)) {
          return role.includes(user.role);
        }
        return user.role === role;
      },

      hasPermission: (permission: string) => {
        const { user } = get();
        if (!user || !user.permissions) return false;
        return user.permissions.includes(permission);
      },

      isAdmin: () => {
        const { hasRole } = get();
        return hasRole(['SUPER_ADMIN', 'PROVIDER_ADMIN', 'CUSTOMER_ADMIN']);
      },

      isHRManager: () => {
        const { hasRole } = get();
        return hasRole(['SUPER_ADMIN', 'PROVIDER_ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER']);
      },
    }),
    {
      name: 'nova-hr-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);