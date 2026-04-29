import { useEffect, useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
  const currentPrice = Number(asset?.currentPrice ?? 105000);
  const changePct = Number(asset?.changePct ?? 2.5);

  const mockNews = useMemo(
    () => [
      {
        title: `${ticker}: Kết quả kinh doanh quý gần nhất vượt kỳ vọng, dòng tiền quay lại nhóm tăng trưởng`,
        time: '2 giờ trước',
        sentiment: 'positive',
      },
      {
        title: `Thị trường rung lắc: Áp lực chốt lời tăng, ${ticker} giảm nhẹ nhưng vẫn giữ nền hỗ trợ`,
        time: 'Hôm nay, 09:15',
        sentiment: 'neutral',
      },
      {
        title: `${ticker}: Tin đồn siết biên lợi nhuận khiến nhà đầu tư thận trọng, khối lượng giao dịch tăng`,
        time: 'Hôm qua, 16:40',
        sentiment: 'negative',
      },
    ],
    [ticker]
  );

  const mockPriceHistory = useMemo(() => {
    const multipliers = [0.92, 0.94, 0.95, 0.98, 0.97, 1.0, 1.03, 1.01, 1.04, 1.06, 1.05, 1.07];
    const labels = ['01/04', '03/04', '05/04', '07/04', '09/04', '11/04', '13/04', '15/04', '17/04', '19/04', '21/04', '23/04'];

    return labels.map((date, idx) => ({
      date,
      price: Math.round(currentPrice * multipliers[idx]),
    }));
  }, [currentPrice]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const changeColor = changePct >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50';
  const changeLabel = `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`;

  const sentimentMeta = {
    positive: { label: 'Tích cực', className: 'bg-emerald-50 text-emerald-700' },
    negative: { label: 'Tiêu cực', className: 'bg-red-50 text-red-700' },
    neutral: { label: 'Trung lập', className: 'bg-gray-100 text-gray-700' },
  };

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
            <div className="mb-3 text-sm font-extrabold text-black">Lịch sử giá gần đây</div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockPriceHistory} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickFormatter={formatShortDate}
                  />
                  <YAxis
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={72}
                    tickFormatter={(value) => Intl.NumberFormat('vi-VN').format(value)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 text-sm font-extrabold text-black">Tin tức &amp; Phân tích tâm lý</div>
            <ul className="space-y-3">
              {mockNews.map((item, idx) => {
                const meta = sentimentMeta[item.sentiment] ?? sentimentMeta.neutral;

                return (
                  <li key={`${item.time}-${idx}`} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                        <div className="mt-1 text-xs text-gray-500">{item.time}</div>
                      </div>

                      <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
                        {meta.label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
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
