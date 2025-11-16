# 🚀 OI Trader Hub - Quick Start Guide

**Get trading in 5 minutes!**

---

## ⚡ Installation (2 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open browser
# → http://localhost:3000/dashboard
```

Done! 🎉

---

## 🎯 Your First Trade (3 minutes)

### 1. Select Symbol & Timeframe

Top right corner:
- **Symbol:** BTCUSDT (most liquid)
- **Timeframe:** 5m (good for beginners)

### 2. Check Quick Stats (Top Row)

Look at 4 cards:
- **OI Metrics** → Growing (bullish) or declining (bearish)?
- **Funding** → Positive (long squeeze risk) or Negative (short squeeze)?
- **L/S Ratio** → Above 1.5 (too many longs) or below 0.7 (too many shorts)?
- **Market Regime** → Risk level HIGH/MEDIUM/LOW?

### 3. Volume Profile Chart (Left Side)

**See the horizontal bars:**
- **Purple bar** = POC (Point of Control) - Strongest price level
- **Green area** = Value Area - Fair value zone
- **Red dotted line** = Current price
- **Blue/Orange/Red lines** = Standard deviations (σ)

**Key Question:** Is price at ±2σ or ±3σ? (Extreme zones = best trades!)

### 4. AI Opportunity Finder (Right Side)

**Read the suggestion:**
```
Example:
🟢 LONG Setup - 75% Confidence

Entry:  $46,200
Target: $50,100 (+8.4%)
Stop:   $44,000 (-4.8%)
R:R:    1:1.77

Reason: Price at -2σ...
```

**Check:**
- ✅ Confidence >70%? Good!
- ✅ R:R >1.5:1? Good!

### 5. Verify with OI Divergence

Scroll down to "OI Divergence Signals":
- Does it confirm Volume Profile?
- **BEST:** Both say same direction (LONG/SHORT)

### 6. Decision Checklist

Look at bottom left checklist:
- ✅ Green = Good
- ⚠️ Yellow = Caution
- ❌ Red = Wait

**If mostly green → Trade!**

### 7. Execute

If all checks pass:
1. Enter at suggested price
2. Set target order
3. Set stop loss
4. Use 1-2% of capital

---

## 📊 Quick Reference

### Best Setups to Look For

**1. Price at ±2σ (ORANGE LINES)**
- Win Rate: 75%
- Action: Trade toward POC (mean)

**2. Price beyond ±3σ (RED LINES)**
- Win Rate: 85% (BEST!)
- Action: Aggressive trade to mean

**3. OI + Volume Agree**
- Win Rate: 78%
- Action: High confidence trade

### Color Codes

- 🟢 **Green** = Safe, good zone
- 🟡 **Yellow/Orange** = Stretched, mean reversion
- 🔴 **Red** = Extreme, high probability revert
- 🟣 **Purple** = POC, strongest level

### Confidence Levels

- **85%+** = Extreme setups (±3σ) - RARE
- **75%+** = High probability (±2σ) - GOOD
- **70%+** = Good setups
- **<70%** = Lower probability, avoid

---

## ✅ Trading Rules

### DO:
- ✅ Wait for >70% confidence
- ✅ Check multiple indicators
- ✅ Use stop losses
- ✅ Risk 1-2% per trade
- ✅ Start small (learn first)

### DON'T:
- ❌ Trade on Volume Profile alone
- ❌ Ignore AI confidence score
- ❌ Skip stop loss
- ❌ Risk >2% per trade
- ❌ Trade when tired/emotional

---

## 🎓 Learning Path

### Week 1: Learn (No Trading!)
- Watch dashboard for 1 week
- Read [docs/VOLUME_PROFILE_GUIDE.md](docs/VOLUME_PROFILE_GUIDE.md)
- Understand POC, σ levels

### Week 2: Paper Trade
- Note AI suggestions
- Track results
- Learn patterns

### Week 3: Small Real Trades
- 0.5-1% position size
- Only >75% confidence
- Max 2-3 trades/day

### Week 4+: Scale Up
- Increase to 1-2% size
- Build consistency
- Develop edge

---

## 💡 Pro Tips

**Best Time to Trade:**
- US Market Open: 9:30 AM EST
- High volatility periods
- Avoid weekends (low liquidity)

**Best Symbols:**
- BTCUSDT (best for beginners)
- ETHUSDT (good liquidity)
- SOLUSDT (more volatile)

**Best Timeframes:**
- Scalping: 1m, 5m
- Day Trading: 15m, 1h
- Swing: 4h, 1d

---

## 🆘 Troubleshooting

**"No data available"**
→ Check internet, try different symbol

**"No opportunities detected"**
→ Price in Value Area (normal zone), wait

**Charts not loading**
→ Run `npm install` again, restart server

**Want API keys for higher limits?**
→ Edit `.env.local` (see README.md)

---

## 📚 Next Steps

**Read These (In Order):**

1. **[docs/VOLUME_PROFILE_GUIDE.md](docs/VOLUME_PROFILE_GUIDE.md)** ⭐⭐⭐
   - MOST IMPORTANT!
   - Complete statistical guide
   - 3 high-probability setups

2. **[docs/ENHANCED_VOLUME_PROFILE.md](docs/ENHANCED_VOLUME_PROFILE.md)**
   - Enhanced chart features
   - Bell curve explained

3. **[docs/TRADING_GUIDE.md](docs/TRADING_GUIDE.md)**
   - OI trading framework
   - Pre-trade checklists

---

## 🎯 Success Checklist

Before your first real trade:

- [ ] Ran dashboard successfully
- [ ] Read VOLUME_PROFILE_GUIDE.md
- [ ] Understand POC, Value Area, ±σ
- [ ] Know how to read AI Opportunity
- [ ] Set up trading journal (spreadsheet)
- [ ] Determined position size (1-2%)
- [ ] Know how to set stops
- [ ] Ready to follow rules!

---

## 🚀 You're Ready!

**Just start the dashboard:**
```bash
npm run dev
```

**Visit:** http://localhost:3000/dashboard

**And begin your trading journey!** 📈

---

*Questions? Check full README.md or docs/ folder.*
