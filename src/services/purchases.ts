import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

// Must match the entitlement identifier configured in the RevenueCat
// dashboard (Entitlements -> "premium"), not a product/offering id.
const PREMIUM_ENTITLEMENT_ID = 'premium';

let configured = false;

// No-ops on platforms/builds without a key configured (e.g. Android before
// RevenueCat is set up there, or a build missing the env var) so the rest of
// the app never has to branch on whether purchases are available.
export function initPurchases() {
  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    default: undefined,
  });
  if (!apiKey) return;

  Purchases.configure({ apiKey });
  configured = true;
}

// Ties RevenueCat's app_user_id to our own User.id so the server's webhook
// (which only ever sees a RevenueCat app_user_id) can look up the right
// user/couple. Called after login/signup/bootstrap.
export async function identifyPurchaser(userId: string) {
  if (!configured) return;
  await Purchases.logIn(userId);
}

// Called on logout so the next login (possibly a different account on the
// same device) doesn't inherit a stale identity's cached entitlement state.
export async function logOutPurchaser() {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch {
    // Purchases.logOut() throws if nobody was ever logged in (e.g. this is a
    // guest session that never called identifyPurchaser) -- nothing to undo.
  }
}

export function isPurchasesConfigured() {
  return configured;
}

export function isEntitledFromCustomerInfo(info: CustomerInfo): boolean {
  return info.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
}

export async function getIsPremium(): Promise<boolean> {
  if (!configured) return false;
  const info = await Purchases.getCustomerInfo();
  return isEntitledFromCustomerInfo(info);
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!configured) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return isEntitledFromCustomerInfo(customerInfo);
}

export async function restorePurchases(): Promise<boolean> {
  const info = await Purchases.restorePurchases();
  return isEntitledFromCustomerInfo(info);
}
