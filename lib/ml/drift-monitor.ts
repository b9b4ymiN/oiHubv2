import type { DriftMeasurement, DriftAlert } from './types';

interface Baseline {
  featureId: string;
  mean: number;
  stddev: number;
  sampleSize: number;
  computedAt: number;
}

// Store baselines and measurements
const baselines = new Map<string, Baseline>();
const measurements = new Map<string, DriftMeasurement[]>();
const alerts: DriftAlert[] = [];

const MAX_MEASUREMENTS = 10000;
const DRIFT_THRESHOLDS = {
  low: 1.5,      // standard deviations
  medium: 2.5,
  high: 3.5,
};

/**
 * Set the baseline for a feature
 */
export function setBaseline(featureId: string, mean: number, stddev: number, sampleSize: number): void {
  baselines.set(featureId, {
    featureId,
    mean,
    stddev,
    sampleSize,
    computedAt: Date.now(),
  });
}

/**
 * Record a measurement for a feature
 */
export function recordMeasurement(
  featureId: string,
  value: number,
  window: string = '1h'
): DriftAlert | null {
  const baseline = baselines.get(featureId);
  if (!baseline) return null; // No baseline to compare against

  // Get or create measurements array
  let featureMeasurements = measurements.get(featureId);
  if (!featureMeasurements) {
    featureMeasurements = [];
    measurements.set(featureId, featureMeasurements);
  }

  // Calculate running statistics
  const measurement: DriftMeasurement = {
    featureId,
    timestamp: Date.now(),
    mean: value, // simplified - in production, calculate from window
    stddev: baseline.stddev,
    sampleSize: featureMeasurements.length + 1,
    window,
  };

  featureMeasurements.push(measurement);

  // Prune old measurements
  if (featureMeasurements.length > MAX_MEASUREMENTS) {
    measurements.set(featureId, featureMeasurements.slice(-MAX_MEASUREMENTS / 2));
  }

  // Check for drift
  const driftScore = baseline.stddev > 0
    ? Math.abs(value - baseline.mean) / baseline.stddev
    : 0;

  if (driftScore >= DRIFT_THRESHOLDS.low) {
    const severity: DriftAlert['severity'] =
      driftScore >= DRIFT_THRESHOLDS.high ? 'high' :
      driftScore >= DRIFT_THRESHOLDS.medium ? 'medium' : 'low';

    const alert: DriftAlert = {
      featureId,
      timestamp: Date.now(),
      baselineMean: baseline.mean,
      currentMean: value,
      driftScore,
      severity,
    };

    alerts.unshift(alert);
    if (alerts.length > 1000) alerts.length = 1000;

    return alert;
  }

  return null;
}

/**
 * Calculate statistics for a set of values
 */
export function calculateStats(values: number[]): { mean: number; stddev: number; sampleSize: number } {
  if (values.length === 0) return { mean: 0, stddev: 0, sampleSize: 0 };

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);

  return { mean, stddev, sampleSize: values.length };
}

/**
 * Get all drift alerts
 */
export function getDriftAlerts(limit = 50, severity?: DriftAlert['severity']): DriftAlert[] {
  let filtered = alerts;
  if (severity) {
    filtered = alerts.filter(a => a.severity === severity);
  }
  return filtered.slice(0, limit);
}

/**
 * Get measurements for a feature
 */
export function getMeasurements(featureId: string, limit = 100): DriftMeasurement[] {
  return (measurements.get(featureId) ?? []).slice(-limit);
}

/**
 * Get baseline for a feature
 */
export function getBaseline(featureId: string): Baseline | undefined {
  return baselines.get(featureId);
}

/**
 * Clear all drift state (for testing)
 */
export function clearDriftState(): void {
  baselines.clear();
  measurements.clear();
  alerts.length = 0;
}
