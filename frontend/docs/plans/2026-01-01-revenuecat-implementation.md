# RevenueCat Monetization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement freemium monetization with RevenueCat - 5 notes/month free (1 min max), unlimited for premium (3 min max), AI search premium-only.

**Architecture:** Zustand store for subscription state with AsyncStorage persistence. RevenueCat SDK handles purchases and entitlement verification. Recording limits enforced in useRecording hook.

**Tech Stack:** react-native-purchases (RevenueCat), Zustand, expo-audio

---

## Task 1: Install RevenueCat SDK

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install the package**

Run:
```bash
cd /home/clement/Desktop/recall-people-2026/frontend && npm install react-native-purchases
```

**Step 2: Rebuild the app (iOS/Android native code required)**

Run:
```bash
cd /home/clement/Desktop/recall-people-2026/frontend && npx expo prebuild --clean
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install react-native-purchases (RevenueCat SDK)"
```

---

## Task 2: Create Subscription Store

**Files:**
- Create: `frontend/stores/subscription-store.ts`

**Step 1: Create the store file**

```typescript
import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SubscriptionState = {
  isPremium: boolean;
  notesCreatedThisMonth: number;
  currentMonthKey: string; // Format: "2026-01"
  isHydrated: boolean;
};

type SubscriptionActions = {
  setIsPremium: (isPremium: boolean) => void;
  incrementNotesCount: () => void;
  canCreateNote: () => boolean;
  getMaxRecordingDuration: () => number;
  resetMonthlyCountIfNeeded: () => void;
  setHydrated: (hydrated: boolean) => void;
};

const getCurrentMonthKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const FREE_NOTES_PER_MONTH = 5;
const FREE_MAX_DURATION_SECONDS = 60; // 1 minute
const PREMIUM_MAX_DURATION_SECONDS = 180; // 3 minutes

export const useSubscriptionStore = create<SubscriptionState & SubscriptionActions>()(
  devtools(
    persist(
      (set, get) => ({
        isPremium: false,
        notesCreatedThisMonth: 0,
        currentMonthKey: getCurrentMonthKey(),
        isHydrated: false,

        setIsPremium: (isPremium) => set({ isPremium }),

        incrementNotesCount: () => {
          const state = get();
          state.resetMonthlyCountIfNeeded();
          set({ notesCreatedThisMonth: get().notesCreatedThisMonth + 1 });
        },

        canCreateNote: () => {
          const state = get();
          if (state.isPremium) return true;
          state.resetMonthlyCountIfNeeded();
          return get().notesCreatedThisMonth < FREE_NOTES_PER_MONTH;
        },

        getMaxRecordingDuration: () => {
          const state = get();
          return state.isPremium ? PREMIUM_MAX_DURATION_SECONDS : FREE_MAX_DURATION_SECONDS;
        },

        resetMonthlyCountIfNeeded: () => {
          const currentMonth = getCurrentMonthKey();
          const state = get();
          if (state.currentMonthKey !== currentMonth) {
            set({
              currentMonthKey: currentMonth,
              notesCreatedThisMonth: 0,
            });
          }
        },

        setHydrated: (isHydrated) => set({ isHydrated }),
      }),
      {
        name: 'subscription-store',
        storage: createJSONStorage(() => AsyncStorage),
        onRehydrateStorage: () => (state) => {
          state?.setHydrated(true);
          state?.resetMonthlyCountIfNeeded();
        },
        partialize: (state) => ({
          isPremium: state.isPremium,
          notesCreatedThisMonth: state.notesCreatedThisMonth,
          currentMonthKey: state.currentMonthKey,
        }),
      }
    ),
    { name: 'subscription-store' }
  )
);

export { FREE_NOTES_PER_MONTH, FREE_MAX_DURATION_SECONDS, PREMIUM_MAX_DURATION_SECONDS };
```

**Step 2: Commit**

```bash
git add frontend/stores/subscription-store.ts
git commit -m "feat: add subscription store with note limits"
```

---

## Task 3: Create RevenueCat Service

**Files:**
- Create: `frontend/services/revenuecat.service.ts`

**Step 1: Create the service file**

```typescript
import Purchases, { PurchasesOffering, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import { useSubscriptionStore } from '@/stores/subscription-store';

const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';
const ENTITLEMENT_ID = 'premium';

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
    Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      useSubscriptionStore.getState().setIsPremium(isPremium);
    });

    // Check initial subscription status
    await revenueCatService.refreshSubscriptionStatus();
  },

  refreshSubscriptionStatus: async (): Promise<boolean> => {
    try {
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
```

**Step 2: Add environment variables to .env.example**

Add to `frontend/.env.example`:
```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_ios_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_android_key_here
```

**Step 3: Commit**

```bash
git add frontend/services/revenuecat.service.ts frontend/.env.example
git commit -m "feat: add RevenueCat service for subscription management"
```

---

## Task 4: Initialize RevenueCat in App Layout

**Files:**
- Modify: `frontend/app/_layout.tsx`

**Step 1: Read the current _layout.tsx to understand the structure**

**Step 2: Add RevenueCat initialization after auth is ready**

Import at top:
```typescript
import { revenueCatService } from '@/services/revenuecat.service';
```

Add initialization in useEffect after auth check (find where user is loaded):
```typescript
// Initialize RevenueCat when user is authenticated
useEffect(() => {
  if (user?.id) {
    revenueCatService.initialize(user.id);
  }
}, [user?.id]);
```

**Step 3: Commit**

```bash
git add frontend/app/_layout.tsx
git commit -m "feat: initialize RevenueCat on app startup"
```

---

## Task 5: Create Paywall Component

**Files:**
- Create: `frontend/components/Paywall.tsx`

**Step 1: Create the Paywall component**

```typescript
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { X, Check, Crown } from 'lucide-react-native';
import { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { revenueCatService } from '@/services/revenuecat.service';
import { Colors } from '@/constants/theme';

type PaywallProps = {
  onClose: () => void;
  reason?: 'notes_limit' | 'ai_search' | 'recording_duration';
};

export function Paywall({ onClose, reason = 'notes_limit' }: PaywallProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>('$rc_annual');

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    setIsLoading(true);
    const currentOffering = await revenueCatService.getOfferings();
    setOffering(currentOffering);
    setIsLoading(false);
  };

  const handlePurchase = async () => {
    if (!offering) return;

    setIsPurchasing(true);
    try {
      const success = await revenueCatService.purchasePackage(selectedPackage);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('[Paywall] Purchase error:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      const success = await revenueCatService.restorePurchases();
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('[Paywall] Restore error:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const getReasonText = () => {
    switch (reason) {
      case 'notes_limit':
        return t('paywall.reason.notesLimit');
      case 'ai_search':
        return t('paywall.reason.aiSearch');
      case 'recording_duration':
        return t('paywall.reason.recordingDuration');
      default:
        return '';
    }
  };

  const features = [
    t('paywall.features.unlimitedNotes'),
    t('paywall.features.longerRecordings'),
    t('paywall.features.aiSearch'),
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const monthlyPackage = offering?.availablePackages.find(
    (pkg) => pkg.identifier === '$rc_monthly'
  );
  const annualPackage = offering?.availablePackages.find(
    (pkg) => pkg.identifier === '$rc_annual'
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <X size={24} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Crown size={48} color={Colors.primary} style={styles.icon} />
        <Text style={styles.title}>{t('paywall.title')}</Text>
        <Text style={styles.reason}>{getReasonText()}</Text>

        <View style={styles.features}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Check size={20} color={Colors.success} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.packages}>
          {annualPackage && (
            <Pressable
              style={[
                styles.packageCard,
                selectedPackage === '$rc_annual' && styles.packageCardSelected,
              ]}
              onPress={() => setSelectedPackage('$rc_annual')}
            >
              <View style={styles.packageBadge}>
                <Text style={styles.packageBadgeText}>{t('paywall.bestValue')}</Text>
              </View>
              <Text style={styles.packageTitle}>{t('paywall.annual')}</Text>
              <Text style={styles.packagePrice}>
                {annualPackage.product.priceString}/{t('paywall.year')}
              </Text>
              <Text style={styles.packageSaving}>{t('paywall.save30')}</Text>
            </Pressable>
          )}

          {monthlyPackage && (
            <Pressable
              style={[
                styles.packageCard,
                selectedPackage === '$rc_monthly' && styles.packageCardSelected,
              ]}
              onPress={() => setSelectedPackage('$rc_monthly')}
            >
              <Text style={styles.packageTitle}>{t('paywall.monthly')}</Text>
              <Text style={styles.packagePrice}>
                {monthlyPackage.product.priceString}/{t('paywall.month')}
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable
          style={styles.purchaseButton}
          onPress={handlePurchase}
          disabled={isPurchasing}
        >
          {isPurchasing ? (
            <ActivityIndicator color={Colors.textPrimary} />
          ) : (
            <Text style={styles.purchaseButtonText}>{t('paywall.subscribe')}</Text>
          )}
        </Pressable>

        <Pressable onPress={handleRestore} disabled={isPurchasing}>
          <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.surfaceHover,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  reason: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  features: {
    alignSelf: 'stretch',
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  packages: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  packageCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  packageCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  packageBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  packageBadgeText: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  packageTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  packageSaving: {
    fontSize: 12,
    color: Colors.success,
    marginTop: 4,
  },
  purchaseButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  restoreText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
});
```

**Step 2: Add translations**

Add to `frontend/locales/en.json` (paywall section):
```json
{
  "paywall": {
    "title": "Upgrade to Premium",
    "reason": {
      "notesLimit": "You've reached your free monthly limit of 5 notes",
      "aiSearch": "AI Search is a premium feature",
      "recordingDuration": "Longer recordings require premium"
    },
    "features": {
      "unlimitedNotes": "Unlimited audio notes",
      "longerRecordings": "3-minute recordings (vs 1 min)",
      "aiSearch": "AI-powered search across all notes"
    },
    "monthly": "Monthly",
    "annual": "Annual",
    "month": "month",
    "year": "year",
    "bestValue": "BEST VALUE",
    "save30": "Save 30%",
    "subscribe": "Subscribe Now",
    "restore": "Restore Purchases"
  }
}
```

Add to `frontend/locales/fr.json`:
```json
{
  "paywall": {
    "title": "Passer Premium",
    "reason": {
      "notesLimit": "Vous avez atteint la limite de 5 notes par mois",
      "aiSearch": "La recherche IA est une fonctionnalite premium",
      "recordingDuration": "Les enregistrements plus longs necessitent premium"
    },
    "features": {
      "unlimitedNotes": "Notes audio illimitees",
      "longerRecordings": "Enregistrements de 3 min (vs 1 min)",
      "aiSearch": "Recherche IA dans toutes vos notes"
    },
    "monthly": "Mensuel",
    "annual": "Annuel",
    "month": "mois",
    "year": "an",
    "bestValue": "MEILLEUR PRIX",
    "save30": "Economisez 30%",
    "subscribe": "S'abonner",
    "restore": "Restaurer les achats"
  }
}
```

**Step 3: Commit**

```bash
git add frontend/components/Paywall.tsx frontend/locales/en.json frontend/locales/fr.json
git commit -m "feat: add Paywall component with pricing options"
```

---

## Task 6: Add Recording Duration Limit

**Files:**
- Modify: `frontend/hooks/useRecording.ts`

**Step 1: Import subscription store**

Add at top:
```typescript
import { useSubscriptionStore } from '@/stores/subscription-store';
```

**Step 2: Get max duration from store**

Inside the hook, add:
```typescript
const getMaxRecordingDuration = useSubscriptionStore((state) => state.getMaxRecordingDuration);
const maxDuration = getMaxRecordingDuration();
```

**Step 3: Add auto-stop when duration limit reached**

Modify the duration interval in `startRecording`:
```typescript
durationIntervalRef.current = setInterval(() => {
  setRecordingDuration((prev) => {
    const newDuration = prev + 1;
    // Auto-stop when reaching max duration
    if (newDuration >= maxDuration) {
      stopRecording();
    }
    return newDuration;
  });
}, 1000);
```

**Step 4: Commit**

```bash
git add frontend/hooks/useRecording.ts
git commit -m "feat: enforce recording duration limit based on subscription"
```

---

## Task 7: Add Monthly Note Limit Check

**Files:**
- Modify: `frontend/hooks/useRecording.ts`

**Step 1: Import canCreateNote from subscription store**

Already imported in Task 6, add:
```typescript
const canCreateNote = useSubscriptionStore((state) => state.canCreateNote);
const incrementNotesCount = useSubscriptionStore((state) => state.incrementNotesCount);
```

**Step 2: Add state for paywall**

```typescript
const [showPaywall, setShowPaywall] = useState(false);
const [paywallReason, setPaywallReason] = useState<'notes_limit' | 'recording_duration'>('notes_limit');
```

**Step 3: Check limit before starting recording in startRecording**

At the beginning of `startRecording`:
```typescript
if (!canCreateNote()) {
  setPaywallReason('notes_limit');
  setShowPaywall(true);
  return;
}
```

**Step 4: Increment note count after successful note creation**

In `stopRecording`, after successful navigation to review:
```typescript
incrementNotesCount();
```

**Step 5: Return paywall state from hook**

```typescript
return {
  // ... existing returns
  showPaywall,
  paywallReason,
  closePaywall: () => setShowPaywall(false),
};
```

**Step 6: Commit**

```bash
git add frontend/hooks/useRecording.ts
git commit -m "feat: add monthly note limit check in recording flow"
```

---

## Task 8: Integrate Paywall in Record Screen

**Files:**
- Modify: `frontend/app/record.tsx`

**Step 1: Import Paywall and Modal**

```typescript
import { Modal } from 'react-native';
import { Paywall } from '@/components/Paywall';
```

**Step 2: Get paywall state from useRecording**

```typescript
const {
  toggleRecording,
  isRecording,
  isProcessing,
  recordingDuration,
  showPaywall,
  paywallReason,
  closePaywall,
} = useRecording();
```

**Step 3: Add Paywall modal at the end of the component**

Before the closing `</View>`:
```typescript
<Modal visible={showPaywall} animationType="slide" presentationStyle="pageSheet">
  <Paywall onClose={closePaywall} reason={paywallReason} />
</Modal>
```

**Step 4: Show remaining time indicator**

Add max duration display when recording:
```typescript
import { useSubscriptionStore } from '@/stores/subscription-store';

// Inside component:
const maxDuration = useSubscriptionStore((state) => state.getMaxRecordingDuration());

// In the timer display, show remaining:
<Text style={styles.remainingTime}>
  {formatDuration(maxDuration - recordingDuration)} restant
</Text>
```

**Step 5: Commit**

```bash
git add frontend/app/record.tsx
git commit -m "feat: integrate paywall in record screen"
```

---

## Task 9: Add Soft Paywall to AI Search

**Files:**
- Modify: `frontend/app/(tabs)/search.tsx`

**Step 1: Import subscription store and Paywall**

```typescript
import { Modal } from 'react-native';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { Paywall } from '@/components/Paywall';
```

**Step 2: Add state and subscription check**

```typescript
const isPremium = useSubscriptionStore((state) => state.isPremium);
const [showPaywall, setShowPaywall] = useState(false);
```

**Step 3: Modify handleSubmit to check subscription**

```typescript
const handleSubmit = () => {
  if (!isPremium) {
    setShowPaywall(true);
    return;
  }
  if (query.trim()) {
    setHasSearched(true);
    search(query.trim());
  }
};
```

**Step 4: Add Paywall modal**

Before closing `</KeyboardAvoidingView>`:
```typescript
<Modal visible={showPaywall} animationType="slide" presentationStyle="pageSheet">
  <Paywall onClose={() => setShowPaywall(false)} reason="ai_search" />
</Modal>
```

**Step 5: Commit**

```bash
git add frontend/app/\(tabs\)/search.tsx
git commit -m "feat: add soft paywall to AI search"
```

---

## Task 10: Add Subscription Management to Profile

**Files:**
- Modify: `frontend/app/(tabs)/profile.tsx`

**Step 1: Import dependencies**

```typescript
import { Crown } from 'lucide-react-native';
import { useSubscriptionStore, FREE_NOTES_PER_MONTH } from '@/stores/subscription-store';
import { revenueCatService } from '@/services/revenuecat.service';
import { Paywall } from '@/components/Paywall';
import { Modal } from 'react-native';
```

**Step 2: Add state**

```typescript
const isPremium = useSubscriptionStore((state) => state.isPremium);
const notesCreatedThisMonth = useSubscriptionStore((state) => state.notesCreatedThisMonth);
const [showPaywall, setShowPaywall] = useState(false);
```

**Step 3: Add subscription management handlers**

```typescript
const handleManageSubscription = async () => {
  const url = await revenueCatService.getManagementURL();
  if (url) {
    Linking.openURL(url);
  }
};

const handleUpgrade = () => {
  setShowPaywall(true);
};
```

**Step 4: Add Subscription section after Language section**

```typescript
<SettingsSection title={t('profile.sections.subscription')}>
  {isPremium ? (
    <SettingsRow
      icon={<Crown size={20} color={Colors.primary} />}
      label={t('profile.subscription.premium')}
      value={t('profile.subscription.active')}
      onPress={handleManageSubscription}
    />
  ) : (
    <>
      <SettingsRow
        icon={<Crown size={20} color={Colors.textMuted} />}
        label={t('profile.subscription.free')}
        value={`${notesCreatedThisMonth}/${FREE_NOTES_PER_MONTH} ${t('profile.subscription.notesUsed')}`}
        onPress={handleUpgrade}
      />
    </>
  )}
</SettingsSection>
```

**Step 5: Add Paywall modal**

Before closing `</View>`:
```typescript
<Modal visible={showPaywall} animationType="slide" presentationStyle="pageSheet">
  <Paywall onClose={() => setShowPaywall(false)} />
</Modal>
```

**Step 6: Add translations**

Add to locales:
```json
{
  "profile": {
    "sections": {
      "subscription": "Subscription"
    },
    "subscription": {
      "premium": "Premium",
      "free": "Free Plan",
      "active": "Active",
      "notesUsed": "notes this month"
    }
  }
}
```

**Step 7: Commit**

```bash
git add frontend/app/\(tabs\)/profile.tsx frontend/locales/en.json frontend/locales/fr.json
git commit -m "feat: add subscription management to Profile screen"
```

---

## Task 11: Update Record for Contact Screen

**Files:**
- Modify: `frontend/app/record/[contactId].tsx`

Apply the same paywall logic as Task 8:
- Import subscription store
- Check canCreateNote before starting
- Show paywall if limit reached
- Increment note count after success

**Commit:**

```bash
git add frontend/app/record/\[contactId\].tsx
git commit -m "feat: add note limit check to record for contact screen"
```

---

## Task 12: Final Testing Checklist

**Manual tests to perform:**

1. [ ] Fresh install shows 5/5 notes available
2. [ ] Recording stops at 1 minute for free users
3. [ ] 6th note triggers paywall
4. [ ] AI search shows paywall for free users
5. [ ] Purchase flow completes (sandbox)
6. [ ] Premium users can record 3 minutes
7. [ ] Premium users have unlimited notes
8. [ ] Restore purchases works
9. [ ] Subscription management opens store
10. [ ] Monthly counter resets on new month

---

## External Setup Required (RevenueCat Dashboard)

1. Create RevenueCat project
2. Add iOS app with App Store Connect API key
3. Add Android app with Play Console credentials
4. Create products:
   - `premium_monthly` - $6.99/month
   - `premium_annual` - $59.99/year
5. Create entitlement: `premium`
6. Create offering with both packages
7. Copy API keys to `.env.local`
