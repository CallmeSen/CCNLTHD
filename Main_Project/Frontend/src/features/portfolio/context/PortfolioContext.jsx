/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getMyPortfolios,
  getPortfolioAnalytics,
  createPortfolio as apiCreatePortfolio,
  addStockToPortfolio,
} from '../../../services/portfolioApi';

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

/** Map a PortfolioDto from the backend into the frontend portfolio shape */
function mapApiPortfolio(dto) {
  const holdings = dto.holdings ?? [];
  const assets = (dto.tickers ?? []).map((ticker) => {
    const h = holdings.find((x) => x.ticker === ticker);
    return {
      ticker,
      quantity: h?.quantity ?? 0,
      avgPrice: h?.avgPrice ?? 0,
      currentPrice: h?.avgPrice ?? 0, // will be refreshed by analytics call
      allocation: dto.tickers.length > 0 ? Math.round(100 / dto.tickers.length) : 0,
      pnl: 0,
    };
  });

  return ensurePortfolioMetrics({
    id: dto.id,
    name: dto.name,
    isDefault: false,
    riskProfile: dto.riskProfile,
    assets,
    pnl: 0,
    sharpe: null,
    beta: null,
  });
}

function betaToRiskProfile(beta) {
  if (beta <= 0.90) return 'CONSERVATIVE';
  if (beta <= 1.10) return 'MODERATE';
  return 'AGGRESSIVE';
}

/**
 * Merge real MPT analytics data returned by the backend into a local portfolio object.
 * Updates pnl, sharpe, beta and per-asset current prices / pnl percentages.
 */
function applyAnalytics(portfolio, analytics) {
  if (!analytics) return portfolio;

  const updatedAssets = (portfolio.assets ?? []).map((a) => {
    const m = (analytics.metricsPerTicker ?? []).find((t) => t.ticker === a.ticker);
    if (!m) return a;
    return {
      ...a,
      currentPrice: m.currentPrice ?? a.currentPrice,
      quantity: m.quantity ?? a.quantity,
      avgPrice: m.avgPrice ?? a.avgPrice,
      allocation: m.weight ?? a.allocation,
      pnl: m.pnlPct ?? a.pnl,
    };
  });

  return ensurePortfolioMetrics({
    ...portfolio,
    pnl: analytics.totalPnlVnd ?? portfolio.pnl,
    sharpe: analytics.sharpeRatio,
    beta: analytics.beta,
    expectedReturn: analytics.expectedReturnAnnualPct,
    volatility: analytics.volatilityAnnualPct,
    rebalanceActions: analytics.rebalanceActions ?? [],
    assets: updatedAssets,
  });
}

export function PortfolioProvider({ children }) {
  const [portfolios, setPortfolios] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load portfolios from the backend on mount, then fetch analytics for each
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getMyPortfolios()
      .then(async (dtos) => {
        if (cancelled) return;
        const mapped = dtos.map(mapApiPortfolio);
        setPortfolios(mapped);
        setActiveId(getInitialActiveId(mapped));

        // Fetch analytics for each portfolio in the background
        for (const dto of dtos) {
          if (cancelled) break;
          try {
            const analytics = await getPortfolioAnalytics(dto.id);
            if (cancelled) break;
            setPortfolios((prev) =>
              prev.map((p) =>
                p.id === dto.id
                  ? applyAnalytics(p, analytics)
                  : p,
              ),
            );
          } catch {
            // analytics not critical — keep existing metrics
          }
        }
      })
      .catch(() => {
        // If API fails keep empty list
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const normalizedPortfolios = useMemo(() => portfolios.map(ensurePortfolioMetrics), [portfolios]);

  const activePortfolio = useMemo(() => {
    if (!normalizedPortfolios.length) return null;
    return normalizedPortfolios.find((p) => p.id === activeId) ?? normalizedPortfolios[0];
  }, [normalizedPortfolios, activeId]);

  const setActivePortfolio = useCallback((id) => {
    setActiveId(id);
  }, []);

  /** Add a portfolio object directly to local state (used internally after API create). */
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

  /**
   * Create a portfolio on the backend (called by PortfolioWizardModal).
   * Persists name/riskProfile + all stock tickers, then updates local state.
   */
  const createPortfolioOnServer = useCallback(async (wizardPortfolio) => {
    const riskProfile = betaToRiskProfile(wizardPortfolio.beta ?? 1.0);

    let apiPortfolio;
    try {
      apiPortfolio = await apiCreatePortfolio({
        name: wizardPortfolio.name,
        description: '',
        riskProfile,
      });
    } catch (err) {
      // If API fails, fall back to local-only portfolio
      console.error('Failed to create portfolio on server', err);
      const local = ensurePortfolioMetrics(wizardPortfolio);
      setPortfolios((prev) => [...prev, local]);
      setActiveId(local.id);
      return;
    }

    // Add each stock ticker (with quantity and avgPrice) to the newly created portfolio
    for (const asset of wizardPortfolio.assets ?? []) {
      try {
        await addStockToPortfolio(apiPortfolio.id, {
          ticker: asset.ticker,
          quantity: asset.quantity ?? 0,
          avgPrice: asset.avgPrice ?? 0,
        });
      } catch {
        console.warn(`Could not add ticker ${asset.ticker} to portfolio`);
      }
    }

    // Build initial local portfolio state from wizard data
    const merged = ensurePortfolioMetrics({
      id: apiPortfolio.id,
      name: apiPortfolio.name,
      riskProfile: apiPortfolio.riskProfile,
      isDefault: false,
      pnl: wizardPortfolio.pnl ?? 0,
      sharpe: wizardPortfolio.sharpe ?? null,
      beta: wizardPortfolio.beta ?? null,
      assets: wizardPortfolio.assets ?? [],
    });

    setPortfolios((prev) => [...prev, merged]);
    setActiveId(merged.id);

    // Fetch real analytics from backend (non-blocking)
    getPortfolioAnalytics(apiPortfolio.id)
      .then((analytics) => {
        setPortfolios((prev) =>
          prev.map((p) => (p.id === apiPortfolio.id ? applyAnalytics(p, analytics) : p)),
        );
      })
      .catch(() => {/* analytics not critical */});
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
      isLoading,
      addPortfolio,
      createPortfolioOnServer,
      setActivePortfolio,
      deleteActivePortfolio,
    }),
    [normalizedPortfolios, activePortfolio, isLoading, addPortfolio, createPortfolioOnServer, setActivePortfolio, deleteActivePortfolio],
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

