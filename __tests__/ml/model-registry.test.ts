import { describe, expect, it, beforeEach } from 'vitest';
import {
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
  type ModelMetadata,
  type ModelStatus,
  type ModelType,
} from '@/lib/ml/model-registry';

describe('Model Registry', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('registerModel', () => {
    it('creates model with UUID', () => {
      const model = registerModel({
        name: 'Test Model',
        version: '1.0.0',
        description: 'A test model',
        type: 'binary_classifier' as ModelType,
        status: 'development' as ModelStatus,
        inputFeatures: ['feature1', 'feature2'],
        outputSchema: { prediction: 'boolean' },
        metrics: { accuracy: 0.9 },
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: { learningRate: 0.01 },
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      expect(model.id).toBeDefined();
      expect(model.id.length).toBeGreaterThan(0);
      expect(model.createdAt).toBeDefined();
      expect(model.updatedAt).toBeDefined();
      expect(model.promotedAt).toBeNull();
    });

    it('stores model with all provided fields', () => {
      const model = registerModel({
        name: 'Test Model',
        version: '1.0.0',
        description: 'A test model',
        type: 'regression' as ModelType,
        status: 'staging' as ModelStatus,
        inputFeatures: ['f1'],
        outputSchema: { value: 'number' },
        metrics: { sharpeContribution: 1.5 },
        trainingConfig: {
          trainingWindow: '3months',
          outOfSampleWindow: '1month',
          featureVersion: '2.0',
          hyperparameters: { epochs: 100 },
          dataRange: { start: 0, end: 500000 },
        },
        evaluationResults: [],
      });

      expect(model.name).toBe('Test Model');
      expect(model.version).toBe('1.0.0');
      expect(model.type).toBe('regression');
      expect(model.status).toBe('staging');
    });
  });

  describe('getModel', () => {
    it('retrieves model by ID', () => {
      const created = registerModel({
        name: 'Test',
        version: '1.0.0',
        description: 'Test',
        type: 'binary_classifier' as ModelType,
        status: 'development' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      const retrieved = getModel(created.id);
      expect(retrieved).toEqual(created);
    });

    it('returns undefined for non-existent ID', () => {
      expect(getModel('non-existent')).toBeUndefined();
    });
  });

  describe('getAllModels', () => {
    it('returns all models', () => {
      registerModel({
        name: 'Model 1',
        version: '1.0.0',
        description: 'First',
        type: 'binary_classifier' as ModelType,
        status: 'development' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      registerModel({
        name: 'Model 2',
        version: '1.0.0',
        description: 'Second',
        type: 'regression' as ModelType,
        status: 'production' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      const all = getAllModels();
      expect(all).toHaveLength(2);
    });

    it('returns empty array when no models', () => {
      expect(getAllModels()).toEqual([]);
    });
  });

  describe('getProductionModels', () => {
    it('filters by production status', () => {
      registerModel({
        name: 'Dev Model',
        version: '1.0.0',
        description: 'Dev',
        type: 'binary_classifier' as ModelType,
        status: 'development' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      registerModel({
        name: 'Prod Model',
        version: '1.0.0',
        description: 'Prod',
        type: 'binary_classifier' as ModelType,
        status: 'production' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      const prodModels = getProductionModels();
      expect(prodModels).toHaveLength(1);
      expect(prodModels[0].name).toBe('Prod Model');
    });
  });

  describe('getModelsByType', () => {
    it('filters by type', () => {
      registerModel({
        name: 'Classifier',
        version: '1.0.0',
        description: 'Classifier',
        type: 'binary_classifier' as ModelType,
        status: 'development' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      registerModel({
        name: 'Regression',
        version: '1.0.0',
        description: 'Regression',
        type: 'regression' as ModelType,
        status: 'development' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      const classifiers = getModelsByType('binary_classifier');
      expect(classifiers).toHaveLength(1);
      expect(classifiers[0].name).toBe('Classifier');

      const regressions = getModelsByType('regression');
      expect(regressions).toHaveLength(1);
      expect(regressions[0].name).toBe('Regression');
    });
  });

  describe('updateModelStatus', () => {
    it('changes status', () => {
      const model = registerModel({
        name: 'Test',
        version: '1.0.0',
        description: 'Test',
        type: 'binary_classifier' as ModelType,
        status: 'development' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      const originalUpdatedAt = model.updatedAt;
      const updated = updateModelStatus(model.id, 'staging');
      expect(updated?.status).toBe('staging');
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it('returns null for non-existent model', () => {
      expect(updateModelStatus('non-existent', 'production')).toBeNull();
    });

    it('sets promotedAt when status is production', () => {
      const model = registerModel({
        name: 'Test',
        version: '1.0.0',
        description: 'Test',
        type: 'binary_classifier' as ModelType,
        status: 'staging' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      const updated = updateModelStatus(model.id, 'production');
      expect(updated?.promotedAt).toBeDefined();
      expect(updated?.promotedAt).toBeGreaterThan(0);
    });

    it('does not set promotedAt for non-production status', () => {
      const model = registerModel({
        name: 'Test',
        version: '1.0.0',
        description: 'Test',
        type: 'binary_classifier' as ModelType,
        status: 'production' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      const updated = updateModelStatus(model.id, 'deprecated');
      expect(updated?.promotedAt).toBeNull();
    });
  });

  describe('addEvaluationResult', () => {
    it('adds result to model', () => {
      const model = registerModel({
        name: 'Test',
        version: '1.0.0',
        description: 'Test',
        type: 'binary_classifier' as ModelType,
        status: 'development' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      const updated = addEvaluationResult(model.id, {
        type: 'walk_forward',
        score: 0.85,
        baselineScore: 0.75,
        improvement: 13.33,
        details: { trades: 100 },
        passed: true,
      });

      expect(updated?.evaluationResults).toHaveLength(1);
      expect(updated?.evaluationResults[0].type).toBe('walk_forward');
      expect(updated?.evaluationResults[0].id).toBeDefined();
    });

    it('returns null for non-existent model', () => {
      const result = addEvaluationResult('non-existent', {
        type: 'walk_forward',
        score: 0.8,
        baselineScore: 0.7,
        improvement: 14.29,
        details: {},
        passed: true,
      });
      expect(result).toBeNull();
    });
  });

  describe('passesEvaluationGate', () => {
    it('checks all criteria pass', () => {
      const model = registerModel({
        name: 'Test',
        version: '1.0.0',
        description: 'Test',
        type: 'binary_classifier' as ModelType,
        status: 'development' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      addEvaluationResult(model.id, {
        type: 'walk_forward',
        score: 0.85,
        baselineScore: 0.75,
        improvement: 13.33,
        details: {},
        passed: true,
      });

      addEvaluationResult(model.id, {
        type: 'out_of_sample',
        score: 0.80,
        baselineScore: 0.70,
        improvement: 14.29,
        details: {},
        passed: true,
      });

      const result = passesEvaluationGate(model.id);
      expect(result.passed).toBe(true);
      expect(result.reasons).toEqual([]);
    });

    it('fails without walk-forward', () => {
      const model = registerModel({
        name: 'Test',
        version: '1.0.0',
        description: 'Test',
        type: 'binary_classifier' as ModelType,
        status: 'development' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      addEvaluationResult(model.id, {
        type: 'out_of_sample',
        score: 0.80,
        baselineScore: 0.70,
        improvement: 14.29,
        details: {},
        passed: true,
      });

      const result = passesEvaluationGate(model.id);
      expect(result.passed).toBe(false);
      expect(result.reasons).toContain('Missing passing walk-forward evaluation');
    });

    it('fails without out-of-sample', () => {
      const model = registerModel({
        name: 'Test',
        version: '1.0.0',
        description: 'Test',
        type: 'binary_classifier' as ModelType,
        status: 'development' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      addEvaluationResult(model.id, {
        type: 'walk_forward',
        score: 0.85,
        baselineScore: 0.75,
        improvement: 13.33,
        details: {},
        passed: true,
      });

      const result = passesEvaluationGate(model.id);
      expect(result.passed).toBe(false);
      expect(result.reasons).toContain('Missing passing out-of-sample evaluation');
    });

    it('fails without sufficient improvement', () => {
      const model = registerModel({
        name: 'Test',
        version: '1.0.0',
        description: 'Test',
        type: 'binary_classifier' as ModelType,
        status: 'development' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      addEvaluationResult(model.id, {
        type: 'walk_forward',
        score: 0.76,
        baselineScore: 0.75,
        improvement: 1.33,
        details: {},
        passed: true,
      });

      addEvaluationResult(model.id, {
        type: 'out_of_sample',
        score: 0.71,
        baselineScore: 0.70,
        improvement: 1.43,
        details: {},
        passed: true,
      });

      const result = passesEvaluationGate(model.id, 5);
      expect(result.passed).toBe(false);
      expect(result.reasons.some(r => r.includes('below minimum'))).toBe(true);
    });

    it('returns failure for non-existent model', () => {
      const result = passesEvaluationGate('non-existent');
      expect(result.passed).toBe(false);
      expect(result.reasons).toContain('Model not found');
    });
  });

  describe('promoteToProduction', () => {
    it('succeeds with passing gate', () => {
      const model = registerModel({
        name: 'Test',
        version: '1.0.0',
        description: 'Test',
        type: 'binary_classifier' as ModelType,
        status: 'staging' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      addEvaluationResult(model.id, {
        type: 'walk_forward',
        score: 0.85,
        baselineScore: 0.75,
        improvement: 13.33,
        details: {},
        passed: true,
      });

      addEvaluationResult(model.id, {
        type: 'out_of_sample',
        score: 0.80,
        baselineScore: 0.70,
        improvement: 14.29,
        details: {},
        passed: true,
      });

      const result = promoteToProduction(model.id);
      expect(result.success).toBe(true);
      expect(getModel(model.id)?.status).toBe('production');
    });

    it('fails with failing gate', () => {
      const model = registerModel({
        name: 'Test',
        version: '1.0.0',
        description: 'Test',
        type: 'binary_classifier' as ModelType,
        status: 'staging' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      const result = promoteToProduction(model.id);
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Evaluation gate failed');
    });
  });

  describe('deleteModel', () => {
    it('removes model', () => {
      const model = registerModel({
        name: 'Test',
        version: '1.0.0',
        description: 'Test',
        type: 'binary_classifier' as ModelType,
        status: 'development' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      expect(getModel(model.id)).toBeDefined();
      expect(deleteModel(model.id)).toBe(true);
      expect(getModel(model.id)).toBeUndefined();
    });

    it('returns false for non-existent model', () => {
      expect(deleteModel('non-existent')).toBe(false);
    });
  });

  describe('clearRegistry', () => {
    it('empties all models', () => {
      registerModel({
        name: 'Test',
        version: '1.0.0',
        description: 'Test',
        type: 'binary_classifier' as ModelType,
        status: 'development' as ModelStatus,
        inputFeatures: [],
        outputSchema: {},
        metrics: {},
        trainingConfig: {
          trainingWindow: '6months',
          outOfSampleWindow: '2months',
          featureVersion: '1.0',
          hyperparameters: {},
          dataRange: { start: 0, end: 1000000 },
        },
        evaluationResults: [],
      });

      expect(getAllModels()).toHaveLength(1);
      clearRegistry();
      expect(getAllModels()).toHaveLength(0);
    });
  });
});
