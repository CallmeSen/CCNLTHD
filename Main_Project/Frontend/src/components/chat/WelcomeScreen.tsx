import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Bot, Zap, BarChart3, Shield } from "lucide-react";
import { Link } from "react-router-dom";

function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}

const SAMPLE_PROMPTS = [
  "Backtest a 20/50-day moving average crossover on AAPL for the past year",
  "Analyze my portfolio for retirement planning: moderate risk, 10-year horizon",
  "Research NVDA earnings trend and option flow for next quarter",
  "Run a momentum + value multi-factor strategy on S&P 500",
];

export function WelcomeScreen({ onSelectPrompt }: { onSelectPrompt: (p: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto text-center px-4">
      {/* Logo */}
      <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-6 glow-primary">
        <Bot className="w-8 h-8 text-white" />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
        Financial Advisory Agent
      </h1>
      <p className="text-muted-foreground text-sm mb-8 max-w-md">
        Describe your investment goals and let the multi-agent pipeline analyze your portfolio.
        Ask anything about stocks, portfolios, strategies, or market research.
      </p>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mb-8">
        {[
          {
            icon: Zap,
            title: "Deep Research",
            desc: "72 specialist finance skills with cross-session memory",
            color: "bg-primary/10 text-primary",
          },
          {
            icon: BarChart3,
            title: "Swarm Intelligence",
            desc: "29 agent team presets with real-time streaming",
            color: "bg-info/10 text-info",
          },
          {
            icon: Shield,
            title: "Compliance Guard",
            desc: "Regulatory rule engine with YAML-based policies",
            color: "bg-success/10 text-success",
          },
          {
            icon: Bot,
            title: "Multi-Agent",
            desc: "9-agent LangGraph workflow in sequence",
            color: "bg-warning/10 text-warning",
          },
        ].map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="card p-4 text-left card-hover">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", color)}>
              <Icon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-0.5">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Sample prompts */}
      <div className="w-full text-left">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Try these examples
        </p>
        <div className="space-y-2">
          {SAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onSelectPrompt(prompt)}
              className="w-full text-left px-4 py-3 rounded-xl bg-muted/50 hover:bg-muted border border-border hover:border-muted-foreground/30 transition-all duration-200 text-sm text-muted-foreground hover:text-foreground"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex items-center gap-4 mt-6">
        <Link
          to="/analysis"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          New Analysis
        </Link>
        <span className="text-muted-foreground/30">|</span>
        <Link
          to="/history"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View History
        </Link>
      </div>
    </div>
  );
}
