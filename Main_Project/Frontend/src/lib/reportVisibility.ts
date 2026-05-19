export function normalizeIntent(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function getProposedPortfolio(value: unknown): Record<string, number> | null {
  const record = asRecord(value);
  if (!record || Object.keys(record).length === 0) return null;

  const numericEntries = Object.entries(record)
    .map(([symbol, weight]) => [symbol, Number(weight)] as const)
    .filter(([, weight]) => Number.isFinite(weight));

  return numericEntries.length > 0 ? Object.fromEntries(numericEntries) : null;
}

export function shouldShowPortfolioReport(_intent: unknown, proposedPortfolio: unknown, explicit?: unknown) {
  if (explicit === false) return false;

  const portfolio = getProposedPortfolio(proposedPortfolio);
  return Boolean(portfolio && Object.keys(portfolio).length > 0);
}
