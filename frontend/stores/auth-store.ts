import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getToken, getUser, verifyToken, clearAuth } from '@/lib/auth';
import { getUserSettings } from '@/lib/api';
import { useSettingsStore } from './settings-store';
import { changeLanguage } from '@/lib/i18n';
import { Language, SUPPORTED_LANGUAGES } from '@/types';

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
      isLoading: false,
      isInitialized: false,

      setUser: (user) => set({ user }),

      initialize: async () => {
        const state = get();

        // Prevent multiple concurrent initializations
        if (state.isInitialized || state.isLoading) return;

        set({ isLoading: true });

        try {
          const token = await getToken();

          if (!token) {
            set({ user: null, isLoading: false, isInitialized: true });
            return;
          }

          const user = await verifyToken();
          set({ user, isLoading: false, isInitialized: true });

          // Sync language from backend
          try {
            const { user: settings } = await getUserSettings();
            if (settings.preferredLanguage && SUPPORTED_LANGUAGES.includes(settings.preferredLanguage as Language)) {
              useSettingsStore.getState().setLanguage(settings.preferredLanguage as Language);
              changeLanguage(settings.preferredLanguage as Language);
            }
          } catch {
            // Ignore settings sync errors
          }
        } catch {
          await clearAuth();
          set({ user: null, isLoading: false, isInitialized: true });
        }
      },

      logout: async () => {
        await clearAuth();
        set({ user: null, isInitialized: false });
      },
    }),
    { name: 'auth-store' }
  )
);

// Reset initialization flag on module reload (for development hot reload)
if (__DEV__) {
  useAuthStore.setState({ isInitialized: false });
}
