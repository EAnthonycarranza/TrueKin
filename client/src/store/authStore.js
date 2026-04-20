import { create } from 'zustand';
import { api } from '../api/client';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  checkAuth: async () => {
    try {
      const { user } = await api.getMe();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    const { user } = await api.login({ email, password });
    set({ user });
    return user;
  },

  register: async (name, email, password) => {
    const { user } = await api.register({ name, email, password });
    set({ user });
    return user;
  },

  logout: async () => {
    await api.logout();
    set({ user: null });
  },
}));
