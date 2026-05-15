import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";
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
  LayoutDashboard,
  Bot,
  Newspaper,
} from "lucide-react";
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
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend,
  ComposedChart,
} from "recharts";
import { reportApi } from "@/services/api";

function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}

const COLORS = [
  "#f97316",
  "#fb923c",
  "#fdba74",
  "#fed7aa",
  "#4263eb",
  "#5c7cfa",
  "#10b981",
  "#34d399",
  "#a78bfa",
];

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard!"));
}

function PortfolioPieChart({ data }: { data: Record<string, number> }) {
  if (!data || Object.keys(data).length === 0) return null;
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value: Number((value * 100).toFixed(2)),
  }));
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Portfolio Allocation</h3>
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
            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(1)}%`}
            labelLine
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: any) => [typeof v === "number" ? `${v.toFixed(2)}%` : String(v), "Weight"]}
            contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }}
          />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricsBarChart({ metrics }: { metrics: Record<string, unknown> }) {
  const portfolio = metrics?.portfolio as Record<string, unknown> | undefined;
  if (!portfolio || typeof portfolio !== "object") return null;

  const entries = [
    { label: "Ann. Return", value: portfolio?.annualized_return },
    { label: "Volatility", value: portfolio?.annualized_volatility },
    { label: "Sharpe", value: portfolio?.sharpe_ratio },
    { label: "Max Drawdown", value: portfolio?.max_drawdown },
    { label: "Exp. Return", value: portfolio?.expected_return_capm },
  ].filter((e) => e.value !== undefined && e.value !== null);

  if (entries.length === 0) return null;

  const chartData = entries.map((e) => ({
    name: e.label,
    value: typeof e.value === "number" ? e.value : parseFloat(String(e.value)),
  }));

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-info" />
        <h3 className="text-sm font-bold text-foreground">Portfolio Metrics</h3>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip
            formatter={(v) => [typeof v === "number" ? v.toFixed(2) : String(v), ""]}
            contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }}
          />
          <Bar dataKey="value" fill="#f97316" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Biểu đồ phân tích rủi ro
function RiskAnalysisChart({ metrics }: { metrics: Record<string, unknown> }) {
  const portfolio = metrics?.portfolio as Record<string, unknown> | undefined;
  if (!portfolio || typeof portfolio !== "object") return null;

  const riskData = [
    {
      metric: "Volatility",
      value: Math.abs(Number(portfolio?.annualized_volatility || 0)),
    },
    {
      metric: "Max Drawdown",
      value: Math.abs(Number(portfolio?.max_drawdown || 0)),
    },
    {
      metric: "Beta",
      value: Math.abs(Number(portfolio?.beta || 1)),
    },
  ].filter((e) => e.value !== undefined && e.value !== null);

  if (riskData.length === 0) return null;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <h3 className="text-sm font-bold text-foreground">Risk Analysis</h3>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={riskData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip
            formatter={(v) => [typeof v === "number" ? (v * 100).toFixed(2) + "%" : String(v), ""]}
            contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }}
          />
          <Bar dataKey="value" fill="#ef4444" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Bảng chi tiết metrics
function MetricsDetailTable({ metrics }: { metrics: Record<string, unknown> }) {
  const portfolio = metrics?.portfolio as Record<string, unknown> | undefined;
  if (!portfolio || typeof portfolio !== "object") return null;

  const metricsData = [
    { label: "Annualized Return", value: portfolio?.annualized_return, format: (v: any) => `${(Number(v) * 100).toFixed(2)}%` },
    { label: "Annualized Volatility", value: portfolio?.annualized_volatility, format: (v: any) => `${(Number(v) * 100).toFixed(2)}%` },
    { label: "Sharpe Ratio", value: portfolio?.sharpe_ratio, format: (v: any) => Number(v).toFixed(3) },
    { label: "Max Drawdown", value: portfolio?.max_drawdown, format: (v: any) => `${(Number(v) * 100).toFixed(2)}%` },
    { label: "Expected Return (CAPM)", value: portfolio?.expected_return_capm, format: (v: any) => `${(Number(v) * 100).toFixed(2)}%` },
    { label: "Beta", value: portfolio?.beta, format: (v: any) => Number(v).toFixed(3) },
    { label: "Alpha", value: portfolio?.alpha, format: (v: any) => Number(v).toFixed(3) },
  ].filter((e) => e.value !== undefined && e.value !== null);

  if (metricsData.length === 0) return null;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Performance Metrics</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-muted-foreground font-semibold">Metric</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-semibold">Value</th>
            </tr>
          </thead>
          <tbody>
            {metricsData.map((row, i) => (
              <tr key={i} className={cn(i % 2 === 0 ? "bg-muted/30" : "")}>
                <td className="py-2 px-3 text-muted-foreground">{row.label}</td>
                <td className="py-2 px-3 text-foreground font-semibold text-right">{row.format(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Biểu đồ so sánh allocation
function AllocationComparisonChart({ data }: { data: Record<string, number> }) {
  if (!data || Object.keys(data).length === 0) return null;

  const chartData = Object.entries(data)
    .sort(([, a], [, b]) => (Number(b) || 0) - (Number(a) || 0))
    .slice(0, 10) // Top 10
    .map(([name, value]) => ({
      name,
      percentage: Number((value * 100).toFixed(2)),
    }));

  if (chartData.length === 0) return null;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="w-4 h-4 text-success" />
        <h3 className="text-sm font-bold text-foreground">Top 10 Holdings</h3>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={75} />
          <Tooltip
            formatter={(v: any) => [typeof v === "number" ? `${v.toFixed(2)}%` : String(v), "Weight"]}
            contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }}
          />
          <Bar dataKey="percentage" fill="#10b981" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Section phân tích chi tiết
function DetailedAnalysisSection({ data }: { data: any }) {
  if (!data) return null;

  const portfolio = data.metrics?.portfolio as Record<string, unknown> | undefined;
  if (!portfolio) return null;

  const returnScore = Math.min(Number(portfolio?.annualized_return || 0) * 100, 100);
  const riskScore = Math.max(100 - Number(portfolio?.annualized_volatility || 0) * 100, 0);
  const sharpeScore = Math.min(Number(portfolio?.sharpe_ratio || 0) * 20, 100);

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Analysis Summary</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-muted-foreground">Return Score</span>
            <span className="text-sm font-bold text-primary">{returnScore.toFixed(0)}/100</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${returnScore}%` }}
            />
          </div>
        </div>
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-muted-foreground">Risk Score</span>
            <span className="text-sm font-bold text-warning">{riskScore.toFixed(0)}/100</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="h-full rounded-full bg-warning transition-all duration-700"
              style={{ width: `${riskScore}%` }}
            />
          </div>
        </div>
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-muted-foreground">Sharpe Score</span>
            <span className="text-sm font-bold text-success">{sharpeScore.toFixed(0)}/100</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="h-full rounded-full bg-success transition-all duration-700"
              style={{ width: `${sharpeScore}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function VisualizationEmbed({ url, runId }: { url: string | null | undefined; runId: string }) {
  if (!url) return null;
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <LayoutDashboard className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Interactive Dashboard</h3>
      </div>
      <div className="rounded-xl overflow-hidden border border-border">
        <iframe
          key={runId}
          src={url}
          title="Portfolio Visualization"
          className="w-full"
          style={{ height: "600px", border: "none" }}
          loading="lazy"
        />
      </div>
    </div>
  );
}

function LLMChatMessage({ commentary }: { commentary: string | null | undefined }) {
  if (!commentary) return null;
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">AI Advisor Response</h3>
      </div>
      <div
        className={cn(
          "prose prose-sm max-w-none",
          "prose-p:text-muted-foreground prose-p:leading-relaxed",
          "prose-strong:text-foreground prose-strong:font-semibold",
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
          "prose-blockquote:border-l-primary/30 prose-blockquote:text-muted-foreground",
          "prose-li:text-muted-foreground"
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{commentary}</ReactMarkdown>
      </div>
    </div>
  );
}

function NewsSection({ news }: { news: string | null | undefined }) {
  if (!news || news === "N/A" || news.startsWith("Failed") || news === "N/A (Tool not configured)")
    return null;
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Market News</h3>
      </div>
      <div className="space-y-3">
        {news
          .split("\n")
          .filter(Boolean)
          .map((item, i) => {
            const clean = item.replace(/^[-*]\s*/, "").trim();
            if (!clean) return null;
            return (
              <div key={i} className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-2 shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">{clean}</p>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function ValidationBadge({ result }: { result?: { status?: string; errors?: string[] } }) {
  if (!result) return null;
  const { status, errors } = result;
  const isPass = status?.toLowerCase() === "pass";
  const isWarn = status?.toLowerCase() === "hold";

  return (
    <div
      className={cn(
        "card p-5",
        isPass && "bg-success/5 border-success/20",
        isWarn && "bg-warning/5 border-warning/20",
        !isPass && !isWarn && "bg-muted border-border"
      )}
    >
      <div className="flex items-center gap-3 mb-2">
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
          Compliance: {status?.toUpperCase() ?? "UNKNOWN"}
        </span>
      </div>
      {errors && errors.length > 0 && (
        <ul className="mt-2 space-y-1">
          {errors.map((err, i) => (
            <li
              key={i}
              className={cn(
                "text-xs rounded-lg px-3 py-1.5",
                isPass ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              )}
            >
              {err}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none",
        "prose-headings:text-foreground prose-headings:font-bold",
        "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
        "prose-p:text-muted-foreground prose-p:leading-relaxed",
        "prose-strong:text-foreground prose-strong:font-semibold",
        "prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs",
        "prose-pre:bg-muted prose-pre:rounded-xl",
        "prose-table:text-xs",
        "prose-th:bg-muted/50 prose-th:text-foreground prose-th:font-semibold",
        "prose-td:text-muted-foreground",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-hr:border-border",
        "prose-blockquote:border-l-primary/30 prose-blockquote:text-muted-foreground"
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export default function Report() {
  const { runId } = useParams<{ runId: string }>();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["report", runId],
    queryFn: () => reportApi.get(runId!),
    enabled: !!runId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
          <FileText className="w-6 h-6 text-white animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-foreground font-semibold">Loading report...</p>
          <p className="text-muted-foreground text-sm mt-1 font-mono">{runId}</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-md mx-auto card p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-danger" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">Failed to load report</h2>
        <p className="text-muted-foreground text-sm mb-4">
          {(error as Error)?.message}
        </p>
        <Link to="/analysis" className="btn-primary">
          Run new analysis
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="animate-slide-up">
        <Link
          to="/history"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to History
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground tracking-tight">Analysis Report</h1>
              <span className={cn("badge", data.status === "completed" ? "badge-success" : "badge-warning")}>
                {data.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{data.run_id}</p>
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
        <div className="lg:col-span-2 space-y-5">
          {data.proposed_portfolio && Object.keys(data.proposed_portfolio).length > 0 && (
            <div className="animate-slide-up" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
              <PortfolioPieChart data={data.proposed_portfolio} />
            </div>
          )}

          {data.metrics && (
            <div className="animate-slide-up" style={{ animationDelay: "150ms", animationFillMode: "both" }}>
              <MetricsBarChart metrics={data.metrics} />
            </div>
          )}

          {data.market_news && (
            <div className="animate-slide-up" style={{ animationDelay: "230ms", animationFillMode: "both" }}>
              <NewsSection news={data.market_news} />
            </div>
          )}

          {data.llm_commentary && (
            <div className="animate-slide-up" style={{ animationDelay: "260ms", animationFillMode: "both" }}>
              <LLMChatMessage commentary={data.llm_commentary} />
            </div>
          )}

          {data.visualization_url && (
            <div className="animate-slide-up" style={{ animationDelay: "250ms", animationFillMode: "both" }}>
              <VisualizationEmbed url={data.visualization_url} runId={data.run_id} />
            </div>
          )}

          {/* Detailed Analysis Section */}
          <div className="space-y-5 animate-slide-up" style={{ animationDelay: "280ms", animationFillMode: "both" }}>
            <DetailedAnalysisSection data={data} />
          </div>

          {data.metrics && (
            <div className="animate-slide-up" style={{ animationDelay: "300ms", animationFillMode: "both" }}>
              <MetricsDetailTable metrics={data.metrics} />
            </div>
          )}

          {data.metrics && (
            <div className="animate-slide-up" style={{ animationDelay: "320ms", animationFillMode: "both" }}>
              <RiskAnalysisChart metrics={data.metrics} />
            </div>
          )}

          {data.proposed_portfolio && Object.keys(data.proposed_portfolio).length > 0 && (
            <div className="animate-slide-up" style={{ animationDelay: "340ms", animationFillMode: "both" }}>
              <AllocationComparisonChart data={data.proposed_portfolio} />
            </div>
          )}

          <div className="card p-6 animate-slide-up" style={{ animationDelay: "380ms", animationFillMode: "both" }}>
            <div className="flex items-center gap-2 mb-5">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Detailed Report</h2>
              <span className="text-xs text-muted-foreground ml-auto">Analysis Details & Recommendations</span>
            </div>
            <MarkdownContent content={data.report} />
          </div>
        </div>

        <div className="space-y-5">
          {data.user_profile && Object.keys(data.user_profile).length > 0 && (
            <div className="card p-5 animate-slide-up" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> User Profile
              </h3>
              <div className="space-y-3">
                {Object.entries(data.user_profile).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-start gap-2">
                    <span className="text-xs text-muted-foreground font-medium capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-foreground font-semibold text-right">
                      {Array.isArray(val) ? (val as string[]).slice(0, 5).join(", ") : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="animate-slide-up" style={{ animationDelay: "150ms", animationFillMode: "both" }}>
            <ValidationBadge result={data.validation_result} />
          </div>

          {data.proposed_portfolio && Object.keys(data.proposed_portfolio).length > 0 && (
            <div className="card p-5 animate-slide-up" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
              <h3 className="text-sm font-bold text-foreground mb-4">Allocation</h3>
              <div className="space-y-2">
                {Object.entries(data.proposed_portfolio)
                  .sort(([, a], [, b]) => (Number(b) || 0) - (Number(a) || 0))
                  .map(([ticker, weight]) => (
                    <div key={ticker} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-foreground/80 w-16 truncate">
                        {ticker}
                      </span>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700"
                          style={{ width: `${Math.max(Number(weight) * 100, 2)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium w-12 text-right">
                        {(Number(weight) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="space-y-2 animate-slide-up" style={{ animationDelay: "250ms", animationFillMode: "both" }}>
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
  );
}
