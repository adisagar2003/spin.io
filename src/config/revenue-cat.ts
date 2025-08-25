/**
 * Secure RevenueCat configuration
 */

import { Platform } from 'react-native';

export interface RevenueCatConfig {
  apiKey: string;
  appUserID?: string;
}

/**
 * Get RevenueCat configuration from environment variables
 * @returns RevenueCat configuration
 * @throws Error if API key is not configured
 */
export const getRevenueCatConfig = (): RevenueCatConfig => {
  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    default: undefined,
  });
  
  if (!apiKey) {
    throw new Error(
      `RevenueCat API key not configured for platform ${Platform.OS}. ` +
      'Please set EXPO_PUBLIC_REVENUECAT_IOS_KEY and EXPO_PUBLIC_REVENUECAT_ANDROID_KEY in your environment.'
    );
  }
  
  return {
    apiKey,
    appUserID: undefined, // Let RevenueCat generate anonymous user ID
  };
};

/**
 * Product identifiers
 */
export const PRODUCT_IDS = {
  AD_REMOVAL: 'ad_removal',
} as const;

/**
 * Entitlement identifiers
 */
export const ENTITLEMENTS = {
  AD_REMOVAL: 'ad_removal',
} as const;