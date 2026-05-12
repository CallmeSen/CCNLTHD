import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiClient } from '../../../services/apiClient';

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <path d="M6 6l12 12" strokeLinecap="round" />
      <path d="M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function LightningIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <path
        d="M13 2L3 14h7l-1 8 12-16h-7l1-4z"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatCurrencyVnd(value) {
  return Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatShortDate(value) {
  return value;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const point = payload[0];

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-900">{formatCurrencyVnd(point.value)}</div>
    </div>
  );
}

export default function AssetDetailModal({ isOpen, onClose, asset }) {
  const ticker = asset?.ticker ?? 'FPT';
  const companyName = asset?.companyName ?? `Công ty CP ${ticker}`;
  const currentPrice = Number(asset?.currentPrice ?? 0);

  const [priceHistory, setPriceHistory] = useState([]);
  const [todayChangePct, setTodayChangePct] = useState(Number(asset?.changePct ?? 0));
  const [signals, setSignals] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);

  // Fetch real 30-day price history whenever the modal opens for a ticker
  useEffect(() => {
    if (!isOpen || !ticker) return;

    let cancelled = false;
    setLoadingChart(true);
    setPriceHistory([]);
    setSignals([]);

    apiClient
      .get(`/market/stocks/${ticker}/price/daily?limit=30`)
      .then((res) => {
        if (cancelled || !Array.isArray(res.data) || res.data.length === 0) return;

        // API returns newest-first — reverse to chronological
        const bars = [...res.data].reverse();

        const mapped = bars.map((r) => {
          const dateStr = r.timestamp.split('T')[0]; // "2026-04-25"
          const [, mm, dd] = dateStr.split('-');
          return {
            date: `${dd}/${mm}`,
            price: Math.round(Number(r.close) * 1000),
            open: Math.round(Number(r.open ?? r.close) * 1000),
          };
        });

        setPriceHistory(mapped);

        // Today's change from last bar
        const last = mapped[mapped.length - 1];
        if (last && last.open > 0) {
          const pct = ((last.price - last.open) / last.open) * 100;
          setTodayChangePct(Number(pct.toFixed(2)));
        }

        // Compute analysis signals from price data
        const computedSignals = [];
        const prices = mapped.map((p) => p.price);

        if (prices.length >= 7) {
          const last7 = prices.slice(-7);
          const ret7 = ((last7[last7.length - 1] - last7[0]) / last7[0]) * 100;
          computedSignals.push({
            title: `Xu hướng ngắn hạn (7 phiên): ${ret7 >= 0 ? '+' : ''}${ret7.toFixed(2)}%`,
            detail: ret7 >= 2 ? 'Đà tăng mạnh, dòng tiền tích cực' : ret7 <= -2 ? 'Áp lực bán tăng, cần theo dõi' : 'Giao dịch ổn định, chưa có xu hướng rõ',
            sentiment: ret7 >= 2 ? 'positive' : ret7 <= -2 ? 'negative' : 'neutral',
          });
        }

        if (prices.length >= 20) {
          const last20 = prices.slice(-20);
          const ret20 = ((last20[last20.length - 1] - last20[0]) / last20[0]) * 100;
          computedSignals.push({
            title: `Xu hướng trung hạn (20 phiên): ${ret20 >= 0 ? '+' : ''}${ret20.toFixed(2)}%`,
            detail: ret20 >= 5 ? 'Cổ phiếu đang trong uptrend, vượt MA20' : ret20 <= -5 ? 'Cổ phiếu dưới MA20, tâm lý thận trọng' : 'Đang tích lũy quanh vùng MA20',
            sentiment: ret20 >= 5 ? 'positive' : ret20 <= -5 ? 'negative' : 'neutral',
          });
        }

        if (prices.length >= 5) {
          // Simple volatility: std dev of daily returns (last 14 bars)
          const slice = prices.slice(-14);
          const dailyRets = slice.slice(1).map((p, i) => (p - slice[i]) / slice[i]);
          const mean = dailyRets.reduce((s, r) => s + r, 0) / dailyRets.length;
          const variance = dailyRets.reduce((s, r) => s + (r - mean) ** 2, 0) / dailyRets.length;
          const vol = Math.sqrt(variance) * 100;
          computedSignals.push({
            title: `Biến động giá (14 phiên): ${vol.toFixed(2)}% / phiên`,
            detail: vol > 2 ? 'Biến động cao, rủi ro ngắn hạn lớn' : vol > 1 ? 'Biến động trung bình, phù hợp giao dịch ngắn hạn' : 'Biến động thấp, phù hợp nắm giữ trung dài hạn',
            sentiment: vol > 2 ? 'negative' : vol < 1 ? 'positive' : 'neutral',
          });
        }

        setSignals(computedSignals);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingChart(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, ticker]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const changeColor = todayChangePct >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50';
  const changeLabel = `${todayChangePct >= 0 ? '+' : ''}${todayChangePct.toFixed(2)}%`;

  const sentimentMeta = {
    positive: { label: 'Tích cực', className: 'bg-emerald-50 text-emerald-700' },
    negative: { label: 'Tiêu cực', className: 'bg-red-50 text-red-700' },
    neutral: { label: 'Trung lập', className: 'bg-gray-100 text-gray-700' },
  };

  // Dynamic Y-axis domain based on real price data
  const prices = priceHistory.map((p) => p.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const yPad = Math.round((maxPrice - minPrice) * 0.1) || 1000;
  const yDomain = [minPrice - yPad, maxPrice + yPad];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết tài sản"
        className="mx-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">{ticker}</h2>
            <p className="mt-1 text-sm font-medium text-gray-900">{companyName}</p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-gray-900">{formatCurrencyVnd(currentPrice)}</div>
            <div className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ${changeColor}`}>{changeLabel}</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-grid place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Đóng"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 text-sm font-extrabold text-black">Lịch sử giá gần đây (30 phiên)</div>
            <div className="h-72 w-full">
              {loadingChart ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">Đang tải dữ liệu...</div>
              ) : priceHistory.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">Chưa có dữ liệu giá</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceHistory} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: '#E5E7EB' }}
                      minTickGap={16}
                    />
                    <YAxis
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={72}
                      domain={yDomain}
                      tickFormatter={(value) => Intl.NumberFormat('vi-VN').format(value)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 text-sm font-extrabold text-black">Phân tích xu hướng giá</div>
            {signals.length === 0 ? (
              <div className="text-sm text-gray-400">{loadingChart ? 'Đang phân tích...' : 'Chưa đủ dữ liệu để phân tích'}</div>
            ) : (
              <ul className="space-y-3">
                {signals.map((item, idx) => {
                  const meta = sentimentMeta[item.sentiment] ?? sentimentMeta.neutral;
                  return (
                    <li key={idx} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                          <div className="mt-1 text-xs text-gray-500">{item.detail}</div>
                        </div>
                        <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
                          {meta.label}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="sticky bottom-0 border-t border-gray-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={() => console.log(`Chuyển hướng sang Agent Chat với ngữ cảnh mã ${ticker}`)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <LightningIcon className="h-5 w-5" />
            Hỏi AI về mã này
          </button>
        </div>
      </div>
    </div>
  );
}
