import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center max-w-4xl">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          OI Trader Hub
        </h1>
        <p className="text-xl text-muted-foreground mb-12">
          Professional Futures Open Interest Analysis Platform
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-lg border bg-card">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-semibold mb-2">Real-Time Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Live OI, price, volume tracking with divergence detection
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <div className="text-3xl mb-2">🎯</div>
            <h3 className="font-semibold mb-2">Decision Support</h3>
            <p className="text-sm text-muted-foreground">
              Market regime classification and trade signal generation
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-semibold mb-2">Professional Tools</h3>
            <p className="text-sm text-muted-foreground">
              Liquidation heatmaps, funding rates, L/S ratios
            </p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:opacity-90 transition-opacity"
        >
          Launch Dashboard →
        </Link>

        <div className="mt-12 p-6 rounded-lg border bg-muted/50 text-left">
          <h3 className="font-semibold mb-3">Quick Start</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Install dependencies: <code className="bg-background px-2 py-1 rounded">npm install</code></li>
            <li>Copy <code className="bg-background px-2 py-1 rounded">.env.example</code> to <code className="bg-background px-2 py-1 rounded">.env.local</code></li>
            <li>Start dev server: <code className="bg-background px-2 py-1 rounded">npm run dev</code></li>
            <li>Visit <code className="bg-background px-2 py-1 rounded">/dashboard</code> to start trading analysis</li>
          </ol>
        </div>
      </div>
    </main>
  )
}
