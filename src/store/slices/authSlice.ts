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
  setAuth: (user: UserProfile, token: string) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  accessToken: null,
  setAuth: (user, token) => set({ user, accessToken: token, isAuthenticated: true, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () => set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false }),
});
