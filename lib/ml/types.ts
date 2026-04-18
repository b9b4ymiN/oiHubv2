// Feature definition
export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  category: FeatureCategory;
  inputFeatures: string[];   // which lib/features/ modules it depends on
  outputSchema: Record<string, string>; // field name -> type description
  createdAt: number;
}

export type FeatureCategory = 
  | 'momentum'
  | 'regime'
  | 'divergence'
  | 'liquidity'
  | 'volatility'
  | 'flow'
  | 'structural';

// Feature vector (a snapshot of computed features at a point in time)
export interface FeatureVector {
  id: string;
  timestamp: number;
  symbol: string;
  interval: string;
  version: string;          // feature store version
  features: Record<string, number | string | boolean>;
  metadata: FeatureVectorMetadata;
}

export interface FeatureVectorMetadata {
  barCount: number;           // how many bars were used
  dataQuality: 'clean' | 'partial' | 'degraded';
  computationTimeMs: number;
  source: string;             // 'live' | 'historical' | 'backtest'
}

// Feature store configuration
export interface FeatureStoreConfig {
  version: string;
  features: string[];         // which feature definitions to compute
  symbol: string;
  interval: string;
  lookbackBars: number;       // how many bars of history to include
}

// Drift measurement
export interface DriftMeasurement {
  featureId: string;
  timestamp: number;
  mean: number;
  stddev: number;
  sampleSize: number;
  window: string;             // '1h', '4h', '1d', '7d'
}

// Drift alert
export interface DriftAlert {
  featureId: string;
  timestamp: number;
  baselineMean: number;
  currentMean: number;
  driftScore: number;         // how many standard deviations
  severity: 'low' | 'medium' | 'high';
}
