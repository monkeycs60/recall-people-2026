import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getToken, getUser, verifyToken, clearAuth } from '@/lib/auth';

type User = {
  id: string;
  email: string;
  name: string;
};

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
};

type AuthActions = {
  setUser: (user: User | null) => void;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    (set, get) => ({
      user: null,
      isLoading: true,
      isInitialized: false,

      setUser: (user) => set({ user }),

      initialize: async () => {
        if (get().isInitialized) return;

        set({ isLoading: true });

        try {
          const token = await getToken();

          if (!token) {
            set({ user: null, isLoading: false, isInitialized: true });
            return;
          }

          const user = await verifyToken();
          set({ user, isLoading: false, isInitialized: true });
        } catch {
          await clearAuth();
          set({ user: null, isLoading: false, isInitialized: true });
        }
      },

      logout: async () => {
        await clearAuth();
        set({ user: null });
      },
    }),
    { name: 'auth-store' }
  )
);
