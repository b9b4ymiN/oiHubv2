import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/ml/inference/route';
import { registerModel, clearRegistry, updateModelStatus } from '@/lib/ml/model-registry';
import { clearDriftState, setBaseline } from '@/lib/ml/drift-monitor';
import { clearCache } from '@/lib/ml/feature-store';

class MockRequest {
  private body: unknown;
  constructor(body: unknown) { this.body = body; }
  async json() { return this.body; }
}

const sampleBars = Array.from({ length: 20 }, (_, i) => ({
  timestamp: 1000 + i * 3600,
  open: 100 + i,
  high: 105 + i,
  low: 95 + i,
  close: 102 + i,
  volume: 1000 + i * 10,
  openInterest: 5000 + i * 50,
}));

describe('ML Inference API', () => {
  beforeEach(() => {
    clearRegistry();
    clearDriftState();
    clearCache();
  });

  it('returns 400 when symbol is missing', async () => {
    const request = new MockRequest({}) as unknown as Request;
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('symbol is required');
  });

  it('returns message when no production models', async () => {
    const request = new MockRequest({ symbol: 'BTCUSDT', interval: '5m', bars: sampleBars }) as unknown as Request;
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.symbol).toBe('BTCUSDT');
    expect(data.predictions).toEqual([]);
    expect(data.message).toBe('No production models available');
    expect(data.features).toBeDefined();
  });

  it('runs inference with production model', async () => {
    const model = registerModel({
      name: 'Test Classifier',
      version: '1.0.0',
      description: 'Test',
      type: 'binary_classifier',
      status: 'production',
      inputFeatures: ['price', 'volume', 'volatility'],
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

    const request = new MockRequest({ symbol: 'BTCUSDT', interval: '5m', bars: sampleBars }) as unknown as Request;
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.symbol).toBe('BTCUSDT');
    expect(data.predictions).toHaveLength(1);
    expect(data.predictions[0].modelId).toBe(model.id);
    expect(data.predictions[0].modelName).toBe('Test Classifier');
    expect(data.predictions[0].modelType).toBe('binary_classifier');
    expect(data.predictions[0].score).toBeDefined();
    expect(data.predictions[0].features).toBeDefined();
    expect(data.predictions[0].timestamp).toBeGreaterThan(0);
  });

  it('ignores non-production models', async () => {
    registerModel({
      name: 'Dev Model',
      version: '1.0.0',
      description: 'Dev',
      type: 'binary_classifier',
      status: 'development',
      inputFeatures: ['price'],
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

    const request = new MockRequest({ symbol: 'BTCUSDT', interval: '5m', bars: sampleBars }) as unknown as Request;
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.predictions).toHaveLength(0);
  });

  it('runs multiple production models', async () => {
    registerModel({
      name: 'Classifier',
      version: '1.0.0',
      description: 'C',
      type: 'binary_classifier',
      status: 'production',
      inputFeatures: ['price'],
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
      name: 'Regressor',
      version: '1.0.0',
      description: 'R',
      type: 'regression',
      status: 'production',
      inputFeatures: ['volume'],
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

    const request = new MockRequest({ symbol: 'BTCUSDT', interval: '5m', bars: sampleBars }) as unknown as Request;
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.predictions).toHaveLength(2);
  });

  it('detects drift on feature values', async () => {
    // Baseline key in route is `${model.id}:${key}`, so we need the model first
    const model = registerModel({
      name: 'Drift Test',
      version: '1.0.0',
      description: 'D',
      type: 'binary_classifier',
      status: 'production',
      inputFeatures: ['price'],
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

    // Set baseline with model-prefixed key to match route's recordMeasurement key
    setBaseline(`${model.id}:price`, 50, 5, 100);

    const request = new MockRequest({ symbol: 'BTCUSDT', interval: '5m', bars: sampleBars }) as unknown as Request;
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Price is ~121 which is far from baseline 50 - should trigger drift
    const driftAlerts = data.predictions[0].driftAlerts;
    expect(driftAlerts.length).toBeGreaterThan(0);
    expect(driftAlerts[0].driftScore).toBeGreaterThan(1.5);
  });

  it('uses cached vector when no bars provided', async () => {
    registerModel({
      name: 'Cache Test',
      version: '1.0.0',
      description: 'C',
      type: 'binary_classifier',
      status: 'production',
      inputFeatures: ['price'],
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

    // First request with bars to populate cache
    const req1 = new MockRequest({ symbol: 'BTCUSDT', interval: '1h', bars: sampleBars }) as unknown as Request;
    await POST(req1 as any);

    // Second request without bars - should use cache
    const req2 = new MockRequest({ symbol: 'BTCUSDT', interval: '1h' }) as unknown as Request;
    const response = await POST(req2 as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.predictions).toHaveLength(1);
  });

  it('returns 404 when no feature data available', async () => {
    const request = new MockRequest({ symbol: 'ETHUSDT', interval: '1h' }) as unknown as Request;
    const response = await POST(request as any);

    expect(response.status).toBe(404);
  });

  it('selects only relevant features for each model', async () => {
    registerModel({
      name: 'Selective Model',
      version: '1.0.0',
      description: 'S',
      type: 'binary_classifier',
      status: 'production',
      inputFeatures: ['price', 'nonexistent_feature'],
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

    const request = new MockRequest({ symbol: 'BTCUSDT', interval: '5m', bars: sampleBars }) as unknown as Request;
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    const features = data.predictions[0].features;
    expect(features.price).toBeDefined();
    expect(features.nonexistent_feature).toBeUndefined();
  });
});
