import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: number;
  sublabel?: string;
  icon?: React.ReactNode;
}

export function MetricCard({ label, value, delta, sublabel, icon }: MetricCardProps) {
  const isPositive = delta !== undefined && delta > 0;
  const isNegative = delta !== undefined && delta < 0;
  const isNeutral = delta !== undefined && delta === 0;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon && <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-foreground tracking-tight">{value}</span>
        {delta !== undefined && (
          <div
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              isPositive && 'text-success',
              isNegative && 'text-danger',
              isNeutral && 'text-muted-foreground',
            )}
          >
            {isPositive && <TrendingUp className="w-3 h-3" />}
            {isNegative && <TrendingDown className="w-3 h-3" />}
            {isNeutral && <Minus className="w-3 h-3" />}
            <span>
              {isPositive && '+'}
              {delta.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
      {sublabel && <p className="text-[10px] text-muted-foreground/60 mt-1">{sublabel}</p>}
    </div>
  );
}

interface MetricsGridProps {
  metrics: Record<string, number | string>;
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  const entries = Object.entries(metrics).slice(0, 8);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {entries.map(([key, value]) => (
        <MetricCard
          key={key}
          label={key.replace(/_/g, ' ')}
          value={typeof value === 'number' ? value.toFixed(2) : String(value)}
        />
      ))}
    </div>
  );
}
