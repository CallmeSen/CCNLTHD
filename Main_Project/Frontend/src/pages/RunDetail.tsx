import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Shield,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { reportApi } from "@/services/api";
import { MetricsGrid } from "@/components/chat/MetricsCard";

function cn(...classes: ClassValue[]) {
  return twMerge(clsx(...classes));
}

export default function RunDetail() {
  const { runId } = useParams<{ runId: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["report", runId],
    queryFn: () => reportApi.get(runId!),
    enabled: !!runId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-white animate-pulse" />
        </div>
        <p className="text-foreground font-semibold">Loading run details...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-md mx-auto card p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
        <h2 className="text-lg font-bold text-foreground mb-2">Run not found</h2>
        <Link to="/" className="btn-primary mt-4">
          Back to Home
        </Link>
      </div>
    );
  }

  const validation = data.validation_result;
  const isPass = validation?.status?.toLowerCase() === "pass";
  const isWarn = validation?.status?.toLowerCase() === "hold";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="animate-slide-up">
        <Link
          to="/history"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground tracking-tight">Run Details</h1>
          <span
            className={cn("badge", data.status === "completed" ? "badge-success" : "badge-warning")}
          >
            {data.status}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 font-mono">{data.run_id}</p>
      </div>

      {/* Metrics */}
      {data.metrics && (
        <div className="animate-slide-up" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
          <MetricsGrid metrics={data.metrics as Record<string, number | string>} />
        </div>
      )}

      {/* Portfolio allocation */}
      {data.proposed_portfolio && Object.keys(data.proposed_portfolio).length > 0 && (
        <div
          className="card p-6 animate-slide-up"
          style={{ animationDelay: "150ms", animationFillMode: "both" }}
        >
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Proposed Portfolio
          </h2>
          <div className="space-y-3">
            {Object.entries(data.proposed_portfolio)
              .sort(([, a], [, b]) => Number(b) - Number(a))
              .map(([ticker, weight]) => (
                <div key={ticker} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground/80 w-20 truncate font-mono">
                    {ticker}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(Number(weight) * 100, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium w-14 text-right">
                    {(Number(weight) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Compliance */}
      <div
        className={cn(
          "card p-5 animate-slide-up",
          isPass && "bg-success/5 border-success/20",
          isWarn && "bg-warning/5 border-warning/20",
          !isPass && !isWarn && "bg-muted border-border"
        )}
        style={{ animationDelay: "200ms", animationFillMode: "both" }}
      >
        <div className="flex items-center gap-3">
          {isPass && <CheckCircle2 className="w-5 h-5 text-success" />}
          {isWarn && <AlertTriangle className="w-5 h-5 text-warning" />}
          {!isPass && !isWarn && <Shield className="w-5 h-5 text-muted-foreground" />}
          <span
            className={cn(
              "text-sm font-bold",
              isPass && "text-success",
              isWarn && "text-warning",
              !isPass && !isWarn && "text-foreground"
            )}
          >
            Compliance: {validation?.status?.toUpperCase() ?? "UNKNOWN"}
          </span>
        </div>
        {validation?.errors && validation.errors.length > 0 && (
          <ul className="mt-3 space-y-1">
            {validation.errors.map((err, i) => (
              <li
                key={i}
                className="text-xs rounded-lg px-3 py-1.5 bg-warning/10 text-warning"
              >
                {err}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Full report */}
      <div
        className="card p-6 animate-slide-up"
        style={{ animationDelay: "250ms", animationFillMode: "both" }}
      >
        <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Full Report
        </h2>
        <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {data.report}
        </div>
      </div>
    </div>
  );
}
