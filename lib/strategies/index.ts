import { getStrategyRegistry } from '@/lib/backtest/registry'
import { StatisticalMeanReversion } from './statistical-mean-reversion'
import { OIVolumeDoubleConfirmation } from './oi-volume-double-confirmation'
import { RegimeBasedMomentum } from './regime-based-momentum'

// Auto-register built-in strategies
const registry = getStrategyRegistry()
if (!registry.has('statistical-mean-reversion')) registry.register(new StatisticalMeanReversion())
if (!registry.has('oi-volume-double-confirmation')) registry.register(new OIVolumeDoubleConfirmation())
if (!registry.has('regime-based-momentum')) registry.register(new RegimeBasedMomentum())

export { StatisticalMeanReversion } from './statistical-mean-reversion'
export { OIVolumeDoubleConfirmation } from './oi-volume-double-confirmation'
export { RegimeBasedMomentum } from './regime-based-momentum'
export { validateStrategyParams, statisticalMeanReversionSchema, oiVolumeDoubleConfirmationSchema, regimeBasedMomentumSchema } from './schemas'
