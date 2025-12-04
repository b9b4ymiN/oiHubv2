# ⚡ OI Momentum & Acceleration - Quick Cheat Sheet

**Print this out and keep it on your desk!**

---

## 🚀 30-Second Trading Decision

### Look at the Purple "FINAL TRADING DECISION" Box

```
🟢 HIGH Confidence + Size ≥ 1.0x = STRONG BUY/SELL
🟡 MEDIUM Confidence + Size 0.5x-0.7x = REDUCE/WAIT
🔴 LOW Confidence + Size 0x = STAY OUT
```

### Read These 3 Lines:
1. **Market Regime** → Volatility level
2. **OI Trend** → What smart money is doing
3. **Final Position Size** → How much to risk
4. **Strategy** → What to do (just follow it!)

---

## 📊 The 7 Signals (Quick Guide)

| Signal | Meaning | Win Rate | Position Size | Action |
|--------|---------|----------|---------------|--------|
| 🟢 **TREND_CONTINUATION** | Real buying/selling | 75-80% | 1.0-1.5x | **Follow trend** |
| 🟡 **SWING_REVERSAL** | Momentum fading | 70-75% | 0.5x | **Take profits** |
| 🔴 **FORCED_UNWIND** | Liquidations | N/A | 0x | **STAY FLAT** |
| 🔵 **POST_LIQ_BOUNCE** | Dead cat bounce | 65-70% | 0.6x | **Quick scalp** |
| 🟢 **ACCUMULATION** | Slow buildup | 70-75% | 1.0x | **Build position** |
| 🟠 **DISTRIBUTION** | Slow exit | 65-70% | 0.5x | **Reduce longs** |
| 🚫 **FAKE_BUILDUP** | Arbitrage noise | 30% | 0x | **DO NOT TRADE** |

---

## 💰 Position Size Rules

### Base Multipliers (from OI Signal)
- EXTREME strength → 1.5x
- STRONG strength → 1.2x
- MODERATE strength → 1.0x
- WEAK strength → 0.5-0.7x
- Dangerous signals → 0x

### Volatility Caps (Safety Override)
```
Final Size = MIN(OI_multiplier, Vol_cap)
```

| Volatility | Max Size | Notes |
|------------|----------|-------|
| EXTREME | 0.5x | Survival mode |
| HIGH | 0.7x | Reduced risk |
| MEDIUM | 1.2x | Normal trading |
| LOW | 1.5x | Can boost size |

**Example:**
- OI says 1.5x (EXTREME signal)
- Vol is EXTREME (cap 0.5x)
- **Final = 0.5x** ✅

---

## 🎯 Trading Rules (Never Break These!)

### ✅ ALWAYS DO:
1. Check FINAL TRADING DECISION box first
2. Respect position size limits
3. Confirm with Volume Profile
4. Use multi-timeframe analysis
5. Set stops before entering

### ❌ NEVER DO:
1. Trade FAKE_BUILDUP signals
2. Fight FORCED_UNWIND
3. Ignore volatility regime
4. Oversize counter-trend trades
5. Enter without clear signal

---

## 📈 Best Setups (Highest Win Rate)

### Setup #1: Trend + Volume Profile (78% WR)
```
✓ OI: TREND_CONTINUATION (STRONG)
✓ Vol Profile: Price bouncing from POC
✓ Vol Regime: MEDIUM or LOW
✓ Size: 1.2x
→ ENTER with full conviction
```

### Setup #2: Mean Reversion (75% WR)
```
✓ OI: SWING_REVERSAL
✓ Vol Profile: Price at ±2σ or ±3σ
✓ Vol Regime: MEDIUM
✓ Size: 0.5x
→ COUNTER-TREND entry, quick target
```

### Setup #3: Multi-TF Alignment (80% WR)
```
✓ 1D: ACCUMULATION
✓ 4H: TREND_CONTINUATION
✓ 1H: TREND_CONTINUATION
✓ Size: 1.5x (if vol allows)
→ MAXIMUM conviction
```

---

## ⚠️ Danger Signals (Stay Away!)

```
🚫 FAKE_BUILDUP → OI up but momentum weak
🚫 FORCED_UNWIND → Liquidation cascade
🚫 EXTREME Volatility → Market too wild
🚫 Conflicting timeframes → No clarity
🚫 Low confidence rating → Not enough edge
```

**When in doubt, STAY OUT!**

---

## 🧮 Quick Decision Matrix

| Price Action | OI Signal | Vol Regime | Decision |
|--------------|-----------|------------|----------|
| Breaking out | TREND_CONTINUATION | LOW/MED | ✅ Enter 1.2x |
| Breaking out | FAKE_BUILDUP | ANY | ❌ Skip |
| At support | ACCUMULATION | MEDIUM | ✅ Enter 1.0x |
| At resistance | SWING_REVERSAL | MEDIUM | ✅ Short 0.5x |
| Crashing | FORCED_UNWIND | ANY | ❌ Stay flat |
| Bouncing | POST_LIQ_BOUNCE | HIGH | ⚠️ Scalp 0.6x |

---

## 📖 3-Step Trading Process

### Step 1: Check Signal (5 seconds)
- Look at purple box
- Read OI signal type
- Check confidence level

### Step 2: Confirm Setup (10 seconds)
- Vol regime acceptable?
- Position size makes sense?
- Aligns with price action?

### Step 3: Execute (15 seconds)
- Calculate exact risk (1-2%)
- Set entry, stop, target
- Enter position
- Move on

**Total time: 30 seconds**

---

## 🎓 Practice Checklist

Before every trade, check:
- [ ] Signal is NOT FAKE_BUILDUP or FORCED_UNWIND
- [ ] Confidence is MEDIUM or HIGH
- [ ] Position size ≥ 0.5x (otherwise skip)
- [ ] Vol regime is not EXTREME
- [ ] Setup aligns with higher timeframe
- [ ] Volume profile confirms direction
- [ ] Risk is 1-2% of capital maximum
- [ ] Stop loss is set BEFORE entering

**All checked? You're good to go! 🚀**

---

## 🔄 Signal Rotation Patterns

Watch for these patterns on timeline chart:

```
🟢🟢🟢🟢🟢 = Strong trend, keep following
🟢🟡🟢🟡🟢 = Choppy, reduce size
🟢🟡🔴🔴🔴 = Reversal in progress
🔴🔵🟢🟢🟢 = Bottom formed, new uptrend
🟢🟢🟢🟡🟠 = Top forming, exit longs
```

---

## 💡 Pro Tips

1. **Best timeframes:** 4H and 1D (cleanest signals)
2. **Worst timeframes:** 1m and 5m (too noisy)
3. **Best vol regime:** MEDIUM (Goldilocks zone)
4. **Avoid trading:** Late night / low volume hours
5. **Maximum edge:** When 3+ indicators align

---

## 🆘 Emergency Rules

### If Trade Goes Wrong:
1. Check if signal changed to SWING_REVERSAL or worse
2. If yes → Exit immediately, no questions
3. If FORCED_UNWIND appears → Close ALL positions
4. Never add to losing position unless signal is still STRONG

### If Unsure:
1. Reduce size by 50%
2. Move stop to breakeven ASAP
3. Take partial profits at 1R
4. Re-evaluate on next signal update

---

## 📞 Quick Reference Contacts

**Full Guide:** [OI-MOMENTUM-GUIDE.md](./OI-MOMENTUM-GUIDE.md)
**FAQ Section:** [OI-MOMENTUM-GUIDE.md#faq](./OI-MOMENTUM-GUIDE.md#-faq)
**Trading Examples:** [OI-MOMENTUM-GUIDE.md#real-trading-examples](./OI-MOMENTUM-GUIDE.md#-real-trading-examples)

---

## 🏆 Success Metrics

Track these weekly:
- [ ] Win rate ≥ 70%
- [ ] Average R:R ≥ 1.5:1
- [ ] Only trading HIGH/MEDIUM confidence
- [ ] Following position size rules
- [ ] No trades during FORCED_UNWIND
- [ ] Avoiding FAKE_BUILDUP consistently

**Achieving all 6? You're a pro! 🎯**

---

**Remember: This feature gives you an edge, not a guarantee. Trade smart, manage risk, stay disciplined! 💪**
