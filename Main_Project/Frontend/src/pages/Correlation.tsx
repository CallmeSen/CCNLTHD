import { Link } from "react-router-dom";
import { Grid3x3, TrendingUp } from "lucide-react";

export default function Correlation() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Grid3x3 className="w-6 h-6" />
          Correlation Heatmap
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Rolling return correlations across portfolio assets
        </p>
      </div>

      <div
        className="card p-12 flex flex-col items-center justify-center gap-4 animate-slide-up"
        style={{ animationDelay: "100ms", animationFillMode: "both" }}
      >
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Grid3x3 className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-foreground mb-1">No correlation data</h2>
          <p className="text-muted-foreground text-sm">
            Run a portfolio analysis to generate correlation data for visualization.
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
