import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";
import {
  Send,
  Loader2,
  CheckCircle2,
  Sparkles,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { analysisApi } from "@/services/api";
import { useAnalysisStore } from "@/store/analysisStore";

function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}

const AGENT_STEPS = [
  { id: "intake", name: "IntakeAgent", description: "Parsing client intent & constraints" },
  { id: "portfolio_context", name: "PortfolioContextAgent", description: "Enriching portfolio data" },
  { id: "market_context", name: "MarketContextAgent", description: "Fetching NAV & market news" },
  { id: "metric_evaluator", name: "MetricEvaluatorAgent", description: "Scoring funds (0-100)" },
  { id: "risk_analysis", name: "RiskAnalysisAgent", description: "Computing risk metrics" },
  { id: "rebalance_strategy", name: "RebalanceStrategyAgent", description: "Proposing BUY/SELL/SWITCH" },
  { id: "compliance_guard", name: "ComplianceGuardAgent", description: "Regulatory compliance gate" },
  { id: "report_writer", name: "ReportWriterAgent", description: "Generating advisory report" },
  { id: "critic", name: "CriticAgent", description: "Reviewing & approving report" },
];

const SAMPLE_REQUESTS = [
  "I want a balanced portfolio for retirement, medium risk, 10-year horizon with focus on technology and healthcare sectors",
  "Generate a conservative portfolio for income generation, 5-year horizon, avoid high-volatility assets",
  "Create an aggressive growth portfolio, high risk tolerance, 15-year investment horizon, include emerging markets",
  "I am 35 years old, moderate risk, 20-year horizon. Generate a diversified portfolio of 20 stocks",
];

function AgentWorkflowTracker({ activeStep }: { activeStep: number }) {
  return (
    <div className="space-y-3">
      {AGENT_STEPS.map((step, i) => {
        const isPending = i > activeStep;
        const isActive = i === activeStep;
        const isDone = i < activeStep;

        return (
          <div key={step.id} className="agent-step">
            <div
              className={cn(
                "agent-step-dot",
                isActive && "bg-primary ring-4 ring-primary/10 animate-pulse",
                isDone && "bg-success",
                isPending && "bg-muted"
              )}
            />
            <div className={cn("flex items-center gap-3 py-1", isActive && "animate-slide-up")}>
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
                  isActive && "bg-primary text-primary-foreground animate-spin-slow",
                  isDone && "bg-success text-white",
                  isPending && "bg-muted text-muted-foreground"
                )}
              >
                {isActive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    isActive && "text-primary",
                    isDone && "text-foreground/70",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.name}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    isActive && "text-primary/70",
                    isDone && "text-muted-foreground",
                    isPending && "text-muted-foreground/50"
                  )}
                >
                  {isActive ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-dot-pulse inline-block" />
                      {step.description}
                    </span>
                  ) : step.description}
                </p>
              </div>
              {isActive && (
                <span className="badge-info">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Running
                </span>
              )}
              {isDone && <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Analysis() {
  const [request, setRequest] = useState("");
  const [lang, setLang] = useState<"en" | "vi">("en");
  const [activeStep, setActiveStep] = useState(-1);
  const navigate = useNavigate();
  const { setAnalyzing, setResult, setRunId } = useAnalysisStore();

  const mutation = useMutation({
    mutationFn: analysisApi.submit,
    onMutate: () => {
      setAnalyzing(true);
      setActiveStep(0);
    },
    onSuccess: (data) => {
      setResult(data);
      setRunId(data.run_id);
      setActiveStep(-1);
      if (data.status === "failed" || data.status === "error") {
        toast.error(data.error || "Analysis failed");
        return;
      }
      toast.success("Analysis complete!");
      navigate(`/report/${data.run_id}`);
    },
    onError: (err: Error) => {
      setActiveStep(-1);
      setAnalyzing(false);
      toast.error(err.message || "Analysis failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!request.trim()) return;
    mutation.mutate({ request: request.trim(), lang });
  };

  const isRunning = mutation.status === "pending";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Portfolio Analysis
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Describe your investment goals and let the multi-agent pipeline analyze your portfolio
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-3 space-y-5">
          <div
            className="card p-6 animate-slide-up"
            style={{ animationDelay: "100ms", animationFillMode: "both" }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Investment Request</h2>
                <p className="text-xs text-muted-foreground">
                  Describe your goals, risk tolerance & preferences
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                className="input min-h-[140px] resize-none"
                placeholder={`Example:\n"I want a balanced portfolio for retirement, medium risk, 10-year horizon with focus on technology and healthcare sectors"\n\nYou can specify:\n* Investment goal (retirement, growth, income)\n* Risk tolerance (conservative, moderate, aggressive)\n* Time horizon (5 years, 10 years, long-term)\n* Specific sectors or assets to include/exclude`}
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                disabled={isRunning}
                rows={6}
              />

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Language:
                  </label>
                  <div className="flex rounded-xl overflow-hidden border border-border">
                    {(["en", "vi"] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLang(l)}
                        disabled={isRunning}
                        className={cn(
                          "px-4 py-2 text-sm font-semibold transition-all",
                          lang === l
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {l === "en" ? "English" : "Tieng Viet"}
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
          <div
            className="card p-5 animate-slide-up"
            style={{ animationDelay: "200ms", animationFillMode: "both" }}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Try these examples
            </p>
            <div className="space-y-2">
              {SAMPLE_REQUESTS.map((sample, i) => (
                <button
                  key={i}
                  onClick={() => setRequest(sample)}
                  disabled={isRunning}
                  className="w-full text-left px-4 py-3 rounded-xl bg-muted/50 hover:bg-muted border border-border hover:border-muted-foreground/30 transition-all duration-200 text-sm text-muted-foreground hover:text-foreground"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Agent Workflow Tracker */}
        <div
          className="lg:col-span-2 animate-slide-up"
          style={{ animationDelay: "150ms", animationFillMode: "both" }}
        >
          <div className="card p-5 sticky top-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-info/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-info" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Agent Pipeline</h2>
                <p className="text-xs text-muted-foreground">9 agents in sequence</p>
              </div>
            </div>

            {isRunning ? (
              <div className="mb-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="w-2 h-2 rounded-full bg-primary animate-dot-pulse" />
                  <span className="text-sm font-semibold text-primary">
                    Agent {activeStep + 1} of {AGENT_STEPS.length}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4 px-3 py-2 bg-muted/50 rounded-xl border border-border">
                Submit a request to see the agent pipeline in action
              </p>
            )}

            <AgentWorkflowTracker activeStep={activeStep} />

            {isRunning && (
              <div className="mt-5 p-3 bg-primary/5 rounded-xl border border-primary/20">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The LangGraph workflow is orchestrating 9 specialized agents in sequence.
                  Each agent contributes to the final advisory report.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* What to expect */}
      <div
        className="card p-5 animate-slide-up"
        style={{ animationDelay: "250ms", animationFillMode: "both" }}
      >
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          What the analysis produces
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { title: "User Profile", desc: "Extracted investment preferences" },
            { title: "Portfolio Allocation", desc: "Proposed asset weights" },
            { title: "Risk Metrics", desc: "Volatility, Sharpe, drawdown" },
            { title: "Compliance Gate", desc: "Regulatory check result" },
            { title: "Action Plan", desc: "BUY/SELL/SWITCH recommendations" },
            { title: "Advisory Report", desc: "Full markdown report" },
            { title: "Critic Review", desc: "Quality-assured output" },
            { title: "Visualization", desc: "Interactive charts & plots" },
          ].map((item) => (
            <div key={item.title} className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs font-bold text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
