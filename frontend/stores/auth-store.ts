import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getToken, getUser, verifyToken, clearAuth } from '@/lib/auth';
import { getUserSettings } from '@/lib/api';
import { useSettingsStore } from './settings-store';
import { useSubscriptionStore } from './subscription-store';
import { changeLanguage } from '@/lib/i18n';
import { Language, SUPPORTED_LANGUAGES } from '@/types';

const isE2ETest = process.env.EXPO_PUBLIC_E2E_TEST === 'true';

// Mock user for E2E tests
const E2E_MOCK_USER = {
  id: 'e2e-test-user',
  email: 'e2e@test.com',
  name: 'E2E Test User',
  provider: 'credentials' as const,
};

type User = {
  id: string;
  email: string;
  name: string;
  provider?: 'credentials' | 'google';
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

        // E2E mode: bypass auth and use mock user
        if (isE2ETest) {
          console.log('[E2E] Using mock user, bypassing authentication');
          set({ user: E2E_MOCK_USER, isLoading: false, isInitialized: true });
          useSubscriptionStore.getState().checkWhitelistStatus();
          return;
        }

        try {
          const token = await getToken();

          if (!token) {
            set({ user: null, isLoading: false, isInitialized: true });
            return;
          }

          const user = await verifyToken();
          set({ user, isLoading: false, isInitialized: true });

          // Check if user is in Pro whitelist
          useSubscriptionStore.getState().checkWhitelistStatus();

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
