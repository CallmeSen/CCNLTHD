import { useNavigate } from "react-router-dom";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  LayoutDashboard,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { healthApi, historyApi } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  delay: number;
}) {
  return (
    <div
      className="card p-5 animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {sub && <span className="badge badge-success text-xs">{sub}</span>}
      </div>
      <p className="stat-value">{value}</p>
      <p className="stat-label mt-1">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: healthApi.check,
    refetchInterval: 30_000,
  });

  const { data: history } = useQuery({
    queryKey: ["history"],
    queryFn: historyApi.list,
  });

  const recentAnalyses = history?.slice(0, 5) ?? [];
  const completedCount = history?.filter((h) => h.status === "completed").length ?? 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Financial Advisory Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          AI-powered multi-agent portfolio analysis platform
        </p>
      </div>

      {/* Status Banner */}
      <div
        className={cn(
          "card px-5 py-4 flex items-center gap-4 animate-slide-up",
          health?.status === "healthy" ? "bg-success/5 border-success/20" : "bg-warning/5 border-warning/20"
        )}
        style={{ animationDelay: "100ms", animationFillMode: "both" }}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            health?.status === "healthy" ? "bg-success text-white" : "bg-warning text-white"
          )}
        >
          {health?.status === "healthy" ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1">
          <p
            className={cn(
              "text-sm font-bold",
              health?.status === "healthy" ? "text-success" : "text-warning"
            )}
          >
            API Status:{" "}
            <span className={health?.status === "healthy" ? "text-success" : "text-warning"}>
              {health?.status ?? "Checking..."}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Database: {health?.database ?? "Checking..."} &bull; {health?.timestamp ?? ""}
          </p>
        </div>
        <button
          onClick={() => navigate("/analysis")}
          className="btn-primary text-sm"
        >
          New Analysis <TrendingUp className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          label="Agent Pipeline"
          value="9 Agents"
          sub="Active"
          color="bg-primary"
          delay={150}
        />
        <StatCard
          icon={CheckCircle2}
          label="Compliance"
          value="Active"
          sub="Enabled"
          color="bg-success"
          delay={200}
        />
        <StatCard
          icon={LayoutDashboard}
          label="Reports"
          value={history?.length ?? 0}
          sub="Generated"
          color="bg-info"
          delay={250}
        />
        <StatCard
          icon={TrendingUp}
          label="Completed"
          value={completedCount}
          sub="Success"
          color="bg-success"
          delay={300}
        />
      </div>

      {/* Recent Activity */}
      <div className="animate-slide-up" style={{ animationDelay: "400ms", animationFillMode: "both" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Recent Analyses</h2>
          <button
            onClick={() => navigate("/history")}
            className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
          >
            View all <TrendingUp className="w-3.5 h-3.5" />
          </button>
        </div>
        {recentAnalyses.length === 0 ? (
          <div className="card p-10 flex flex-col items-center justify-center text-center">
            <Clock className="w-12 h-12 text-muted/50 mb-3" />
            <p className="text-muted-foreground font-medium">No analyses yet</p>
            <p className="text-muted-foreground/60 text-sm mt-1">
              Run your first portfolio analysis to see results here
            </p>
            <button onClick={() => navigate("/analysis")} className="btn-primary mt-4 text-sm">
              Start Analysis
            </button>
          </div>
        ) : (
          <div className="card divide-y divide-border">
            {recentAnalyses.map((item) => (
              <button
                key={item.run_id}
                onClick={() => navigate(`/report/${item.run_id}`)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors w-full text-left"
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                    item.status === "completed" ? "bg-success/10" : "bg-warning/10"
                  )}
                >
                  {item.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <Clock className="w-4 h-4 text-warning" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.request}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">{item.run_id}</p>
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-full",
                    item.status === "completed"
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  )}
                >
                  {item.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
