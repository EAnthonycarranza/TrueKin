import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, quantity = 1, color = null, size = null, shirtStyle = 'unisex') => {
        const items = get().items;
        // Match by product ID + color + size + shirtStyle
        const existingIndex = items.findIndex(
          (item) =>
            item.productId === product._id &&
            (item.color || null) === color &&
            (item.size || null) === size &&
            (item.shirtStyle || 'unisex') === shirtStyle
        );

        if (existingIndex >= 0) {
          const newItems = [...items];
          newItems[existingIndex].quantity += quantity;
          set({ items: newItems });
        } else {
          set({
            items: [
              ...items,
              {
                productId: product._id,
                title: product.title,
                price: product.price,
                imageUrl: product.imageUrls[0] || '',
                quantity,
                color,
                size,
                shirtStyle,
              },
            ],
          });
        }
      },

      removeItem: (index) => {
        set({ items: get().items.filter((_, i) => i !== index) });
      },

      updateQuantity: (index, quantity) => {
        if (quantity < 1) return;
        const newItems = [...get().items];
        newItems[index].quantity = quantity;
        set({ items: newItems });
      },

      clearCart: () => set({ items: [] }),

      toggleCart: () => set({ isOpen: !get().isOpen }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      // NB: no computed `totalItems` / `totalPrice` getters here.
      //
      // persist() rehydrates by spreading the freshly-created state into the
      // stored one, and spreading *invokes* any getter on the object. At that
      // moment the store is still being constructed, so `get()` returns
      // undefined, the getter throws, and persist swallows the error and
      // discards the whole saved cart — every reload emptied the bag.
      //
      // Both totals are one `reduce` over `items` and every call site already
      // does it locally (Navbar, CartDrawer, Cart, Checkout), so there was
      // nothing to replace them with.
    }),
    {
      name: 'tshirt-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
