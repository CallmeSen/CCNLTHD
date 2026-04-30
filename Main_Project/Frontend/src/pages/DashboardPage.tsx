import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp,
  Shield,
  Brain,
  FileText,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { healthApi, historyApi } from '../services/api'
import { clsx } from 'clsx'

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
  delay: number
}) {
  return (
    <div
      className="card p-5 animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="badge-success text-xs">{sub}</span>
      </div>
      <p className="stat-value">{value}</p>
      <p className="stat-label mt-1">{label}</p>
    </div>
  )
}

function AgentFeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ElementType
  title: string
  description: string
  color: string
}) {
  return (
    <div className="card p-5 card-hover">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="text-sm font-bold text-surface-900 mb-1">{title}</h3>
      <p className="text-sm text-surface-500 leading-relaxed">{description}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: healthApi.check,
    refetchInterval: 30_000,
  })

  const { data: history } = useQuery({
    queryKey: ['history'],
    queryFn: historyApi.list,
  })

  const recentAnalyses = history?.slice(0, 5) ?? []
  const completedCount = history?.filter((h) => h.status === 'completed').length ?? 0

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
          Financial Advisory Dashboard
        </h1>
        <p className="text-surface-500 mt-1">
          AI-powered multi-agent portfolio analysis platform
        </p>
      </div>

      {/* Status Banner */}
      <div
        className={clsx(
          'card px-5 py-4 flex items-center gap-4 animate-slide-up',
          health?.status === 'healthy'
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200',
        )}
        style={{ animationDelay: '100ms', animationFillMode: 'both' }}
      >
        <div
          className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            health?.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500',
          )}
        >
          {health?.status === 'healthy' ? (
            <CheckCircle2 className="w-5 h-5 text-white" />
          ) : (
            <AlertCircle className="w-5 h-5 text-white" />
          )}
        </div>
        <div className="flex-1">
          <p
            className={clsx(
              'text-sm font-bold',
              health?.status === 'healthy' ? 'text-emerald-800' : 'text-amber-800',
            )}
          >
            API Status:{' '}
            <span className={health?.status === 'healthy' ? 'text-emerald-600' : 'text-amber-600'}>
              {health?.status ?? 'Checking...'}
            </span>
          </p>
          <p
            className={clsx('text-xs', health?.status === 'healthy' ? 'text-emerald-600' : 'text-amber-600')}
          >
            Database: {health?.database ?? 'Checking...'} &bull; {health?.timestamp ?? ''}
          </p>
        </div>
        <Link to="/analysis">
          <button className="btn-primary text-sm">
            New Analysis <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Brain}
          label="Agent Pipeline"
          value="9 Agents"
          sub="Active"
          color="bg-navy-500"
          delay={150}
        />
        <StatCard
          icon={Shield}
          label="Compliance"
          value="Active"
          sub="Enabled"
          color="bg-emerald-500"
          delay={200}
        />
        <StatCard
          icon={FileText}
          label="Reports"
          value={history?.length ?? 0}
          sub="Generated"
          color="bg-violet-500"
          delay={250}
        />
        <StatCard
          icon={Activity}
          label="Completed"
          value={completedCount}
          sub="Success"
          color="bg-cyan-500"
          delay={300}
        />
      </div>

      {/* Agent Pipeline */}
      <div className="animate-slide-up" style={{ animationDelay: '350ms', animationFillMode: 'both' }}>
        <h2 className="text-lg font-bold text-surface-900 mb-4">Multi-Agent Pipeline</h2>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
            {[
              { name: 'Intake', color: 'bg-blue-500' },
              { name: 'Portfolio', color: 'bg-indigo-500' },
              { name: 'Market', color: 'bg-violet-500' },
              { name: 'Metrics', color: 'bg-purple-500' },
              { name: 'Risk', color: 'bg-pink-500' },
              { name: 'Strategy', color: 'bg-rose-500' },
              { name: 'Compliance', color: 'bg-emerald-500' },
              { name: 'Report', color: 'bg-amber-500' },
              { name: 'Critic', color: 'bg-orange-500' },
            ].map((step, i, arr) => (
              <div key={step.name} className="flex items-center gap-2 flex-shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', step.color)}>
                    <span className="text-white text-xs font-bold">{i + 1}</span>
                  </div>
                  <span className="text-xs text-surface-500 font-medium">{step.name}</span>
                </div>
                {i < arr.length - 1 && (
                  <svg className="w-5 h-3 text-surface-300 flex-shrink-0" viewBox="0 0 20 12" fill="none">
                    <path d="M0 6h16M12 1l4 5-4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            ))}
          </div>

          {/* Agent descriptions */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-700 mb-1">1. IntakeAgent</p>
              <p className="text-xs text-blue-600">Parses client questions & intent</p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3">
              <p className="text-xs font-bold text-indigo-700 mb-1">2. PortfolioContext</p>
              <p className="text-xs text-indigo-600">Enriches portfolio with derived data</p>
            </div>
            <div className="bg-violet-50 rounded-xl p-3">
              <p className="text-xs font-bold text-violet-700 mb-1">3. MarketContext</p>
              <p className="text-xs text-violet-600">NAV, news & sector data</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-xs font-bold text-purple-700 mb-1">4. MetricEvaluator</p>
              <p className="text-xs text-purple-600">Scores funds 0-100</p>
            </div>
            <div className="bg-pink-50 rounded-xl p-3">
              <p className="text-xs font-bold text-pink-700 mb-1">5. RiskAnalysis</p>
              <p className="text-xs text-pink-600">Vol, drawdown, HHI, stress</p>
            </div>
            <div className="bg-rose-50 rounded-xl p-3">
              <p className="text-xs font-bold text-rose-700 mb-1">6. RebalanceStrategy</p>
              <p className="text-xs text-rose-600">Proposes BUY/SELL/SWITCH</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-xs font-bold text-emerald-700 mb-1">7. ComplianceGuard</p>
              <p className="text-xs text-emerald-600">PASS / HOLD / BLOCK</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700 mb-1">8. ReportWriter</p>
              <p className="text-xs text-amber-600">Generates markdown report</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-3">
              <p className="text-xs font-bold text-orange-700 mb-1">9. CriticAgent</p>
              <p className="text-xs text-orange-600">Reviews & approves report</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AgentFeatureCard
          icon={Brain}
          title="LLM-Powered"
          description="Uses OpenRouter with Gemini 2.0 Flash for intelligent analysis"
          color="bg-navy-500"
        />
        <AgentFeatureCard
          icon={TrendingUp}
          title="Portfolio Optimization"
          description="Data-driven allocation proposals based on user profile"
          color="bg-violet-500"
        />
        <AgentFeatureCard
          icon={Shield}
          title="Compliance Gate"
          description="Regulatory rule engine with YAML-based policies"
          color="bg-emerald-500"
        />
        <AgentFeatureCard
          icon={FileText}
          title="Multi-Language"
          description="Reports in English and Vietnamese"
          color="bg-amber-500"
        />
      </div>

      {/* Recent Activity */}
      <div className="animate-slide-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-surface-900">Recent Analyses</h2>
          <Link to="/history" className="text-sm font-semibold text-navy-600 hover:text-navy-700 flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {recentAnalyses.length === 0 ? (
          <div className="card p-10 flex flex-col items-center justify-center text-center">
            <Clock className="w-12 h-12 text-surface-300 mb-3" />
            <p className="text-surface-500 font-medium">No analyses yet</p>
            <p className="text-surface-400 text-sm mt-1">Run your first portfolio analysis to see results here</p>
            <Link to="/analysis" className="btn-primary mt-4 text-sm">
              Start Analysis
            </Link>
          </div>
        ) : (
          <div className="card divide-y divide-surface-100">
            {recentAnalyses.map((item) => (
              <Link
                key={item.run_id}
                to={`/report/${item.run_id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition-colors"
              >
                <div className={clsx(
                  'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                  item.status === 'completed' ? 'bg-emerald-50' : 'bg-amber-50',
                )}>
                  {item.status === 'completed' ? (
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                  ) : (
                    <Clock className="w-4.5 h-4.5 text-amber-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800 truncate">{item.request}</p>
                  <p className="text-xs text-surface-400 mt-0.5">{item.run_id}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={clsx(
                    'text-xs font-semibold px-2.5 py-1 rounded-full',
                    item.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
                  )}>
                    {item.status}
                  </span>
                  <ArrowRight className="w-4 h-4 text-surface-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
