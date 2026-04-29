/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { mockPortfolios } from '../mock/mockPortfolios';

const PortfolioContext = createContext(null);

function getInitialActiveId(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list.find((p) => p.isDefault)?.id ?? list[0].id;
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function calculatePortfolioPnlVnd(assets) {
  if (!Array.isArray(assets) || assets.length === 0) return 0;
  return assets.reduce((acc, a) => {
    const qty = toFiniteNumber(a?.quantity) ?? 0;
    const avg = toFiniteNumber(a?.avgPrice) ?? 0;
    const cur = toFiniteNumber(a?.currentPrice) ?? 0;
    return acc + qty * (cur - avg);
  }, 0);
}

function ensurePortfolioMetrics(portfolio) {
  if (!portfolio) return portfolio;

  const hasPnl = toFiniteNumber(portfolio.pnl) !== null;
  const hasSharpe = toFiniteNumber(portfolio.sharpe) !== null;
  const hasBeta = toFiniteNumber(portfolio.beta) !== null;

  if (hasPnl && hasSharpe && hasBeta) return portfolio;

  return {
    ...portfolio,
    pnl: hasPnl ? Number(portfolio.pnl) : calculatePortfolioPnlVnd(portfolio.assets),
    sharpe: hasSharpe ? Number(portfolio.sharpe) : 1.0,
    beta: hasBeta ? Number(portfolio.beta) : 1.0,
  };
}

export function PortfolioProvider({ children, initialPortfolios = mockPortfolios }) {
  const [portfolios, setPortfolios] = useState(() => initialPortfolios.map(ensurePortfolioMetrics));
  const [activeId, setActiveId] = useState(() => getInitialActiveId(initialPortfolios));

  const normalizedPortfolios = useMemo(() => portfolios.map(ensurePortfolioMetrics), [portfolios]);

  const activePortfolio = useMemo(() => {
    if (!normalizedPortfolios.length) return null;
    return normalizedPortfolios.find((p) => p.id === activeId) ?? normalizedPortfolios[0];
  }, [normalizedPortfolios, activeId]);

  const setActivePortfolio = useCallback((id) => {
    setActiveId(id);
  }, []);

  const addPortfolio = useCallback((portfolio) => {
    if (!portfolio?.id) return;

    setPortfolios((prev) => {
      const normalized = ensurePortfolioMetrics(portfolio);
      const exists = prev.some((p) => p.id === normalized.id);

      if (exists) {
        return prev.map((p) => (p.id === normalized.id ? normalized : p));
      }

      return [...prev, normalized];
    });
  }, []);

  const deleteActivePortfolio = useCallback(() => {
    setPortfolios((prev) => {
      if (!prev.length) return prev;

      const currentIndex = prev.findIndex((p) => p.id === activeId);
      if (currentIndex === -1) return prev;

      const next = prev.filter((p) => p.id !== activeId);

      const fallback =
        next[currentIndex] ??
        next[currentIndex - 1] ??
        next.find((p) => p.isDefault) ??
        next[0] ??
        null;

      setActiveId(fallback?.id ?? null);
      return next;
    });
  }, [activeId]);

  const value = useMemo(
    () => ({
      portfolios: normalizedPortfolios,
      activePortfolio,
      addPortfolio,
      setActivePortfolio,
      deleteActivePortfolio,
    }),
    [normalizedPortfolios, activePortfolio, addPortfolio, setActivePortfolio, deleteActivePortfolio],
  );

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) {
    throw new Error('usePortfolio phải được dùng bên trong PortfolioProvider');
  }
  return ctx;
}
