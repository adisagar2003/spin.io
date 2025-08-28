/**
 * Architecture Configuration
 * Manages feature flags and architecture settings for gradual rollout
 */

import { EngineType } from '../core/GameEngineAdapter';

export interface ArchitectureConfig {
  // Core architecture settings
  engineType: EngineType;
  enableECS: boolean;
  
  // Performance optimizations
  enableSpatialPartitioning: boolean;
  enableClientPrediction: boolean;
  enableLagCompensation: boolean;
  
  // Debugging and monitoring
  enablePerformanceMonitoring: boolean;
  enableDebugLogging: boolean;
  enableNetworkStats: boolean;
  
  // Gradual rollout settings
  rolloutPercentage: number; // 0-100, percentage of users to use new architecture
  rolloutKey: string; // Key for consistent user experience
  
  // Compatibility settings
  fallbackToLegacy: boolean;
  legacyFallbackTimeout: number; // ms
}

/**
 * Default architecture configuration
 * Conservative settings for stable production deployment
 */
const DEFAULT_CONFIG: ArchitectureConfig = {
  engineType: EngineType.MODULAR,
  enableECS: true,
  
  enableSpatialPartitioning: true,
  enableClientPrediction: true,
  enableLagCompensation: true,
  
  enablePerformanceMonitoring: __DEV__,
  enableDebugLogging: __DEV__,
  enableNetworkStats: __DEV__,
  
  rolloutPercentage: 100, // 100% rollout by default - can be reduced for gradual deployment
  rolloutKey: 'modular_architecture_v1',
  
  fallbackToLegacy: true,
  legacyFallbackTimeout: 5000
};

/**
 * Environment-specific configurations
 */
const ENVIRONMENT_CONFIGS: Record<string, Partial<ArchitectureConfig>> = {
  development: {
    enablePerformanceMonitoring: true,
    enableDebugLogging: true,
    enableNetworkStats: true,
    rolloutPercentage: 100
  },
  
  staging: {
    enablePerformanceMonitoring: true,
    enableDebugLogging: false,
    enableNetworkStats: true,
    rolloutPercentage: 100
  },
  
  production: {
    enablePerformanceMonitoring: false,
    enableDebugLogging: false,
    enableNetworkStats: false,
    rolloutPercentage: 50 // Start with 50% rollout in production
  }
};

/**
 * A/B Test configurations for different architecture approaches
 */
export const AB_TEST_CONFIGS = {
  // Conservative ECS approach
  conservative: {
    engineType: EngineType.MODULAR,
    enableSpatialPartitioning: false,
    enableClientPrediction: false,
    enableLagCompensation: false
  },
  
  // Full-featured ECS approach
  advanced: {
    engineType: EngineType.MODULAR,
    enableSpatialPartitioning: true,
    enableClientPrediction: true,
    enableLagCompensation: true
  },
  
  // Legacy fallback for comparison
  legacy: {
    engineType: EngineType.LEGACY,
    enableECS: false,
    enableSpatialPartitioning: false,
    enableClientPrediction: false,
    enableLagCompensation: false
  }
} as const;

/**
 * Architecture Configuration Manager
 */
class ArchitectureConfigManager {
  private config: ArchitectureConfig;
  private userHash: string | null = null;

  constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Load configuration based on environment and feature flags
   */
  private loadConfiguration(): ArchitectureConfig {
    const environment = this.getCurrentEnvironment();
    const envConfig = ENVIRONMENT_CONFIGS[environment] || {};
    
    // Merge default config with environment-specific overrides
    const config: ArchitectureConfig = {
      ...DEFAULT_CONFIG,
      ...envConfig
    };

    console.log(`🚀 Architecture config loaded for ${environment}:`, {
      engineType: config.engineType,
      enableECS: config.enableECS,
      rolloutPercentage: config.rolloutPercentage
    });

    return config;
  }

  /**
   * Get current environment
   */
  private getCurrentEnvironment(): string {
    if (__DEV__) return 'development';
    
    // In a real app, this might check process.env.NODE_ENV or other indicators
    // For now, assume production
    return 'production';
  }

  /**
   * Generate consistent user hash for A/B testing
   */
  private generateUserHash(): string {
    if (this.userHash) return this.userHash;

    // In a real app, this would use a persistent user ID
    // For now, use a simple hash based on device/session
    const deviceInfo = typeof navigator !== 'undefined' ? navigator.userAgent : 'default';
    this.userHash = this.simpleHash(deviceInfo + Date.now().toString()).toString();
    
    return this.userHash;
  }

  /**
   * Simple hash function for consistent user assignment
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Check if user should get new architecture based on rollout percentage
   */
  private shouldUseNewArchitecture(): boolean {
    if (this.config.rolloutPercentage >= 100) return true;
    if (this.config.rolloutPercentage <= 0) return false;

    const userHash = this.generateUserHash();
    const userPercentile = (parseInt(userHash) % 100) + 1;
    
    return userPercentile <= this.config.rolloutPercentage;
  }

  /**
   * Get effective configuration for current user
   */
  public getEffectiveConfig(): ArchitectureConfig {
    const shouldUseNew = this.shouldUseNewArchitecture();
    
    if (!shouldUseNew) {
      // Force legacy engine for users not in rollout
      return {
        ...this.config,
        engineType: EngineType.LEGACY,
        enableECS: false,
        enableSpatialPartitioning: false,
        enableClientPrediction: false,
        enableLagCompensation: false
      };
    }

    return this.config;
  }

  /**
   * Get A/B test configuration
   */
  public getABTestConfig(testName: keyof typeof AB_TEST_CONFIGS): Partial<ArchitectureConfig> {
    return AB_TEST_CONFIGS[testName];
  }

  /**
   * Override configuration (for debugging or testing)
   */
  public overrideConfig(overrides: Partial<ArchitectureConfig>): void {
    this.config = { ...this.config, ...overrides };
    console.log('🔧 Architecture config overridden:', overrides);
  }

  /**
   * Reset to default configuration
   */
  public resetConfig(): void {
    this.config = this.loadConfiguration();
    console.log('🔄 Architecture config reset to defaults');
  }

  /**
   * Get current configuration (for debugging)
   */
  public getCurrentConfig(): Readonly<ArchitectureConfig> {
    return { ...this.config };
  }

  /**
   * Check if a specific feature is enabled
   */
  public isFeatureEnabled(feature: keyof ArchitectureConfig): boolean {
    const config = this.getEffectiveConfig();
    return !!config[feature];
  }

  /**
   * Get performance monitoring settings
   */
  public getPerformanceConfig(): {
    enabled: boolean;
    includeFPS: boolean;
    includeMemory: boolean;
    includeNetwork: boolean;
  } {
    const config = this.getEffectiveConfig();
    return {
      enabled: config.enablePerformanceMonitoring,
      includeFPS: true,
      includeMemory: config.enableDebugLogging,
      includeNetwork: config.enableNetworkStats
    };
  }
}

// Singleton instance
export const architectureConfig = new ArchitectureConfigManager();

/**
 * Helper function to get feature flags for components
 */
export const getFeatureFlags = () => {
  const config = architectureConfig.getEffectiveConfig();
  
  return {
    useModularEngine: config.engineType === EngineType.MODULAR,
    enableClientPrediction: config.enableClientPrediction,
    enableSpatialOptimization: config.enableSpatialPartitioning,
    enablePerformanceMonitoring: config.enablePerformanceMonitoring,
    enableDebugLogging: config.enableDebugLogging,
    enableNetworkStats: config.enableNetworkStats
  };
};

/**
 * Helper function to create game engine with appropriate configuration
 */
export const createGameEngineWithConfig = () => {
  const config = architectureConfig.getEffectiveConfig();
  const featureFlags = getFeatureFlags();
  
  console.log('🎮 Creating game engine with config:', {
    engineType: config.engineType,
    featureFlags
  });
  
  return {
    engineType: config.engineType,
    featureFlags
  };
};