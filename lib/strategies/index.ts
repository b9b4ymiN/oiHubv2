import { getStrategyRegistry } from '@/lib/backtest/registry'
import { StatisticalMeanReversion } from './statistical-mean-reversion'
import { OIVolumeDoubleConfirmation } from './oi-volume-double-confirmation'
import { RegimeBasedMomentum } from './regime-based-momentum'
import { SignalOIDivergence } from './signal-oi-divergence'
import { SignalOIMomentum } from './signal-oi-momentum'
import { SignalVolatilityRegime } from './signal-volatility-regime'
import { SignalOIMomentumVol } from './signal-oi-momentum-vol'

// Auto-register built-in strategies
const registry = getStrategyRegistry()
if (!registry.has('statistical-mean-reversion')) registry.register(new StatisticalMeanReversion())
if (!registry.has('oi-volume-double-confirmation')) registry.register(new OIVolumeDoubleConfirmation())
if (!registry.has('regime-based-momentum')) registry.register(new RegimeBasedMomentum())
if (!registry.has('signal-oi-divergence')) registry.register(new SignalOIDivergence())
if (!registry.has('signal-oi-momentum')) registry.register(new SignalOIMomentum())
if (!registry.has('signal-volatility-regime')) registry.register(new SignalVolatilityRegime())
if (!registry.has('signal-oi-momentum-vol')) registry.register(new SignalOIMomentumVol())

export { StatisticalMeanReversion } from './statistical-mean-reversion'
export { OIVolumeDoubleConfirmation } from './oi-volume-double-confirmation'
export { RegimeBasedMomentum } from './regime-based-momentum'
export { SignalOIDivergence } from './signal-oi-divergence'
export { SignalOIMomentum } from './signal-oi-momentum'
export { SignalVolatilityRegime } from './signal-volatility-regime'
export { SignalOIMomentumVol } from './signal-oi-momentum-vol'
export { validateStrategyParams, statisticalMeanReversionSchema, oiVolumeDoubleConfirmationSchema, regimeBasedMomentumSchema } from './schemas'
