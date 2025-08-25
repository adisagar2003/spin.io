/**
 * RevenueCat integration for in-app purchases
 * Handles subscription and purchase management
 */

// Mock RevenueCat types for development
interface PurchasesOffering {
  identifier: string;
  availablePackages: PurchasesPackage[];
}

interface PurchasesPackage {
  identifier: string;
  product: {
    title: string;
    description: string;
    priceString: string;
  };
}

interface CustomerInfo {
  entitlements: {
    active: Record<string, any>;
  };
}

// Mock Purchases object for development
const Purchases = {
  configure: async (config: any) => Promise.resolve(),
  getOfferings: async (): Promise<{ [key: string]: PurchasesOffering }> => ({
    default: {
      identifier: 'default',
      availablePackages: [{
        identifier: 'ad_removal',
        product: {
          title: 'Remove Ads',
          description: 'Remove all advertisements',
          priceString: '$2.99'
        }
      }]
    }
  }),
  purchasePackage: async (pkg: PurchasesPackage) => ({
    customerInfo: {
      entitlements: { active: { ad_removal: {} } }
    }
  }),
  restorePurchases: async () => ({
    customerInfo: {
      entitlements: { active: {} }
    }
  }),
  getCustomerInfo: async (): Promise<CustomerInfo> => ({
    entitlements: { active: { ad_removal: undefined } }
  })
};
import { Platform } from 'react-native';
import { PurchaseProduct } from '../types';
import { getRevenueCatConfig, PRODUCT_IDS, ENTITLEMENTS } from '../config/revenue-cat';
import { logError, logInfo, logWarn } from './logger';

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts
 */
export const initializePurchases = async (): Promise<void> => {
  try {
    const config = getRevenueCatConfig();
    
    await Purchases.configure(config);
    
    logInfo('RevenueCat initialized successfully', 'Purchases');
  } catch (error) {
    logError('Failed to initialize RevenueCat', 'Purchases', error);
    throw error; // Re-throw for proper error handling upstream
  }
};

/**
 * Get available offerings/products
 * @returns Array of available purchase products
 */
export const getAvailableProducts = async (): Promise<PurchaseProduct[]> => {
  try {
    const offerings = await Purchases.getOfferings();
    const products: PurchaseProduct[] = [];
    
    // Extract products from all offerings
    Object.values(offerings).forEach((offering) => {
      offering.availablePackages.forEach((pkg: PurchasesPackage) => {
        products.push({
          identifier: pkg.identifier,
          price: pkg.product.priceString,
          title: pkg.product.title,
          description: pkg.product.description,
        });
      });
    });
    
    return products;
  } catch (error) {
    logError('Failed to get available products', 'Purchases', error);
    return [];
  }
};

/**
 * Purchase a product
 * @param productIdentifier - Product identifier to purchase
 * @returns Success status and customer info
 */
export const purchaseProduct = async (productIdentifier: string): Promise<{
  success: boolean;
  hasAdRemoval: boolean;
  error?: string;
}> => {
  try {
    const offerings = await Purchases.getOfferings();
    let packageToPurchase: PurchasesPackage | undefined;
    
    // Find the package to purchase
    Object.values(offerings).forEach((offering) => {
      const pkg = offering.availablePackages.find(p => p.identifier === productIdentifier);
      if (pkg) packageToPurchase = pkg;
    });
    
    if (!packageToPurchase) {
      return { success: false, hasAdRemoval: false, error: 'Product not found' };
    }
    
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    
    // Check if user now has ad removal entitlement
    const hasAdRemoval = Boolean(customerInfo.entitlements.active.ad_removal);
    
    return { success: true, hasAdRemoval };
  } catch (error: any) {
    logError('Purchase failed', 'Purchases', error);
    
    // Handle user cancellation gracefully
    if (error.userCancelled) {
      return { success: false, hasAdRemoval: false, error: 'Purchase cancelled by user' };
    }
    
    return { 
      success: false, 
      hasAdRemoval: false, 
      error: error.message || 'Purchase failed' 
    };
  }
};

/**
 * Restore purchases for the current user
 * @returns Restoration status and entitlements
 */
export const restorePurchases = async (): Promise<{
  success: boolean;
  hasAdRemoval: boolean;
  error?: string;
}> => {
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    
    const hasAdRemoval = Boolean(customerInfo.entitlements.active.ad_removal);
    
    return { success: true, hasAdRemoval };
  } catch (error: any) {
    logError('Restore failed', 'Purchases', error);
    return { 
      success: false, 
      hasAdRemoval: false, 
      error: error.message || 'Restore failed' 
    };
  }
};

/**
 * Check current customer entitlements
 * @returns Current entitlement status
 */
export const getCustomerInfo = async (): Promise<{
  hasAdRemoval: boolean;
  error?: string;
}> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const hasAdRemoval = Boolean(customerInfo.entitlements.active.ad_removal);
    
    return { hasAdRemoval };
  } catch (error: any) {
    logError('Failed to get customer info', 'Purchases', error);
    return { hasAdRemoval: false, error: error.message };
  }
};

/**
 * Mock purchase for development/testing
 * @returns Mock successful purchase
 */
export const mockPurchaseAdRemoval = async (): Promise<{
  success: boolean;
  hasAdRemoval: boolean;
}> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  logInfo('Mock purchase: Ad removal activated', 'Purchases');
  return { success: true, hasAdRemoval: true };
};