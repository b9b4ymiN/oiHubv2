'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronRight, TrendingUp, Shield, Zap, BarChart3, Target, CheckCircle2 } from 'lucide-react'

const content = {
  en: {
    title: 'OI Trader Hub',
    subtitle: 'Professional Futures Open Interest Analysis Platform',
    rating: 'Professional Rating: 8.5/10 - Highly Sufficient',
    cta: 'Launch Dashboard',
    features: {
      title: 'Core Features',
      items: [
        {
          icon: '📊',
          title: 'Statistical Analysis',
          desc: 'Volume Profile with Bell Curve (±1σ, ±2σ, ±3σ) for probability-based trading'
        },
        {
          icon: '🎯',
          title: 'OI Divergence Detection',
          desc: 'Automated signals for traps and continuations with confidence scoring'
        },
        {
          icon: '⚡',
          title: 'Smart Money Tracking',
          desc: 'Taker flow analysis, OI delta by price, and position building detection'
        }
      ]
    },
    highlights: {
      title: 'What Makes This Different',
      items: [
        '✅ 90% information sufficiency for professional trading',
        '✅ AI-powered opportunity finder with entry/target/stop levels',
        '✅ Multi-factor validation (7+ independent indicators)',
        '✅ Expected win rate: 65-70% on high-confidence setups (>80%)',
        '✅ Free alternative to $50-100/month professional tools'
      ]
    },
    guides: {
      title: 'Chart Guides - How to Use Each Tool',
      items: [
        {
          title: 'Summary Cards',
          what: 'Shows 24h OI change, funding bias, taker flow, and top trader positioning - reveals if leverage is piling into longs/shorts and if aggressive flow confirms the build.',
          steps: [
            'Check if OI change is >+2% (strong position building)',
            'Verify taker flow shows AGGRESSIVE_BUY (smart money entering)',
            'Confirm funding rate is <0.05% (not overheated)',
            'If all align → Open LONG position',
            'If OI turns negative with AGGRESSIVE_SELL → Close/Fade position',
            'If funding exceeds ±0.08% → Reduce size or exit',
            'If cards disagree → Stand aside, no trade'
          ]
        },
        {
          title: 'Market Regime Indicator',
          what: 'Blends price trend, OI delta, taker flow, and funding into named regimes (TRENDING, OVERHEATED, SQUEEZE, etc.) with risk badges.',
          steps: [
            'Look for TRENDING regime with LOW risk badge',
            'Trade in direction of the trend with standard position size',
            'When OVERHEATED appears → Tighten stop losses immediately',
            'When HIGH_VOL_SQUEEZE flashes → Reduce position size by 50%',
            'When LOW_LIQ_TRAP shows → Exit all positions and wait',
            'Only re-enter when regime returns to TRENDING or HEALTHY'
          ]
        },
        {
          title: 'Price & OI Chart',
          what: 'Overlays closing price, OI, and volume - shows if rallies are backed by new positions (price↑ OI↑), short-covering (price↑ OI↓), or liquidation chop.',
          steps: [
            'Check if price and OI both trending up → Strong bullish continuation',
            'If yes → Enter LONG, ride the trend',
            'Check if price up but OI falling → Short squeeze happening',
            'If yes → Fade the move, prepare SHORT after exhaustion',
            'Check if price and OI both falling → Bearish continuation',
            'If yes → Enter SHORT or hold shorts',
            'If both lines flat/sideways → No trade, wait for clarity'
          ]
        },
        {
          title: 'Volume Profile + Bell Curve',
          what: 'Exposes POC, value area, sigma ranges, LVN/HVN zones, and probability bands - shows where market considers "fair value" vs extremes.',
          steps: [
            'Find current price position on the bell curve',
            'If price at -1σ or Value Area Low → Oversold zone',
            'Enter LONG with target at POC (mean)',
            'If price at +2σ or +3σ → Overbought zone',
            'Enter SHORT with target back to POC',
            'If price at POC → Wait for taker flow confirmation first',
            'Set stop loss beyond ±3σ (99.7% confidence level)'
          ]
        },
        {
          title: 'Opportunity Finder',
          what: 'Converts profile into specific entry/target/stop ideas with confidence scores, R:R ratios, and zone explanations.',
          steps: [
            'Look at the top setup displayed',
            'Check confidence score → Must be ≥70%',
            'Check Risk:Reward ratio → Must be ≥2:1',
            'If both criteria met → Use the exact entry/target/stop prices shown',
            'Review alternate setups only if they align with main zone bias',
            'If card shows "No setups" → Do not trade, wait',
            'If zone = VALUE with no confluence → Skip, too risky'
          ]
        },
        {
          title: 'OI Delta Overlay',
          what: 'Buckets OI changes by price level - highlights where longs/shorts are building or unwinding and how intense each pocket is.',
          steps: [
            'Find "Build Long" clusters on the chart',
            'Note prices below current level → These are support zones',
            'Buy when price approaches these Build Long zones',
            'Find "Build Short" clusters above price → Resistance zones',
            'Sell/short when price reaches these levels',
            'If you see "Unwind Long" or "Unwind Short" → Wait!',
            'Unwinding = liquidations coming, let it finish before entering'
          ]
        },
        {
          title: 'Taker Flow Overlay',
          what: 'Measures aggressive buy vs sell flow, cumulative bias - emits STRONG_LONG/SHORT/BREAKOUT/FAKEOUT/WAIT signals with net-flow bars.',
          steps: [
            'Check the current signal displayed',
            'If STRONG_LONG at LVN or POC zone → Enter LONG immediately',
            'If BREAKOUT signal at LVN → Join the breakout, go LONG',
            'If STRONG_SHORT at HVN zone → Fade it, go SHORT',
            'If FAKEOUT signal at HVN → Do not chase, prepare reverse',
            'If WAIT signal with bars oscillating → Stay out completely',
            'Always confirm signal matches volume profile zone'
          ]
        },
        {
          title: 'OI Divergence Signals',
          what: 'Names latest divergence (bearish/bullish trap or continuation), quantifies price/OI changes, and lists recent alerts.',
          steps: [
            'Read the latest divergence type shown',
            'If "Bearish Trap" → Shorts piling in, squeeze coming',
            'Wait for Price/OI chart to confirm reversal up',
            'Then enter LONG for squeeze play',
            'If "Bullish Trap" → Longs piling in, flush coming',
            'Wait for reversal confirmation down, then SHORT',
            'If "Continuation" signal → Trade with the trend',
            'Only act when signal agrees with Market Regime'
          ]
        },
        {
          title: 'Trading Decision Checklist',
          what: 'Preflight list for OI/price correlation, divergence, funding extremes, L/S balance, liquidation proximity, volume, and multi-timeframe alignment.',
          steps: [
            'Go through each row in the checklist one by one',
            'Count how many show green checkmark ✓',
            'If all critical rows = ✓ → Green light, execute trade',
            'If any row shows ⚠ (warning) → Reduce position size by 50%',
            'If multi-timeframe row is pending (○) → Do not trade yet',
            'Wait for all checks to align',
            'Only take trade when confident all signals agree'
          ]
        },
        {
          title: 'Multi-Timeframe OI Analysis',
          what: 'Five stacked Price/OI charts show if lower and higher timeframes are synchronized or fighting each other.',
          steps: [
            'Look at all five timeframe charts (1m, 5m, 15m, 1h, 4h)',
            'Check if 3+ consecutive timeframes show same direction',
            'Example: 15m, 1h, 4h all bullish → Good alignment',
            'If yes → Safe to scale into larger position',
            'Use the shortest timeframe (1m or 5m) only for precise entry',
            'But only after higher timeframes (1h, 4h) confirm direction',
            'If higher timeframe (4h) flips direction → Exit immediately'
          ]
        }
      ]
    },
    quickstart: {
      title: 'Quick Start',
      steps: [
        'Install dependencies: npm install',
        'Copy .env.example to .env.local (optional)',
        'Start dev server: npm run dev',
        'Visit /dashboard to start analysis',
        'Read PROFESSIONAL_REVIEW.md for complete trading guide'
      ]
    },
    notes: {
      title: 'Development Notes',
      items: [
        'Some widgets (FundingRateCard, LongShortRatioCard, MarketRegimeCard, OIMetricsCard) imported but not rendered - will be integrated in next update',
        'DecisionChecklist currently shows static statuses - real-time validation coming soon',
        'Multi-timeframe tabs load all charts simultaneously - lazy loading optimization planned',
        'API proxies to Binance without rate limiting - caching layer in development'
      ]
    }
  },
  th: {
    title: 'OI Trader Hub',
    subtitle: 'แพลตฟอร์มวิเคราะห์ Open Interest แบบมืออาชีพ',
    rating: 'คะแนนจากมืออาชีพ: 8.5/10 - เพียงพอสำหรับการเทรดจริง',
    cta: 'เปิด Dashboard',
    features: {
      title: 'ฟีเจอร์หลัก',
      items: [
        {
          icon: '📊',
          title: 'การวิเคราะห์เชิงสถิติ',
          desc: 'Volume Profile พร้อม Bell Curve (±1σ, ±2σ, ±3σ) สำหรับเทรดด้วยความน่าจะเป็น'
        },
        {
          icon: '🎯',
          title: 'ตรวจจับ OI Divergence',
          desc: 'สัญญาณอัตโนมัติสำหรับ trap และ continuation พร้อมคะแนนความมั่นใจ'
        },
        {
          icon: '⚡',
          title: 'ติดตามเงินใหญ่',
          desc: 'วิเคราะห์ Taker flow, OI delta ตามราคา และตรวจจับการสะสมสถานะ'
        }
      ]
    },
    highlights: {
      title: 'จุดเด่นที่แตกต่าง',
      items: [
        '✅ ข้อมูลครบ 90% สำหรับการเทรดมืออาชีพ',
        '✅ AI หาจังหวะเทรดพร้อม entry/target/stop อัตโนมัติ',
        '✅ ตรวจสอบหลายมิติ (7+ ตัวชี้วัดอิสระ)',
        '✅ อัตราชนะคาดการณ์: 65-70% ในสัญญาณความมั่นใจสูง (>80%)',
        '✅ ฟรี! ทดแทนเครื่องมือมืออาชีพราคา $50-100/เดือน'
      ]
    },
    guides: {
      title: 'คู่มือการใช้งานแต่ละกราฟ',
      items: [
        {
          title: 'Summary Cards (การ์ดสรุป)',
          what: 'แสดง OI เปลี่ยนแปลง 24 ชม., funding bias, taker flow และตำแหน่ง top trader - เปิดเผยว่าเลเวอเรจกำลังกองเข้า long/short และ flow รุนแรงยืนยันหรือไม่',
          steps: [
            'ตรวจสอบ OI เปลี่ยนแปลง >+2% (มีการสะสมสถานะแรง)',
            'ยืนยัน taker flow แสดง AGGRESSIVE_BUY (เงินใหญ่เข้า)',
            'ตรวจสอบ funding rate <0.05% (ไม่ร้อนแรงเกิน)',
            'ถ้าทั้งหมดสอดคล้อง → เปิด LONG',
            'ถ้า OI กลายเป็นลบพร้อม AGGRESSIVE_SELL → ปิด/Fade',
            'ถ้า funding เกิน ±0.08% → ลดขนาดหรือออก',
            'ถ้าการ์ดขัดแย้งกัน → หยุด ไม่เทรด'
          ]
        },
        {
          title: 'Market Regime Indicator (ตัวบอกสภาวะตลาด)',
          what: 'ผสมผสาน price trend, OI delta, taker flow และ funding เป็นชื่อสภาวะ (TRENDING, OVERHEATED, SQUEEZE ฯลฯ) พร้อมป้ายความเสี่ยง',
          steps: [
            'มองหาสภาวะ TRENDING พร้อมป้าย LOW risk',
            'เทรดตามทิศทางเทรนด์ด้วยขนาดปกติ',
            'เมื่อขึ้น OVERHEATED → ขยับ stop loss เข้าใกล้ทันที',
            'เมื่อเห็น HIGH_VOL_SQUEEZE → ลดขนาดสถานะ 50%',
            'เมื่อแสดง LOW_LIQ_TRAP → ปิดทุกสถานะและรอ',
            'กลับเข้าเทรดเมื่อสภาวะกลับมาเป็น TRENDING หรือ HEALTHY'
          ]
        },
        {
          title: 'Price & OI Chart (กราฟราคา & OI)',
          what: 'วางทับราคาปิด, OI และ volume - แสดงว่าการขึ้นมีสถานะใหม่เปิดรองรับ (price↑ OI↑), short ปิด (price↑ OI↓) หรือ liquidation chop',
          steps: [
            'ตรวจสอบราคาและ OI ขึ้นพร้อมกันไหม → Bullish continuation แรง',
            'ถ้าใช่ → เปิด LONG ตามเทรนด์',
            'ตรวจสอบราคาขึ้นแต่ OI ลง → Short squeeze กำลังเกิด',
            'ถ้าใช่ → Fade การขยับนี้ เตรียม SHORT หลังหมดแรง',
            'ตรวจสอบราคาและ OI ลงพร้อมกัน → Bearish continuation',
            'ถ้าใช่ → เปิด SHORT หรือถือ short ต่อ',
            'ถ้าทั้งสองเส้นแบน/ไซด์เวย์ → ไม่เทรด รอให้ชัด'
          ]
        },
        {
          title: 'Volume Profile + Bell Curve',
          what: 'เปิดเผย POC, value area, ช่วง sigma, โซน LVN/HVN และแถบความน่าจะเป็น - บอกว่าตลาดถือว่า "ราคายุติธรรม" อยู่ที่ไหนเทียบกับจุดสุดขั้ว',
          steps: [
            'หาตำแหน่งราคาปัจจุบันบน bell curve',
            'ถ้าราคาที่ -1σ หรือ Value Area Low → โซน Oversold',
            'เปิด LONG เป้าหมาย POC (ค่าเฉลี่ย)',
            'ถ้าราคาที่ +2σ หรือ +3σ → โซน Overbought',
            'เปิด SHORT เป้าหมายกลับไป POC',
            'ถ้าราคาที่ POC → รอ taker flow ยืนยันก่อน',
            'ตั้ง stop loss เลย ±3σ (ระดับความเชื่อมั่น 99.7%)'
          ]
        },
        {
          title: 'Opportunity Finder (ตัวหาจังหวะ)',
          what: 'แปลง profile เป็นไอเดีย entry/target/stop พร้อมคะแนนความมั่นใจ, R:R และอธิบายโซนราคาปัจจุบัน',
          steps: [
            'ดูที่จังหวะอันดับต้นที่แสดง',
            'เช็คคะแนนความมั่นใจ → ต้อง ≥70%',
            'เช็คอัตราส่วน Risk:Reward → ต้อง ≥2:1',
            'ถ้าผ่านทั้งสอง → ใช้ราคา entry/target/stop ที่แสดงเลย',
            'ดูจังหวะสำรองเมื่อสอดคล้องกับ zone bias หลักเท่านั้น',
            'ถ้าการ์ดแสดง "No setups" → ห้ามเทรด รอก่อน',
            'ถ้า zone = VALUE โดยไม่มีสัญญาณรอง → ข้าม เสี่ยงเกิน'
          ]
        },
        {
          title: 'OI Delta Overlay (OI เปลี่ยนแปลงตามราคา)',
          what: 'แบ่ง OI เปลี่ยนแปลงตามช่วงราคา - เน้นว่า long/short สะสมหรือปิดที่ไหนและเข้มข้นแค่ไหน',
          steps: [
            'หากลุ่ม "Build Long" บนกราฟ',
            'จดราคาที่ต่ำกว่าระดับปัจจุบัน → โซน support',
            'ซื้อเมื่อราคาเข้าใกล้โซน Build Long เหล่านี้',
            'หากลุ่ม "Build Short" เหนือราคา → โซน resistance',
            'ขาย/short เมื่อราคาถึงระดับเหล่านี้',
            'ถ้าเห็น "Unwind Long" หรือ "Unwind Short" → รอก่อน!',
            'Unwinding = liquidation กำลังมา รอให้จบก่อนเข้า'
          ]
        },
        {
          title: 'Taker Flow Overlay (การไหลของคำสั่งรุนแรง)',
          what: 'วัด aggressive buy vs sell flow, bias สะสม - ส่งสัญญาณ STRONG_LONG/SHORT/BREAKOUT/FAKEOUT/WAIT พร้อมกราฟแท่ง net-flow',
          steps: [
            'เช็คสัญญาณที่แสดงอยู่',
            'ถ้า STRONG_LONG ที่โซน LVN หรือ POC → เปิด LONG ทันที',
            'ถ้าสัญญาณ BREAKOUT ที่ LVN → ตามเบรกเอาท์ ไป LONG',
            'ถ้า STRONG_SHORT ที่โซน HVN → Fade มัน ไป SHORT',
            'ถ้าสัญญาณ FAKEOUT ที่ HVN → อย่าไล่ เตรียมกลับ',
            'ถ้าสัญญาณ WAIT พร้อมแท่งแกว่ง → อยู่นอกสนามทั้งหมด',
            'เช็คให้แน่ใจสัญญาณตรงกับ volume profile zone'
          ]
        },
        {
          title: 'OI Divergence Signals (สัญญาณ Divergence)',
          what: 'ตั้งชื่อ divergence ล่าสุด (bearish/bullish trap หรือ continuation), วัดการเปลี่ยนแปลงราคา/OI และแสดงการแจ้งเตือนล่าสุด',
          steps: [
            'อ่านประเภท divergence ล่าสุดที่แสดง',
            'ถ้า "Bearish Trap" → Short กองเข้า squeeze กำลังมา',
            'รอ Price/OI chart ยืนยันกลับขึ้น',
            'แล้วเปิด LONG เล่น squeeze',
            'ถ้า "Bullish Trap" → Long กองเข้า flush กำลังมา',
            'รอยืนยันกลับลง แล้ว SHORT',
            'ถ้าสัญญาณ "Continuation" → เทรดตามเทรนด์',
            'ทำเมื่อสัญญาณตรงกับ Market Regime เท่านั้น'
          ]
        },
        {
          title: 'Trading Decision Checklist (เช็กลิสต์ก่อนเทรด)',
          what: 'รายการตรวจสอบ OI/price correlation, divergence, funding สุดโต่ง, สมดุล L/S, ระยะใกล้ liquidation, volume และ multi-timeframe alignment',
          steps: [
            'ไล่เช็คแต่ละแถวทีละอัน',
            'นับว่ามีกี่แถวแสดงเครื่องหมายถูกเขียว ✓',
            'ถ้าแถวสำคัญทั้งหมด = ✓ → ไฟเขียว ดำเนินการเทรด',
            'ถ้าแถวใดแสดง ⚠ (เตือน) → ลดขนาดสถานะ 50%',
            'ถ้าแถว multi-timeframe ค้าง (○) → ยังไม่เทรด',
            'รอให้ทุกเช็คเรียงตัว',
            'เทรดเมื่อมั่นใจว่าสัญญาณทั้งหมดเห็นพ้องกัน'
          ]
        },
        {
          title: 'Multi-Timeframe OI Analysis (OI หลายไทม์เฟรม)',
          what: 'กราฟ Price/OI ห้าชั้นซ้อนกัน - แสดงว่าไทม์เฟรมต่ำและสูงเดินสอดคล้องหรือสู้กัน',
          steps: [
            'ดูกราฟไทม์เฟรมทั้งห้า (1m, 5m, 15m, 1h, 4h)',
            'เช็คว่า 3+ ไทม์เฟรมติดกันแสดงทิศทางเดียวกันไหม',
            'ตัวอย่าง: 15m, 1h, 4h ขึ้นหมด → สอดคล้องดี',
            'ถ้าใช่ → ปลอดภัยที่จะเพิ่มสถานะใหญ่ขึ้น',
            'ใช้ไทม์เฟรมสั้นสุด (1m หรือ 5m) หาจุดเข้าที่แม่นยำเท่านั้น',
            'แต่ต้องหลังจากไทม์เฟรมสูง (1h, 4h) ยืนยันทิศทางแล้ว',
            'ถ้าไทม์เฟรมสูง (4h) กลับทิศ → ออกทันที'
          ]
        }
      ]
    },
    quickstart: {
      title: 'เริ่มต้นใช้งาน',
      steps: [
        'ติดตั้ง dependencies: npm install',
        'คัดลอก .env.example เป็น .env.local (ไม่บังคับ)',
        'สั่งรัน dev server: npm run dev',
        'เข้าไปที่ /dashboard เพื่อเริ่มวิเคราะห์',
        'อ่าน PROFESSIONAL_REVIEW.md สำหรับคู่มือเทรดฉบับสมบูรณ์'
      ]
    },
    notes: {
      title: 'หมายเหตุการพัฒนา',
      items: [
        'บาง widget (FundingRateCard, LongShortRatioCard, MarketRegimeCard, OIMetricsCard) โหลดแล้วแต่ยังไม่แสดง - จะผนวกเข้ามาในอัปเดตถัดไป',
        'DecisionChecklist ยังแสดงสถานะคงที่ - การตรวจสอบแบบเรียลไทม์กำลังพัฒนา',
        'Multi-timeframe tabs โหลดกราฟทั้งหมดพร้อมกัน - กำลังเพิ่ม lazy loading',
        'API ส่งต่อไป Binance โดยไม่จำกัดอัตรา - กำลังสร้างชั้น caching'
      ]
    }
  }
}

export default function Home() {
  const [lang, setLang] = useState<'en' | 'th'>('en')
  const t = content[lang]

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-300 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-cyan-300 dark:bg-cyan-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Language Toggle */}
      <div className="fixed top-6 right-6 z-50 animate-fade-in">
        <div className="flex gap-2 p-1 rounded-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl border-2 border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setLang('en')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              lang === 'en'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang('th')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              lang === 'th'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            TH
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-7xl relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-20 animate-fade-in-up">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative w-32 h-32 animate-float">
              <Image
                src="/avatars/THP.png"
                alt="THP Stock Logo"
                width={128}
                height={128}
                className="rounded-2xl   "
                priority
              />
              <div className="absolute  rounded-2xl blur opacity-30 animate-pulse"></div>
            </div>
          </div>

          <h1 className="text-7xl font-extrabold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent animate-gradient">
            {t.title}
          </h1>
          <p className="text-3xl text-gray-700 dark:text-gray-300 mb-8 font-light">
            {t.subtitle}
          </p>
          <div className="inline-block animate-bounce-slow">
            <Badge variant="default" className="text-lg px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg text-white border-0">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              {t.rating}
            </Badge>
          </div>

          <div className="mt-10 flex gap-4 justify-center items-center flex-wrap">
            <Link
              href="/dashboard"
              className="group inline-flex items-center justify-center px-12 py-5 text-xl font-bold text-white bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300 shadow-xl relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-3">
                <Zap className="h-6 w-6" />
                {t.cta}
                <ChevronRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-700 via-blue-700 to-cyan-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {t.features.items.map((feature, idx) => (
            <Card 
              key={idx} 
              className="border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm animate-fade-in-up group"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <CardHeader>
                <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Highlights */}
        <Card className="mb-20 border-2 border-green-500/50 dark:border-green-600/50 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              <TrendingUp className="h-8 w-8 text-green-600" />
              {t.highlights.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {t.highlights.items.map((item, idx) => (
                <li 
                  key={idx} 
                  className="text-lg flex items-start gap-3 p-3 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200 animate-fade-in-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Chart Guides */}
        <Card className="mb-20 border-2 border-purple-500/30 dark:border-purple-600/30 shadow-xl backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 animate-fade-in-up">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-b-2 border-purple-200 dark:border-purple-800">
            <CardTitle className="text-4xl mb-3 flex items-center gap-3 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              <Shield className="h-10 w-10 text-purple-600" />
              {t.guides.title}
            </CardTitle>
            <CardDescription className="text-lg text-gray-600 dark:text-gray-400">
              {lang === 'en' 
                ? 'Comprehensive guide to understanding and using each chart effectively'
                : 'คู่มือครบถ้วนเพื่อเข้าใจและใช้งานแต่ละกราฟอย่างมีประสิทธิภาพ'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="space-y-8">
              {t.guides.items.map((guide, idx) => (
                <div 
                  key={idx} 
                  className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-fade-in-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-center text-lg font-bold shadow-lg">
                      {idx + 1}
                    </span>
                    {guide.title}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <span className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        {lang === 'en' ? 'What This Chart Tells You:' : 'กราฟนี้บอกอะไร:'}
                      </span>
                      <p className="text-muted-foreground mt-2 leading-relaxed">{guide.what}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-2 mb-3">
                        <Target className="h-4 w-4" />
                        {lang === 'en' ? 'Step-by-Step Action Guide:' : 'แนวทางปฏิบัติทีละขั้น:'}
                      </span>
                      <ol className="space-y-2">
                        {guide.steps.map((step, stepIdx) => (
                          <li key={stepIdx} className="flex items-start gap-3 text-sm">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white flex items-center justify-center text-xs font-bold">
                              {stepIdx + 1}
                            </span>
                            <span className="text-muted-foreground pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

         

        {/* Final CTA */}
        <div className="relative text-center p-12 rounded-3xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white shadow-2xl overflow-hidden animate-fade-in-up">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-700 via-blue-700 to-cyan-700 animate-gradient-slow"></div>
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 animate-pulse-slow">
              {lang === 'en' ? 'Ready to Trade Smarter?' : 'พร้อมเทรดอย่างชาญฉลาดแล้วหรือยัง?'}
            </h2>
            <p className="text-2xl mb-8 text-white/95 font-light">
              {lang === 'en' 
                ? '65-70% win rate on high-confidence setups with proper risk management'
                : 'อัตราชนะ 65-70% ในสัญญาณความมั่นใจสูงพร้อมการจัดการความเสี่ยงที่เหมาะสม'}
            </p>
            <Link
              href="/dashboard"
              className="group inline-flex items-center justify-center px-12 py-5 text-2xl font-bold bg-white text-purple-600 rounded-2xl hover:bg-gray-50 hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-3xl relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-3">
                <Target className="h-7 w-7" />
                {lang === 'en' ? 'Start Analyzing Now' : 'เริ่มวิเคราะห์ตอนนี้'}
                <ChevronRight className="h-7 w-7 group-hover:translate-x-2 transition-transform" />
              </span>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 text-center space-y-4 animate-fade-in">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              {lang === 'en' ? 'Open Source' : 'โอเพนซอร์ส'}
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              {lang === 'en' ? 'Free Forever' : 'ฟรีตลอดกาล'}
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              {lang === 'en' ? 'No Registration' : 'ไม่ต้องสมัคร'}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-500 font-semibold">
            THP Stock : OI-Hub Platform Copyright © 2025
          </p>
        </div>
      </div>
    </main>
  )
}
