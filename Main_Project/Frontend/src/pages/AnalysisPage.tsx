import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import {
  Send,
  Loader2,
  CheckCircle2,
  Sparkles,
  BarChart3,
  TrendingUp,
} from 'lucide-react'
import { analysisApi } from '../services/api'
import { useAnalysisStore } from '../store/analysisStore'

const AGENT_STEPS = [
  { id: 'intake', name: 'IntakeAgent', description: 'Parsing client intent & constraints' },
  { id: 'portfolio_context', name: 'PortfolioContextAgent', description: 'Enriching portfolio data' },
  { id: 'market_context', name: 'MarketContextAgent', description: 'Fetching NAV & market news' },
  { id: 'metric_evaluator', name: 'MetricEvaluatorAgent', description: 'Scoring funds (0-100)' },
  { id: 'risk_analysis', name: 'RiskAnalysisAgent', description: 'Computing risk metrics' },
  { id: 'rebalance_strategy', name: 'RebalanceStrategyAgent', description: 'Proposing BUY/SELL/SWITCH' },
  { id: 'compliance_guard', name: 'ComplianceGuardAgent', description: 'Regulatory compliance gate' },
  { id: 'report_writer', name: 'ReportWriterAgent', description: 'Generating advisory report' },
  { id: 'critic', name: 'CriticAgent', description: 'Reviewing & approving report' },
]

function AgentWorkflowTracker({ activeStep }: { activeStep: number }) {
  return (
    <div className="space-y-3">
      {AGENT_STEPS.map((step, i) => {
        const isPending = i > activeStep
        const isActive = i === activeStep
        const isDone = i < activeStep

        return (
          <div key={step.id} className="agent-step">
            <div className={clsx('agent-step-dot', {
              'bg-navy-500 ring-4 ring-navy-100 animate-pulse': isActive,
              'bg-emerald-500': isDone,
              'bg-surface-200': isPending,
            })} />
            <div className={clsx(
              'flex items-center gap-3 py-1',
              isActive && 'animate-slide-up',
            )}>
              <div className={clsx(
                'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                isActive && 'bg-navy-500 text-white animate-spin-slow',
                isDone && 'bg-emerald-500 text-white',
                isPending && 'bg-surface-200 text-surface-400',
              )}>
                {isActive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={clsx(
                  'text-sm font-semibold',
                  isActive && 'text-navy-700',
                  isDone && 'text-surface-700',
                  isPending && 'text-surface-400',
                )}>
                  {step.name}
                </p>
                <p className={clsx(
                  'text-xs',
                  isActive && 'text-navy-500',
                  isDone && 'text-surface-400',
                  isPending && 'text-surface-300',
                )}>
                  {isActive ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-navy-500 animate-dot-pulse inline-block" />
                      {step.description}
                    </span>
                  ) : step.description}
                </p>
              </div>
              {isActive && (
                <div className="badge-info">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Running
                </div>
              )}
              {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const SAMPLE_REQUESTS = [
  'I want a balanced portfolio for retirement, medium risk, 10-year horizon with focus on technology and healthcare sectors',
  'Generate a conservative portfolio for income generation, 5-year horizon, avoid high-volatility assets',
  'Create an aggressive growth portfolio, high risk tolerance, 15-year investment horizon, include emerging markets',
  'I am 35 years old, moderate risk, 20-year horizon. Generate a diversified portfolio of 20 stocks',
]

export default function AnalysisPage() {
  const [request, setRequest] = useState('')
  const [lang, setLang] = useState<'en' | 'vi'>('en')
  const [activeStep, setActiveStep] = useState(-1)
  const navigate = useNavigate()
  const { setAnalyzing, setResult, setRunId } = useAnalysisStore()

  const mutation = useMutation({
    mutationFn: analysisApi.submit,
    onMutate: () => {
      setAnalyzing(true)
      setActiveStep(0)
    },
    onSuccess: (data) => {
      setResult(data)
      setRunId(data.run_id)
      setActiveStep(-1)
      if (data.status === 'failed' || data.status === 'error') {
        toast.error(data.error || 'Analysis failed — no report generated')
        return
      }
      toast.success('Analysis complete!')
      navigate(`/report/${data.run_id}`)
    },
    onError: (err: Error) => {
      setActiveStep(-1)
      setAnalyzing(false)
      toast.error(err.message || 'Analysis failed')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!request.trim()) return
    mutation.mutate({ request: request.trim(), lang })
  }

  const isRunning = mutation.status === 'pending'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Portfolio Analysis</h1>
        <p className="text-surface-500 mt-1">
          Describe your investment goals and let the multi-agent pipeline analyze your portfolio
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-3 space-y-5">
          {/* Input Card */}
          <div className="card p-6 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-navy-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-surface-900">Investment Request</h2>
                <p className="text-xs text-surface-400">Describe your goals, risk tolerance & preferences</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <textarea
                  className="input min-h-[140px] resize-none"
                  placeholder={`Example:\n"I want a balanced portfolio for retirement, medium risk, 10-year horizon with focus on technology and healthcare sectors"\n\nYou can specify:\n• Investment goal (retirement, growth, income)\n• Risk tolerance (conservative, moderate, aggressive)\n• Time horizon (5 years, 10 years, long-term)\n• Specific sectors or assets to include/exclude\n• Number of assets (e.g., "select 20 stocks")`}
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  disabled={isRunning}
                  rows={6}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-surface-600">Language:</label>
                  <div className="flex rounded-xl overflow-hidden border border-surface-200">
                    {(['en', 'vi'] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLang(l)}
                        disabled={isRunning}
                        className={clsx(
                          'px-4 py-2 text-sm font-semibold transition-all',
                          lang === l
                            ? 'bg-navy-600 text-white'
                            : 'bg-surface-50 text-surface-500 hover:bg-surface-100',
                        )}
                      >
                        {l === 'en' ? 'English' : 'Tiếng Việt'}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isRunning || !request.trim()}
                  className="btn-primary flex-1"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Run Analysis
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Sample Requests */}
          <div className="card p-5 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
              Try these examples
            </p>
            <div className="space-y-2">
              {SAMPLE_REQUESTS.map((sample, i) => (
                <button
                  key={i}
                  onClick={() => setRequest(sample)}
                  disabled={isRunning}
                  className="w-full text-left px-4 py-3 rounded-xl bg-surface-50 hover:bg-surface-100 border border-surface-200 hover:border-surface-300 transition-all duration-200 text-sm text-surface-600 hover:text-surface-800"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Agent Workflow Tracker */}
        <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
          <div className="card p-5 sticky top-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-surface-900">Agent Pipeline</h2>
                <p className="text-xs text-surface-400">9 agents in sequence</p>
              </div>
            </div>

            {isRunning ? (
              <div className="mb-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-navy-50 rounded-xl border border-navy-100">
                  <div className="w-2 h-2 rounded-full bg-navy-500 animate-dot-pulse" />
                  <span className="text-sm font-semibold text-navy-700">
                    Agent {activeStep + 1} of {AGENT_STEPS.length}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-surface-500 mb-4 px-3 py-2 bg-surface-50 rounded-xl border border-surface-200">
                Submit a request to see the agent pipeline in action
              </p>
            )}

            <AgentWorkflowTracker activeStep={activeStep} />

            {isRunning && (
              <div className="mt-5 p-3 bg-navy-50 rounded-xl border border-navy-100">
                <p className="text-xs text-navy-600 leading-relaxed">
                  The LangGraph workflow is orchestrating 9 specialized agents in sequence.
                  Each agent contributes to the final advisory report.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* What to expect */}
      <div className="card p-5 animate-slide-up" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
        <h3 className="text-sm font-bold text-surface-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-navy-600" />
          What the analysis produces
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { title: 'User Profile', desc: 'Extracted investment preferences' },
            { title: 'Portfolio Allocation', desc: 'Proposed asset weights' },
            { title: 'Risk Metrics', desc: 'Volatility, Sharpe, drawdown' },
            { title: 'Compliance Gate', desc: 'Regulatory check result' },
            { title: 'Action Plan', desc: 'BUY/SELL/SWITCH recommendations' },
            { title: 'Advisory Report', desc: 'Full markdown report' },
            { title: 'Critic Review', desc: 'Quality-assured output' },
            { title: 'Visualization', desc: 'Interactive charts & plots' },
          ].map((item) => (
            <div key={item.title} className="bg-surface-50 rounded-xl p-3">
              <p className="text-xs font-bold text-surface-800">{item.title}</p>
              <p className="text-xs text-surface-400 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
