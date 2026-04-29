import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  PurchasesOffering,
  STOREKIT_VERSION,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { useSubscriptionStore } from '@/stores/subscription-store';

const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';
const ENTITLEMENT_IDS = ['premium', 'Recall People Pro'];

let configurePromise: Promise<void> | null = null;
let isConfigured = false;
let configuredUserId: string | null = null;
let hasCustomerInfoListener = false;

const shouldPreserveDevPremiumStatus = (): boolean => {
  if (!__DEV__) return false;
  const store = useSubscriptionStore.getState();
  return store.isHydrated && store.isPremium;
};

const getRevenueCatApiKey = (): string => {
  if (Platform.OS === 'ios') return REVENUECAT_API_KEY_IOS;
  if (Platform.OS === 'android') return REVENUECAT_API_KEY_ANDROID;
  return '';
};

const hasPremiumEntitlement = (customerInfo: Awaited<ReturnType<typeof Purchases.getCustomerInfo>>): boolean =>
  ENTITLEMENT_IDS.some((entitlementId) => customerInfo.entitlements.active[entitlementId] !== undefined);

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const registerCustomerInfoListener = () => {
  if (hasCustomerInfoListener) return;

  hasCustomerInfoListener = true;
  Purchases.addCustomerInfoUpdateListener((customerInfo) => {
    if (shouldPreserveDevPremiumStatus()) {
      console.log('[RevenueCat] Dev mode: preserving local premium status in listener');
      return;
    }

    useSubscriptionStore.getState().setIsPremium(hasPremiumEntitlement(customerInfo));
  });
};

const ensureConfigured = async (userId?: string): Promise<void> => {
  const apiKey = getRevenueCatApiKey();

  if (!apiKey) {
    throw new Error(`[RevenueCat] Missing ${Platform.OS} API key`);
  }

  const nativeIsConfigured = await Purchases.isConfigured().catch(() => isConfigured);

  if (!nativeIsConfigured && !configurePromise) {
    configurePromise = (async () => {
      await Purchases.setLogLevel(LOG_LEVEL.DEBUG).catch((error) => {
        console.warn('[RevenueCat] Failed to enable debug logs:', error);
      });

      Purchases.configure({
        apiKey,
        appUserID: userId,
        storeKitVersion: STOREKIT_VERSION.STOREKIT_2,
      });

      isConfigured = true;
      configuredUserId = userId ?? null;
      registerCustomerInfoListener();
      console.log('[RevenueCat] Configured', {
        platform: Platform.OS,
        hasUserId: Boolean(userId),
      });
    })().catch((error) => {
      configurePromise = null;
      isConfigured = false;
      configuredUserId = null;
      throw error;
    });
  }

  if (configurePromise) {
    await configurePromise;
  } else {
    isConfigured = true;
    registerCustomerInfoListener();
  }

  if (userId && configuredUserId !== userId) {
    await Purchases.logIn(userId);
    configuredUserId = userId;
  }
};

export const revenueCatService = {
  initialize: async (userId?: string): Promise<void> => {
    try {
      await ensureConfigured(userId);
      await revenueCatService.refreshSubscriptionStatus();
    } catch (error) {
      console.error('[RevenueCat] Initialization failed:', error);
    }
  },

  refreshSubscriptionStatus: async (): Promise<boolean> => {
    try {
      await ensureConfigured(configuredUserId ?? undefined);

      // In dev mode, if user is already premium locally, don't override with RevenueCat status
      // This preserves fake payments for testing
      if (shouldPreserveDevPremiumStatus()) {
        console.log('[RevenueCat] Dev mode: preserving local premium status');
        return true;
      }

      const customerInfo = await Purchases.getCustomerInfo();
      const isPremium = hasPremiumEntitlement(customerInfo);
      useSubscriptionStore.getState().setIsPremium(isPremium);
      return isPremium;
    } catch (error) {
      console.error('[RevenueCat] Failed to get customer info:', error);
      return false;
    }
  },

  getOfferings: async (userId?: string): Promise<PurchasesOffering> => {
    await ensureConfigured(userId ?? configuredUserId ?? undefined);

    const offerings = await Purchases.getOfferings();
    const currentOffering = offerings.current;
    const availablePackages = currentOffering?.availablePackages.map((pkg) => ({
      identifier: pkg.identifier,
      packageType: pkg.packageType,
      productIdentifier: pkg.product.identifier,
      price: pkg.product.priceString,
    })) ?? [];

    console.log('[RevenueCat] Offerings loaded', {
      currentOffering: currentOffering?.identifier ?? null,
      allOfferings: Object.keys(offerings.all ?? {}),
      availablePackages,
    });

    if (!currentOffering) {
      throw new Error('No current offering configured in RevenueCat');
    }

    if (availablePackages.length === 0) {
      throw new Error(`RevenueCat offering "${currentOffering.identifier}" has no available packages`);
    }

    return currentOffering;
  },

  purchasePackage: async (packageId: string): Promise<boolean> => {
    try {
      const currentOffering = await revenueCatService.getOfferings();

      const packageToPurchase = currentOffering.availablePackages.find(
        (pkg) =>
          pkg.identifier === packageId ||
          (packageId === '$rc_monthly' && pkg.packageType === PACKAGE_TYPE.MONTHLY) ||
          (packageId === '$rc_annual' && pkg.packageType === PACKAGE_TYPE.ANNUAL)
      );

      if (!packageToPurchase) {
        throw new Error(`Package ${packageId} not found`);
      }

      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      const isPremium = hasPremiumEntitlement(customerInfo);
      useSubscriptionStore.getState().setIsPremium(isPremium);

      return isPremium;
    } catch (error) {
      console.error('[RevenueCat] Purchase failed:', error);
      throw error;
    }
  },

  restorePurchases: async (): Promise<boolean> => {
    try {
      await ensureConfigured(configuredUserId ?? undefined);
      const customerInfo = await Purchases.restorePurchases();
      const isPremium = hasPremiumEntitlement(customerInfo);
      useSubscriptionStore.getState().setIsPremium(isPremium);
      return isPremium;
    } catch (error) {
      console.error('[RevenueCat] Restore failed:', error);
      throw error;
    }
  },

  getManagementURL: async (): Promise<string | null> => {
    try {
      await ensureConfigured(configuredUserId ?? undefined);
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo.managementURL;
    } catch (error) {
      console.warn('[RevenueCat] Failed to get management URL:', getErrorMessage(error));
      return null;
    }
  },
};
