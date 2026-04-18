/**
 * Alert Templates Barrel Export
 * Tranche 3D: Template system exports
 */

// Export template type definitions
export type {
  AlertTemplate,
  TemplateCategory,
  TemplateOverride,
} from './types';

// Export template registry functions
export {
  registerTemplate,
  getTemplate,
  getAllTemplates,
  getTemplatesByCategory,
  instantiateTemplate,
  clearRegistry,
} from './registry';

// Export preset templates
export {
  registerAllTemplates,
  sigmaReach,
  oiDivergence,
  regimeTransition,
  fundingExtreme,
  liqCluster,
  whalePrint,
} from './presets';
