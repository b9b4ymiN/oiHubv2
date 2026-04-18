export type {
  FeatureDefinition,
  FeatureCategory,
  FeatureVector,
  FeatureVectorMetadata,
  FeatureStoreConfig,
  DriftMeasurement,
  DriftAlert,
} from './types';

export {
  registerFeature,
  getFeatureDefinition,
  getAllDefinitions,
  getDefinitionsByCategory,
  computeFeatureVector,
  getCachedVectors,
  getLatestVector,
  clearCache,
  clearFeatureRegistry,
} from './feature-store';

export type {
  ModelMetadata,
  ModelMetrics,
  ModelStatus,
  ModelType,
  TrainingConfig,
  EvaluationResult,
} from './model-registry';

export {
  registerModel,
  getModel,
  getAllModels,
  getProductionModels,
  getModelsByType,
  updateModelStatus,
  addEvaluationResult,
  passesEvaluationGate,
  promoteToProduction,
  deleteModel,
  clearRegistry,
} from './model-registry';

export {
  setBaseline,
  recordMeasurement,
  getDriftAlerts,
  getMeasurements,
  getBaseline,
  calculateStats,
  clearDriftState,
} from './drift-monitor';
