import ConfigForm from '@/components/backtest/ConfigForm'

export default function NewBacktestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">New Backtest</h1>
          </div>
          <ConfigForm />
        </div>
      </div>
    </div>
  )
}
