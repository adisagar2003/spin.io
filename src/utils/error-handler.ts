/**
 * Global error handling utilities
 */

import { Alert } from 'react-native';
import { logError } from './logger';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  gameState?: any;
}

/**
 * Handle application errors with user-friendly messages
 */
export const handleError = (
  error: Error | unknown, 
  context: ErrorContext = {},
  showAlert: boolean = true
): void => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const contextStr = context.component || context.action || 'Unknown';
  
  // Log the error
  logError(`Application error in ${contextStr}`, 'ErrorHandler', {
    error: errorMessage,
    context,
    stack: error instanceof Error ? error.stack : undefined
  });
  
  // Show user-friendly alert if requested
  if (showAlert) {
    const userMessage = getUserFriendlyMessage(errorMessage, context);
    Alert.alert('Oops!', userMessage, [{ text: 'OK' }]);
  }
};

/**
 * Convert technical error messages to user-friendly ones
 */
const getUserFriendlyMessage = (error: string, context: ErrorContext): string => {
  if (error.includes('network') || error.includes('fetch')) {
    return 'Please check your internet connection and try again.';
  }
  
  if (error.includes('storage') || error.includes('AsyncStorage')) {
    return 'Unable to save your progress. Please ensure you have enough storage space.';
  }
  
  if (error.includes('RevenueCat') || error.includes('purchase')) {
    return 'There was an issue with the purchase system. Please try again later.';
  }
  
  if (context.component === 'GameEngine') {
    return 'The game encountered an error. Your progress has been saved.';
  }
  
  return 'Something went wrong. Please try again.';
};

/**
 * Async error handler for promises
 */
export const safeAsync = async <T>(
  asyncFn: () => Promise<T>,
  context: ErrorContext = {},
  fallback?: T
): Promise<T | undefined> => {
  try {
    return await asyncFn();
  } catch (error) {
    handleError(error, context, false);
    return fallback;
  }
};

/**
 * Error boundary for React components
 */
export class ErrorBoundary extends Error {
  public context: ErrorContext;
  
  constructor(message: string, context: ErrorContext = {}) {
    super(message);
    this.name = 'ErrorBoundary';
    this.context = context;
  }
}