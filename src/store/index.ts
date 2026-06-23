import { create } from 'zustand';
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createCartSlice, CartSlice } from './slices/cartSlice';

// Combine slices for auth and shopping cart
export type StoreState = AuthSlice & CartSlice;

export const useStore = create<StoreState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createCartSlice(...a),
}));
