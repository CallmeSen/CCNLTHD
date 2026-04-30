import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { clsx } from 'clsx'
import {
  ArrowLeft,
  FileText,
  PieChart,
  TrendingUp,
  Shield,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
} from 'lucide-react'
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { reportApi } from '../services/api'
import toast from 'react-hot-toast'

const COLORS = ['#4263eb', '#5c7cfa', '#748ffc', '#91a7ff', '#bac8ff', '#dbe4ff', '#f0f4ff', '#10b981', '#34d399']

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard!'))
}

function PortfolioPieChart({ data }: { data: Record<string, number> }) {
  if (!data || Object.keys(data).length === 0) return null
  const chartData = Object.entries(data).map(([name, value]) => ({ name, value: Number((value * 100).toFixed(2)) }))
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="w-4 h-4 text-navy-600" />
        <h3 className="text-sm font-bold text-surface-900">Portfolio Allocation</h3>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <RePieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
            labelLine
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number) => [`${v.toFixed(2)}%`, 'Weight']}
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
          />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  )
}

function MetricsBarChart({ metrics }: { metrics: Record<string, unknown> }) {
  const portfolio = metrics?.portfolio as Record<string, unknown> | undefined
  if (!portfolio || typeof portfolio !== 'object') return null

  const entries = [
    { label: 'Ann. Return', value: portfolio?.annualized_return, fmt: '.2%' },
    { label: 'Volatility', value: portfolio?.annualized_volatility, fmt: '.2%' },
    { label: 'Sharpe', value: portfolio?.sharpe_ratio, fmt: '.2f' },
    { label: 'Max Drawdown', value: portfolio?.max_drawdown, fmt: '.2%' },
    { label: 'Exp. Return (CAPM)', value: portfolio?.expected_return_capm, fmt: '.2%' },
  ].filter((e) => e.value !== undefined && e.value !== null)

  if (entries.length === 0) return null

  const chartData = entries.map((e) => ({
    name: e.label,
    value: typeof e.value === 'number' ? e.value : parseFloat(String(e.value)),
  }))

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-violet-600" />
        <h3 className="text-sm font-bold text-surface-900">Portfolio Metrics</h3>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <Tooltip
            formatter={(v) => {
              return [typeof v === 'number' ? v.toFixed(2) : String(v), '']
            }}
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
          />
          <Bar dataKey="value" fill="#4263eb" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ValidationBadge({ result }: { result?: { status?: string; errors?: string[] } }) {
  if (!result) return null
  const { status, errors } = result
  const isPass = status?.toLowerCase() === 'pass'
  const isWarn = status?.toLowerCase() === 'hold'

  return (
    <div className={clsx(
      'card p-5',
      isPass && 'bg-emerald-50 border-emerald-200',
      isWarn && 'bg-amber-50 border-amber-200',
      !isPass && !isWarn && 'bg-surface-50 border-surface-200',
    )}>
      <div className="flex items-center gap-3 mb-2">
        {isPass && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        {isWarn && <AlertTriangle className="w-5 h-5 text-amber-600" />}
        {!isPass && !isWarn && <Shield className="w-5 h-5 text-surface-500" />}
        <span className={clsx(
          'text-sm font-bold',
          isPass && 'text-emerald-800',
          isWarn && 'text-amber-800',
          !isPass && !isWarn && 'text-surface-800',
        )}>
          Compliance: {status?.toUpperCase() ?? 'UNKNOWN'}
        </span>
      </div>
      {errors && errors.length > 0 && (
        <ul className="mt-2 space-y-1">
          {errors.map((err, i) => (
            <li key={i} className={clsx(
              'text-xs rounded-lg px-3 py-1.5',
              isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
            )}>
              {err}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none
      prose-headings:text-surface-900 prose-headings:font-bold
      prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
      prose-p:text-surface-600 prose-p:leading-relaxed
      prose-strong:text-surface-800 prose-strong:font-semibold
      prose-code:text-navy-700 prose-code:bg-navy-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
      prose-pre:bg-surface-800 prose-pre:rounded-xl
      prose-table:text-xs
      prose-th:bg-surface-100 prose-th:text-surface-700 prose-th:font-semibold
      prose-td:text-surface-600
      prose-a:text-navy-600 prose-a:no-underline hover:prose-a:underline
      prose-hr:border-surface-200
      prose-blockquote:border-l-navy-300 prose-blockquote:text-surface-500
    ">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}

export default function ReportPage() {
  const { runId } = useParams<{ runId: string }>()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['report', runId],
    queryFn: () => reportApi.get(runId!),
    enabled: !!runId,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-2xl gradient-navy flex items-center justify-center">
          <FileText className="w-6 h-6 text-white animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-surface-700 font-semibold">Loading report...</p>
          <p className="text-surface-400 text-sm mt-1">{runId}</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-md mx-auto card p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-surface-900 mb-2">Failed to load report</h2>
        <p className="text-surface-500 text-sm mb-4">{(error as Error)?.message}</p>
        <Link to="/analysis" className="btn-primary">Run new analysis</Link>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <Link
          to="/history"
          className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to History
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-surface-900 tracking-tight">Analysis Report</h1>
              <span className={clsx(
                'badge',
                data.status === 'completed' ? 'badge-success' : 'badge-warning',
              )}>
                {data.status}
              </span>
            </div>
            <p className="text-xs text-surface-400 mt-1 font-mono">{data.run_id}</p>
          </div>
          <button
            onClick={() => copyToClipboard(data.report)}
            className="btn-ghost text-sm"
            title="Copy report"
          >
            <Copy className="w-4 h-4" /> Copy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Charts */}
          {data.proposed_portfolio && Object.keys(data.proposed_portfolio).length > 0 && (
            <div className="animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
              <PortfolioPieChart data={data.proposed_portfolio} />
            </div>
          )}

          {data.metrics && (
            <div className="animate-slide-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
              <MetricsBarChart metrics={data.metrics} />
            </div>
          )}

          {/* Report */}
          <div className="card p-6 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            <div className="flex items-center gap-2 mb-5">
              <FileText className="w-4 h-4 text-navy-600" />
              <h2 className="text-sm font-bold text-surface-900">Full Report</h2>
            </div>
            <MarkdownContent content={data.report} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* User Profile */}
          {data.user_profile && Object.keys(data.user_profile).length > 0 && (
            <div className="card p-5 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
              <h3 className="text-sm font-bold text-surface-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-navy-600" /> User Profile
              </h3>
              <div className="space-y-3">
                {Object.entries(data.user_profile).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-start gap-2">
                    <span className="text-xs text-surface-500 font-medium capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-surface-800 font-semibold text-right">
                      {Array.isArray(val) ? (val as string[]).slice(0, 5).join(', ') : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compliance */}
          <div className="animate-slide-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
            <ValidationBadge result={data.validation_result} />
          </div>

          {/* Portfolio Summary */}
          {data.proposed_portfolio && Object.keys(data.proposed_portfolio).length > 0 && (
            <div className="card p-5 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
              <h3 className="text-sm font-bold text-surface-900 mb-4">Allocation</h3>
              <div className="space-y-2">
                {Object.entries(data.proposed_portfolio)
                  .sort(([, a], [, b]) => b - a)
                  .map(([ticker, weight]) => (
                    <div key={ticker} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-surface-700 w-16 truncate">{ticker}</span>
                      <div className="flex-1 bg-surface-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-navy-500 transition-all duration-700"
                          style={{ width: `${Math.max(Number(weight) * 100, 2)}%` }}
                        />
                      </div>
                      <span className="text-xs text-surface-500 font-medium w-12 text-right">
                        {(Number(weight) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 animate-slide-up" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
            <Link to="/analysis" className="btn-primary w-full justify-center">
              <TrendingUp className="w-4 h-4" /> New Analysis
            </Link>
            <Link to="/history" className="btn-secondary w-full justify-center">
              <Clock className="w-4 h-4" /> View History
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
