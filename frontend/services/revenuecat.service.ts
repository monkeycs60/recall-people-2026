import Purchases, { PurchasesOffering, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import { useSubscriptionStore } from '@/stores/subscription-store';

const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';
const ENTITLEMENT_ID = 'Recall People Pro';

const shouldPreserveDevPremiumStatus = (): boolean => {
  if (!__DEV__) return false;
  const store = useSubscriptionStore.getState();
  return store.isHydrated && store.isPremium;
};

export const revenueCatService = {
  initialize: async (userId?: string): Promise<void> => {
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

    if (!apiKey) {
      console.warn('[RevenueCat] API key not configured');
      return;
    }

    await Purchases.configure({ apiKey });

    if (userId) {
      await Purchases.logIn(userId);
    }

    // Set up listener for subscription changes
    // In dev mode, preserve local premium status to avoid losing fake payments
    Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      if (shouldPreserveDevPremiumStatus()) {
        console.log('[RevenueCat] Dev mode: preserving local premium status in listener');
        return;
      }
      const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      useSubscriptionStore.getState().setIsPremium(isPremium);
    });

    // Check initial subscription status
    await revenueCatService.refreshSubscriptionStatus();
  },

  refreshSubscriptionStatus: async (): Promise<boolean> => {
    try {
      // In dev mode, if user is already premium locally, don't override with RevenueCat status
      // This preserves fake payments for testing
      if (shouldPreserveDevPremiumStatus()) {
        console.log('[RevenueCat] Dev mode: preserving local premium status');
        return true;
      }

      const customerInfo = await Purchases.getCustomerInfo();
      const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      useSubscriptionStore.getState().setIsPremium(isPremium);
      return isPremium;
    } catch (error) {
      console.error('[RevenueCat] Failed to get customer info:', error);
      return false;
    }
  },

  getOfferings: async (): Promise<PurchasesOffering | null> => {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('[RevenueCat] Failed to get offerings:', error);
      return null;
    }
  },

  purchasePackage: async (packageId: string): Promise<boolean> => {
    try {
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;

      if (!currentOffering) {
        throw new Error('No offerings available');
      }

      const packageToPurchase = currentOffering.availablePackages.find(
        (pkg) => pkg.identifier === packageId
      );

      if (!packageToPurchase) {
        throw new Error(`Package ${packageId} not found`);
      }

      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      useSubscriptionStore.getState().setIsPremium(isPremium);

      return isPremium;
    } catch (error) {
      console.error('[RevenueCat] Purchase failed:', error);
      throw error;
    }
  },

  restorePurchases: async (): Promise<boolean> => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      useSubscriptionStore.getState().setIsPremium(isPremium);
      return isPremium;
    } catch (error) {
      console.error('[RevenueCat] Restore failed:', error);
      throw error;
    }
  },

  getManagementURL: async (): Promise<string | null> => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo.managementURL;
    } catch {
      return null;
    }
  },
};
