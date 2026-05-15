import React from "react";

const SAMPLE_PROMPTS = [
  "Backtest a 20/50-day moving average crossover on AAPL for the past year",
  "Analyze my portfolio for retirement planning: moderate risk, 10-year horizon",
  "Research NVDA earnings trend and option flow for next quarter",
  "Run a momentum + value multi-factor strategy on S&P 500",
];

export function ChatFooter({ onSelectPrompt }: { onSelectPrompt: (p: string) => void }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick prompts</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            className="text-sm text-left px-3 py-2 rounded-lg border border-border bg-muted/20 hover:bg-muted transition-colors"
            onClick={() => onSelectPrompt(p)}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ChatFooter;
