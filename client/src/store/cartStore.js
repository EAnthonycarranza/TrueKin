import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, quantity = 1, color = null, size = null, shirtStyle = 'mens') => {
        const items = get().items;
        // Match by product ID + color + size + shirtStyle
        const existingIndex = items.findIndex(
          (item) =>
            item.productId === product._id &&
            (item.color || null) === color &&
            (item.size || null) === size &&
            (item.shirtStyle || 'mens') === shirtStyle
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

      get totalItems() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      get totalPrice() {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
      },
    }),
    {
      name: 'tshirt-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
