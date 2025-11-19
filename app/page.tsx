'use client'

import Link from 'next/link'
import { BlurNav } from '@/components/navigation/blur-nav'
import { BlurCard, BlurCardHeader, BlurCardTitle, BlurCardDescription, BlurCardContent } from '@/components/ui/blur-card'
import { BlurButton } from '@/components/ui/blur-button'
import { TrendingUp, Shield, Zap, BarChart3, Target, Eye } from 'lucide-react'

export default function HomePage() {
  const features = [
    {
      icon: BarChart3,
      title: 'OPTIONS IV ANALYSIS',
      description: 'Real-time implied volatility tracking with volatility smile visualization and Greeks analysis',
      color: 'text-blur-orange',
    },
    {
      icon: Shield,
      title: 'SUPPORT & RESISTANCE',
      description: 'Auto-detect key levels from options OI concentration and heavy dealer positioning',
      color: 'text-blur-green',
    },
    {
      icon: Zap,
      title: 'MARKET REGIME',
      description: 'AI-powered regime classification using funding rates, taker flow, and OI delta patterns',
      color: 'text-blur-yellow',
    },
    {
      icon: TrendingUp,
      title: 'OI DIVERGENCE',
      description: 'Identify bull/bear traps and continuation patterns through OI-price correlation analysis',
      color: 'text-blur-orange',
    },
    {
      icon: Target,
      title: 'SMART MONEY FLOW',
      description: 'Track institutional positioning through taker buy/sell volume and top trader metrics',
      color: 'text-blur-green',
    },
    {
      icon: Eye,
      title: 'LIQUIDATION ZONES',
      description: 'Visualize high-risk areas where cascading liquidations are likely to trigger',
      color: 'text-blur-yellow',
    },
  ]

  const stats = [
    { label: 'PROFESSIONAL RATING', value: '8.5/10' },
    { label: 'INFORMATION SUFFICIENCY', value: '90%' },
    { label: 'WIN RATE (HIGH CONFIDENCE)', value: '65-70%' },
  ]

  return (
    <div className="min-h-screen bg-blur-bg-primary">
      <BlurNav />

      {/* Hero Section */}
      <section className="relative pt-[100px] sm:pt-[140px] pb-xl3 px-md overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blur-orange/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-blur-yellow/10 rounded-full blur-3xl animate-blob animation-delay-2000" />

        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-lg">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-blur border border-blur-orange/30 bg-blur-orange/5">
              <div className="w-2 h-2 bg-blur-orange rounded-full animate-pulse" />
              <span className="text-blur-text-secondary text-xs uppercase tracking-wider">
                PROFESSIONAL TRADING PLATFORM
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-blur-text-primary leading-tight">
              PROFESSIONAL{' '}
              <span className="text-blur-orange text-glow-orange">OPTIONS & FUTURES</span>
              <br />
              ANALYSIS PLATFORM
            </h1>

            {/* Subheadline */}
            <p className="text-sm sm:text-base lg:text-lg text-blur-text-secondary max-w-2xl mx-auto">
              Real-time IV analysis, OI divergence detection, and AI-powered market regime insights.
              Free alternative to $50-100/month professional tools.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-lg">
              <BlurButton variant="primary" size="lg" asChild>
                <Link href="/dashboard">
                  LAUNCH DASHBOARD
                </Link>
              </BlurButton>
              <BlurButton variant="outline" size="lg" asChild>
                <Link href="/learn">
                  INTERACTIVE TUTORIAL
                </Link>
              </BlurButton>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-xl2 max-w-3xl mx-auto">
              {stats.map((stat) => (
                <BlurCard key={stat.label} variant="glass" className="p-md sm:p-lg">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-blur-orange mb-2">
                      {stat.value}
                    </div>
                    <div className="text-xs text-blur-text-muted uppercase tracking-wide">
                      {stat.label}
                    </div>
                  </div>
                </BlurCard>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-xl3 px-md">
        <div className="container mx-auto">
          <div className="text-center mb-xl2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blur-text-primary mb-4">
              CORE FEATURES
            </h2>
            <p className="text-blur-text-secondary text-sm sm:text-base max-w-2xl mx-auto">
              Multi-factor validation with 7+ independent indicators for professional-grade trading decisions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <BlurCard
                  key={feature.title}
                  variant="glass"
                  className="group hover:border-blur-orange/30 transition-all duration-300"
                >
                  <BlurCardHeader>
                    <div className={`w-12 h-12 rounded-blur bg-blur-bg-tertiary border border-white/8 flex items-center justify-center mb-4 group-hover:border-blur-orange/30 transition-all ${feature.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <BlurCardTitle className="text-xs sm:text-sm">
                      {feature.title}
                    </BlurCardTitle>
                  </BlurCardHeader>
                  <BlurCardContent>
                    <BlurCardDescription className="text-xs">
                      {feature.description}
                    </BlurCardDescription>
                  </BlurCardContent>
                </BlurCard>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-xl3 px-md bg-gradient-to-b from-transparent via-blur-bg-secondary/20 to-transparent">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-xl2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blur-text-primary mb-4">
              HOW IT WORKS
            </h2>
          </div>

          <div className="space-y-6">
            <BlurCard variant="glass">
              <BlurCardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-blur bg-blur-orange text-blur-bg-primary flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <BlurCardTitle>CONNECT TO REAL-TIME DATA</BlurCardTitle>
                </div>
              </BlurCardHeader>
              <BlurCardContent>
                <p className="text-blur-text-secondary text-xs sm:text-sm">
                  Direct integration with Binance Futures & Options API for live OI, IV, funding rates, and taker flow
                </p>
              </BlurCardContent>
            </BlurCard>

            <BlurCard variant="glass">
              <BlurCardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-blur bg-blur-orange text-blur-bg-primary flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <BlurCardTitle>AI ANALYZES 7+ INDICATORS</BlurCardTitle>
                </div>
              </BlurCardHeader>
              <BlurCardContent>
                <p className="text-blur-text-secondary text-xs sm:text-sm">
                  Automated detection of OI divergences, IV skew anomalies, support/resistance from options positioning, and market regime classification
                </p>
              </BlurCardContent>
            </BlurCard>

            <BlurCard variant="glass">
              <BlurCardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-blur bg-blur-orange text-blur-bg-primary flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <BlurCardTitle>GET ACTIONABLE SIGNALS</BlurCardTitle>
                </div>
              </BlurCardHeader>
              <BlurCardContent>
                <p className="text-blur-text-secondary text-xs sm:text-sm">
                  Clear entry/target/stop levels with confidence scoring. High-confidence setups (80%+) deliver 65-70% win rates
                </p>
              </BlurCardContent>
            </BlurCard>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-xl3 px-md">
        <div className="container mx-auto max-w-3xl">
          <BlurCard variant="bordered" glow className="p-lg sm:p-xl2 text-center">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-blur-text-primary mb-4">
              READY TO TRADE LIKE A PRO?
            </h3>
            <p className="text-blur-text-secondary text-sm sm:text-base mb-lg">
              Join professional traders using OI Trader Hub for data-driven decisions
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <BlurButton variant="primary" size="lg" asChild>
                <Link href="/dashboard">
                  START NOW - FREE
                </Link>
              </BlurButton>
              <BlurButton variant="ghost" size="lg" asChild>
                <Link href="/learn">
                  LEARN MORE
                </Link>
              </BlurButton>
            </div>
          </BlurCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-xl px-md border-t border-white/8">
        <div className="container mx-auto text-center text-blur-text-muted text-xs">
          <p>© 2025 OI TRADER HUB. BUILT FOR PROFESSIONAL TRADERS.</p>
        </div>
      </footer>
    </div>
  )
}
