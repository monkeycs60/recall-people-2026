# Monetization Design - RevenueCat Integration

## Overview

Freemium model with a single premium tier, using RevenueCat for subscription management.

## Pricing

| Plan | Price | Notes |
|------|-------|-------|
| Monthly | $6.99/month | Base price, auto-converted by stores |
| Annual | $59.99/year | ~30% discount |

No free trial. No launch discount.

## Feature Access

| Feature | Free | Premium |
|---------|------|---------|
| Contacts | Unlimited | Unlimited |
| Audio notes | 5/month | Unlimited |
| Read existing notes | All | All |
| AI Search | No | Yes |

### Monthly Note Limit

- Free users can create up to 5 audio notes per calendar month
- Counter resets on the 1st of each month
- Existing notes remain readable regardless of limit

### Downgrade Behavior

When a premium user cancels:
- Retains read access to all existing content (contacts, notes, facts, etc.)
- Limited to 5 new audio notes per month
- AI search becomes inaccessible

## Paywall UX

### Hard Paywall (blocking)
- Triggered when user attempts to create their 6th note in a month
- Shows paywall screen with pricing options

### Soft Paywall (teaser)
- AI Search button is visible in the UI
- Tapping it opens the paywall instead of the search
- Communicates premium value without hiding the feature

### Subscription Management
- Located in Profile screen
- "Manage Subscription" button
- "Restore Purchases" for app reinstalls

## Technical Architecture

### RevenueCat Setup

1. **Products to create in App Store Connect / Google Play Console:**
   - `premium_monthly` - $6.99/month auto-renewable
   - `premium_annual` - $59.99/year auto-renewable

2. **RevenueCat Entitlements:**
   - `premium` - grants access to unlimited notes + AI search

### Local State Management

```typescript
// stores/subscription-store.ts
interface SubscriptionState {
  isPremium: boolean;
  notesCreatedThisMonth: number;
  currentPeriodStart: string; // ISO date for month tracking
}
```

### Note Limit Tracking

- Store `notesCreatedThisMonth` counter in local SQLite or Zustand persisted store
- Store `currentPeriodStart` to detect month rollover
- On app launch: check if current month differs from stored month → reset counter
- Before creating note: check `isPremium || notesCreatedThisMonth < 5`

### RevenueCat Integration Points

1. **App launch:** Check subscription status, update `isPremium`
2. **Purchase flow:** Present paywall, handle purchase, update state
3. **Restore purchases:** Button in Profile for reinstalls
4. **Subscription listener:** React to subscription changes in real-time

## Implementation Checklist

- [ ] Install `react-native-purchases` (RevenueCat SDK)
- [ ] Configure RevenueCat project (iOS + Android apps)
- [ ] Create products in App Store Connect
- [ ] Create products in Google Play Console
- [ ] Create RevenueCat entitlements and offerings
- [ ] Build subscription store (Zustand)
- [ ] Build note limit tracking logic
- [ ] Create Paywall component
- [ ] Integrate hard paywall on note creation
- [ ] Integrate soft paywall on AI search
- [ ] Add subscription management to Profile screen
- [ ] Add restore purchases functionality
- [ ] Test purchase flows (sandbox)
