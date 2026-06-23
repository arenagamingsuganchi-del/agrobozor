import { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { logAnalyticsEvent } from '@/lib/analytics';

export interface CartItem {
  product_id: string;
  title: string;
  price: number;
  unit: string;
  quantity: number;
  image_url: string | null;
  seller_id: string;
  store_name: string;
  stock: number;
}

export interface CartSlice {
  cartItems: CartItem[];
  cartLoading: boolean;
  cartError: string | null;
  loadCart: (userId: string | null) => Promise<void>;
  addToCart: (item: CartItem, userId: string | null) => Promise<void>;
  removeFromCart: (productId: string, userId: string | null) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, userId: string | null) => Promise<void>;
  syncCart: (userId: string) => Promise<void>;
  clearCart: (userId: string | null) => Promise<void>;
}

interface DbCartItemProduct {
  title: string;
  price: number;
  unit: string;
  stock: number;
  seller_id: string;
  sellers: {
    store_name: string;
  } | null;
  product_images: {
    image_url: string;
    is_primary: boolean;
  }[];
}

interface DbCartItem {
  product_id: string;
  quantity: number;
  products: DbCartItemProduct | null;
}

export const createCartSlice: StateCreator<CartSlice, [], [], CartSlice> = (set, get) => ({
  cartItems: [],
  cartLoading: false,
  cartError: null,

  loadCart: async (userId) => {
    set({ cartLoading: true, cartError: null });
    try {
      if (!userId) {
        // Load guest cart from localStorage
        const localData = localStorage.getItem('agrobozor_guest_cart');
        const items = localData ? JSON.parse(localData) : [];
        set({ cartItems: items, cartLoading: false });
        return;
      }

      // Load authenticated cart from Supabase
      // 1. Get or create cart for user
      let cartId = '';
      const { data: cart, error: cartError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (cartError && cartError.code === 'PGRST116') {
        const { data: newCart, error: createError } = await supabase
          .from('carts')
          .insert({ user_id: userId })
          .select('id')
          .single();

        if (createError) throw createError;
        if (newCart) cartId = newCart.id;
      } else if (cartError) {
        throw cartError;
      } else if (cart) {
        cartId = cart.id;
      }

      if (!cartId) throw new Error('Savatchani yuklab bo\'lmadi.');

      // 2. Fetch cart items with details
      const { data: itemsData, error: itemsError } = await supabase
        .from('cart_items')
        .select(`
          product_id,
          quantity,
          products (
            title,
            price,
            unit,
            stock,
            seller_id,
            sellers (
              store_name
            ),
            product_images (
              image_url,
              is_primary
            )
          )
        `)
        .eq('cart_id', cartId);

      if (itemsError) throw itemsError;

      const dbItems = (itemsData || []) as unknown as DbCartItem[];

      const items: CartItem[] = dbItems
        .filter((item) => item.products !== null)
        .map((item) => {
          const prod = item.products!;
          const primaryImg = prod.product_images?.find((img) => img.is_primary) || prod.product_images?.[0];
          return {
            product_id: item.product_id,
            title: prod.title,
            price: prod.price,
            unit: prod.unit,
            quantity: Number(item.quantity),
            image_url: primaryImg ? primaryImg.image_url : null,
            seller_id: prod.seller_id,
            store_name: prod.sellers?.store_name || 'Agro Seller',
            stock: prod.stock,
          };
        });

      set({ cartItems: items, cartLoading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Savatni yuklashda xatolik.';
      set({ cartError: msg, cartLoading: false });
    }
  },

  addToCart: async (item, userId) => {
    set({ cartError: null });
    const currentItems = get().cartItems;
    const existing = currentItems.find((x) => x.product_id === item.product_id);
    let updatedItems: CartItem[] = [];

    if (existing) {
      updatedItems = currentItems.map((x) =>
        x.product_id === item.product_id
          ? { ...x, quantity: x.quantity + item.quantity }
          : x
      );
    } else {
      updatedItems = [...currentItems, item];
    }

    try {
      if (!userId) {
        // Save to localStorage
        localStorage.setItem('agrobozor_guest_cart', JSON.stringify(updatedItems));
        set({ cartItems: updatedItems });
        logAnalyticsEvent('add_to_cart', { product_id: item.product_id, quantity: item.quantity, guest: true });
        return;
      }

      // Save to Supabase
      let cartId = '';
      const { data: cart } = await supabase.from('carts').select('id').eq('user_id', userId).single();
      if (!cart) {
        const { data: newCart } = await supabase.from('carts').insert({ user_id: userId }).select('id').single();
        if (newCart) cartId = newCart.id;
      } else {
        cartId = cart.id;
      }
      if (!cartId) throw new Error('Savat topilmadi.');

      if (existing) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + item.quantity })
          .eq('cart_id', cartId)
          .eq('product_id', item.product_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cart_items')
          .insert({
            cart_id: cartId,
            product_id: item.product_id,
            quantity: item.quantity,
          });
        if (error) throw error;
      }

      set({ cartItems: updatedItems });
      logAnalyticsEvent('add_to_cart', { product_id: item.product_id, quantity: item.quantity, guest: false, user_id: userId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Savatga qo\'shishda xatolik.';
      set({ cartError: msg });
    }
  },

  removeFromCart: async (productId, userId) => {
    set({ cartError: null });
    const currentItems = get().cartItems;
    const updatedItems = currentItems.filter((x) => x.product_id !== productId);

    try {
      if (!userId) {
        // Remove from localStorage
        localStorage.setItem('agrobozor_guest_cart', JSON.stringify(updatedItems));
        set({ cartItems: updatedItems });
        logAnalyticsEvent('remove_from_cart', { product_id: productId, guest: true });
        return;
      }

      // Remove from DB
      const { data: cart } = await supabase.from('carts').select('id').eq('user_id', userId).single();
      if (cart) {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('cart_id', cart.id)
          .eq('product_id', productId);
        if (error) throw error;
      }

      set({ cartItems: updatedItems });
      logAnalyticsEvent('remove_from_cart', { product_id: productId, guest: false, user_id: userId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'O\'chirishda xatolik.';
      set({ cartError: msg });
    }
  },

  updateQuantity: async (productId, quantity, userId) => {
    if (quantity <= 0) return;
    set({ cartError: null });
    const currentItems = get().cartItems;
    const updatedItems = currentItems.map((x) =>
      x.product_id === productId ? { ...x, quantity } : x
    );

    try {
      if (!userId) {
        // Update in localStorage
        localStorage.setItem('agrobozor_guest_cart', JSON.stringify(updatedItems));
        set({ cartItems: updatedItems });
        return;
      }

      // Update in DB
      const { data: cart } = await supabase.from('carts').select('id').eq('user_id', userId).single();
      if (cart) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('cart_id', cart.id)
          .eq('product_id', productId);
        if (error) throw error;
      }

      set({ cartItems: updatedItems });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Miqdorni o\'zgartirishda xatolik.';
      set({ cartError: msg });
    }
  },

  syncCart: async (userId) => {
    // 1. Read guest items from localStorage
    const localData = localStorage.getItem('agrobozor_guest_cart');
    const guestItems: CartItem[] = localData ? JSON.parse(localData) : [];
    if (guestItems.length === 0) {
      // Just load current DB cart
      await get().loadCart(userId);
      return;
    }

    try {
      set({ cartLoading: true, cartError: null });
      
      // Get or create DB cart
      let cartId = '';
      const { data: cart } = await supabase.from('carts').select('id').eq('user_id', userId).single();
      if (!cart) {
        const { data: newCart } = await supabase.from('carts').insert({ user_id: userId }).select('id').single();
        if (newCart) cartId = newCart.id;
      } else {
        cartId = cart.id;
      }
      if (!cartId) throw new Error('Savat topilmadi.');

      // Load DB cart items to merge
      const { data: dbItemsData } = await supabase
        .from('cart_items')
        .select('product_id, quantity')
        .eq('cart_id', cartId);

      const dbItems = dbItemsData || [];

      // Merge items
      for (const guestItem of guestItems) {
        const existing = dbItems.find((x) => x.product_id === guestItem.product_id);
        if (existing) {
          const { error } = await supabase
            .from('cart_items')
            .update({ quantity: Number(existing.quantity) + guestItem.quantity })
            .eq('cart_id', cartId)
            .eq('product_id', guestItem.product_id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('cart_items')
            .insert({
              cart_id: cartId,
              product_id: guestItem.product_id,
              quantity: guestItem.quantity,
            });
          if (error) throw error;
        }
      }

      // Clear localStorage guest cart
      localStorage.removeItem('agrobozor_guest_cart');
      
      // Load unified DB cart
      await get().loadCart(userId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Savatni birlashtirishda xatolik.';
      set({ cartError: msg, cartLoading: false });
    }
  },

  clearCart: async (userId) => {
    try {
      if (!userId) {
        localStorage.removeItem('agrobozor_guest_cart');
        set({ cartItems: [] });
        return;
      }

      const { data: cart } = await supabase.from('carts').select('id').eq('user_id', userId).single();
      if (cart) {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('cart_id', cart.id);
        if (error) throw error;
      }
      set({ cartItems: [] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Savatni tozalashda xatolik.';
      set({ cartError: msg });
    }
  },
});
