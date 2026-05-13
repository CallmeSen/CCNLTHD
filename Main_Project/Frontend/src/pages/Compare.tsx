import { Link } from "react-router-dom";
import { GitCompare, TrendingUp, BarChart3 } from "lucide-react";

export default function Compare() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <GitCompare className="w-6 h-6" />
          Strategy Comparison
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Compare multiple portfolio strategies side by side
        </p>
      </div>

      <div
        className="card p-12 flex flex-col items-center justify-center gap-4 animate-slide-up"
        style={{ animationDelay: "100ms", animationFillMode: "both" }}
      >
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-foreground mb-1">No runs to compare</h2>
          <p className="text-muted-foreground text-sm">
            Run at least 2 portfolio analyses to compare strategies side by side.
          </p>
        </div>
        <Link to="/analysis" className="btn-primary">
          <TrendingUp className="w-4 h-4" />
          Run New Analysis
        </Link>
      </div>
    </div>
  );
}
