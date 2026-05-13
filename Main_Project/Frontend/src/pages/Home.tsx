import { useNavigate } from "react-router-dom";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  TrendingUp,
  Shield,
  Bot,
  BarChart3,
  Network,
  Grid3x3,
  ArrowRight,
} from "lucide-react";

function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}

const features = [
  {
    icon: Bot,
    title: "Deep Research",
    description: "72 specialist skills with persistent cross-session memory and self-evolving workflows",
    color: "from-primary/20 to-primary/5",
    borderColor: "border-primary/20",
    accent: "text-primary",
    badge: "72 Skills",
    badgeColor: "bg-primary/10 text-primary",
  },
  {
    icon: Network,
    title: "Swarm Intelligence",
    description: "29 agent team presets with DAG-based orchestration and real-time streaming dashboard",
    color: "from-info/20 to-info/5",
    borderColor: "border-info/20",
    accent: "text-info",
    badge: "29 Teams",
    badgeColor: "bg-info/10 text-info",
  },
  {
    icon: BarChart3,
    title: "Cross-Market Backtest",
    description: "A-shares, HK/US equities, crypto, futures & forex with statistical validation",
    color: "from-success/20 to-success/5",
    borderColor: "border-success/20",
    accent: "text-success",
    badge: "7 Engines",
    badgeColor: "bg-success/10 text-success",
  },
  {
    icon: Shield,
    title: "Compliance Guard",
    description: "Regulatory rule engine with YAML-based policies and automated compliance checks",
    color: "from-warning/20 to-warning/5",
    borderColor: "border-warning/20",
    accent: "text-warning",
    badge: "Active",
    badgeColor: "bg-warning/10 text-warning",
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Hero */}
      <div className="text-center pt-8 pb-4 animate-slide-up">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Multi-Agent Finance Platform
        </div>

        <h1 className="text-4xl font-bold text-foreground tracking-tight mb-3">
          Financial Advisory
          <span className="text-primary"> Agent</span>
        </h1>
        <p className="text-muted-foreground text-base max-w-xl mx-auto mb-8 leading-relaxed">
          AI-powered multi-agent finance workspace that turns natural language requests
          into executable trading strategies, research insights, and portfolio analysis.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate("/agent")}
            className="btn-primary px-6 py-3 text-sm"
          >
            Start Chatting <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate("/analysis")}
            className="btn-secondary px-6 py-3 text-sm"
          >
            New Analysis
          </button>
        </div>
      </div>

      {/* Stats */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-slide-up"
        style={{ animationDelay: "100ms", animationFillMode: "both" }}
      >
        {[
          { label: "Agent Pipeline", value: "9 Agents", sub: "Active" },
          { label: "Finance Skills", value: "72 Skills", sub: "Organized" },
          { label: "Agent Teams", value: "29 Presets", sub: "Ready" },
          { label: "Compliance", value: "Active", sub: "Enabled" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Feature cards */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up"
        style={{ animationDelay: "200ms", animationFillMode: "both" }}
      >
        {features.map((f) => (
          <div
            key={f.title}
            className={cn(
              "card p-6 bg-gradient-to-br card-hover",
              f.color,
              f.borderColor,
              "border"
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  f.badgeColor
                )}
              >
                <f.icon className={cn("w-5 h-5", f.accent)} />
              </div>
              <span className={cn("text-xs font-semibold px-2 py-1 rounded-lg", f.badgeColor)}>
                {f.badge}
              </span>
            </div>
            <h3 className="text-base font-bold text-foreground mb-1.5">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>

      {/* Agent pipeline preview */}
      <div
        className="card p-6 animate-slide-up"
        style={{ animationDelay: "300ms", animationFillMode: "both" }}
      >
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Network className="w-5 h-5 text-primary" />
          Multi-Agent Pipeline
        </h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { name: "Intake", color: "bg-blue-500" },
            { name: "Portfolio", color: "bg-indigo-500" },
            { name: "Market", color: "bg-violet-500" },
            { name: "Metrics", color: "bg-purple-500" },
            { name: "Risk", color: "bg-pink-500" },
            { name: "Strategy", color: "bg-rose-500" },
            { name: "Compliance", color: "bg-emerald-500" },
            { name: "Report", color: "bg-amber-500" },
            { name: "Critic", color: "bg-orange-500" },
          ].map((step, i, arr) => (
            <div key={step.name} className="flex items-center gap-2 flex-shrink-0">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    step.color
                  )}
                >
                  <span className="text-white text-xs font-bold">{i + 1}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {step.name}
                </span>
              </div>
              {i < arr.length - 1 && (
                <svg
                  className="w-5 h-3 text-border flex-shrink-0"
                  viewBox="0 0 20 12"
                  fill="none"
                >
                  <path
                    d="M0 6h16M12 1l4 5-4 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up"
        style={{ animationDelay: "400ms", animationFillMode: "both" }}
      >
        {[
          {
            icon: TrendingUp,
            title: "New Analysis",
            desc: "Submit a portfolio request",
            path: "/analysis",
            color: "bg-primary/10 text-primary",
          },
          {
            icon: Grid3x3,
            title: "Correlation",
            desc: "View correlation heatmap",
            path: "/correlation",
            color: "bg-info/10 text-info",
          },
          {
            icon: BarChart3,
            title: "Compare",
            desc: "Compare strategies",
            path: "/compare",
            color: "bg-success/10 text-success",
          },
        ].map(({ icon: Icon, title, desc, path, color }) => (
          <button
            key={title}
            onClick={() => navigate(path)}
            className="card p-5 text-left card-hover flex items-center gap-4"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground/40 ml-auto" />
          </button>
        ))}
      </div>
    </div>
  );
}
