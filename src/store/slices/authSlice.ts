import { StateCreator } from 'zustand';

export interface UserProfile {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string;
  phone: string;
  role: 'buyer' | 'admin';
  region_id: string | null;
  created_at?: string;
}

export interface AuthSlice {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  error: string | null;
  setAuth: (user: UserProfile, token: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  accessToken: null,
  error: null,
  setAuth: (user, token) => set({ user, accessToken: token, isAuthenticated: true, isLoading: false, error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  logout: () => set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false, error: null }),
});
