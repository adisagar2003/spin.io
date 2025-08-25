/**
 * Test setup and configuration
 */

// import 'react-native-gesture-handler/jestSetup'; // Not needed for this project

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock RevenueCat
jest.mock('react-native-purchases', () => ({
  configure: jest.fn(),
  getOfferings: jest.fn(),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  getCustomerInfo: jest.fn(),
}));

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      ...RN.Platform,
      OS: 'ios',
    },
    Dimensions: {
      ...RN.Dimensions,
      get: jest.fn(() => ({ width: 375, height: 667 })),
    },
  };
});

// Mock SVG components
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Circle: 'Circle',
  Polygon: 'Polygon',
  Rect: 'Rect',
  G: 'G',
  Defs: 'Defs',
  RadialGradient: 'RadialGradient',
  Stop: 'Stop',
}));

// Global test timeout
jest.setTimeout(10000);