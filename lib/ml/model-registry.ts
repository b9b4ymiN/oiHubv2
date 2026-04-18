import { randomUUID } from 'crypto';

export type ModelStatus = 'development' | 'staging' | 'production' | 'deprecated';
export type ModelType = 'binary_classifier' | 'regression' | 'regime_classifier' | 'embedding';

export interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  type: ModelType;
  status: ModelStatus;
  inputFeatures: string[];
  outputSchema: Record<string, string>;
  metrics: ModelMetrics;
  trainingConfig: TrainingConfig;
  evaluationResults: EvaluationResult[];
  createdAt: number;
  updatedAt: number;
  promotedAt: number | null;
}

export interface ModelMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  auc?: number;
  sharpeContribution?: number;
  winRateLift?: number;
  outOfSampleScore?: number;
}

export interface TrainingConfig {
  trainingWindow: string;       // e.g., '6months'
  outOfSampleWindow: string;    // e.g., '2months'
  featureVersion: string;
  hyperparameters: Record<string, number | string | boolean>;
  dataRange: { start: number; end: number };
}

export interface EvaluationResult {
  id: string;
  timestamp: number;
  type: 'walk_forward' | 'out_of_sample' | 'ablation';
  score: number;
  baselineScore: number;
  improvement: number; // percentage improvement over baseline
  details: Record<string, number>;
  passed: boolean;
}

const models = new Map<string, ModelMetadata>();

export function registerModel(model: Omit<ModelMetadata, 'id' | 'createdAt' | 'updatedAt' | 'promotedAt'>): ModelMetadata {
  const now = Date.now();
  const full: ModelMetadata = {
    ...model,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    promotedAt: null,
  };
  models.set(full.id, full);
  return full;
}

export function getModel(id: string): ModelMetadata | undefined {
  return models.get(id);
}

export function getAllModels(): ModelMetadata[] {
  return Array.from(models.values());
}

export function getProductionModels(): ModelMetadata[] {
  return Array.from(models.values()).filter(m => m.status === 'production');
}

export function getModelsByType(type: ModelType): ModelMetadata[] {
  return Array.from(models.values()).filter(m => m.type === type);
}

export function updateModelStatus(id: string, status: ModelStatus): ModelMetadata | null {
  const model = models.get(id);
  if (!model) return null;
  model.status = status;
  model.updatedAt = Date.now();
  if (status === 'production') {
    model.promotedAt = Date.now();
  }
  return model;
}

export function addEvaluationResult(id: string, result: Omit<EvaluationResult, 'id' | 'timestamp'>): ModelMetadata | null {
  const model = models.get(id);
  if (!model) return null;
  model.evaluationResults.push({
    ...result,
    id: randomUUID(),
    timestamp: Date.now(),
  });
  model.updatedAt = Date.now();
  return model;
}

/**
 * Check if a model passes the evaluation gate
 * A model must:
 * 1. Have at least one walk-forward evaluation
 * 2. Have at least one out-of-sample evaluation
 * 3. Beat the heuristic baseline by a meaningful margin (>5%)
 */
export function passesEvaluationGate(id: string, minImprovementPercent: number = 5): { passed: boolean; reasons: string[] } {
  const model = models.get(id);
  if (!model) return { passed: false, reasons: ['Model not found'] };

  const reasons: string[] = [];

  const hasWalkForward = model.evaluationResults.some(r => r.type === 'walk_forward' && r.passed);
  if (!hasWalkForward) reasons.push('Missing passing walk-forward evaluation');

  const hasOutOfSample = model.evaluationResults.some(r => r.type === 'out_of_sample' && r.passed);
  if (!hasOutOfSample) reasons.push('Missing passing out-of-sample evaluation');

  const bestImprovement = Math.max(0, ...model.evaluationResults.map(r => r.improvement));
  if (bestImprovement < minImprovementPercent) {
    reasons.push(`Best improvement ${bestImprovement.toFixed(1)}% is below minimum ${minImprovementPercent}%`);
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
}

export function promoteToProduction(id: string): { success: boolean; reason?: string } {
  const gate = passesEvaluationGate(id);
  if (!gate.passed) {
    return { success: false, reason: `Evaluation gate failed: ${gate.reasons.join(', ')}` };
  }

  const model = updateModelStatus(id, 'production');
  if (!model) return { success: false, reason: 'Model not found' };

  return { success: true };
}

export function deleteModel(id: string): boolean {
  return models.delete(id);
}

export function clearRegistry(): void {
  models.clear();
}
