import { useMemo, useState, useEffect } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiClient } from '../../../services/apiClient';

const INDEX_TICKERS = new Set(['VNINDEX', 'VN30']);

const timeframes = [
  { key: '1d', label: '1 ngày' },
  { key: '5d', label: '5 ngày' },
  { key: '1m', label: '1 tháng' },
  { key: '6m', label: '6 tháng' },
  { key: '1y', label: '1 năm' },
  { key: '5y', label: '5 năm' },
  { key: 'Max', label: 'Tối đa' },
];

function formatVND(value, maximumFractionDigits = 2) {
  return Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits,
  }).format(value);
}

function formatDateVnShort(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(d);
}

function formatDateVnLong(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

function formatVolume(v) {
  if (!v) return '—';
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} tỷ`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} triệu`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} nghìn`;
  return String(v);
}

function CustomTooltip({ active, payload, label, isIndex }) {
  if (!active || !payload?.length) return null;

  const v = payload[0]?.value;
  const formatted = isIndex
    ? `${v?.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} điểm`
    : formatVND(v * 1000);
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2">
      <div className="text-xs text-gray-500">{formatDateVnLong(label)}</div>
      <div className="text-sm font-semibold text-gray-900">{formatted}</div>
    </div>
  );
}

export default function MainChartSection({ ticker = 'VNINDEX', tickerName }) {
  const [timeframe, setTimeframe] = useState('1m');
  const [allData, setAllData] = useState([]);
  const [latestBar, setLatestBar] = useState(null);
  const [prevBar, setPrevBar] = useState(null);
  const [updatedAt, setUpdatedAt] = useState('');

  const isIndex = INDEX_TICKERS.has(ticker);
  const displayName = tickerName ?? (ticker === 'VNINDEX' ? 'VN-Index' : ticker);

  useEffect(() => {
    setAllData([]);
    setLatestBar(null);
    setPrevBar(null);
    setUpdatedAt('');
    setTimeframe('1m');

    apiClient
      .get(`/market/stocks/${ticker}/price/daily?limit=365`)
      .then((res) => {
        if (!Array.isArray(res.data) || res.data.length === 0) return;
        const sorted = [...res.data].reverse();
        const mapped = sorted.map((r) => ({
          date: r.timestamp.split('T')[0],
          value: Number(r.close),
          high: Number(r.high ?? r.close),
          low: Number(r.low ?? r.close),
          volume: Number(r.volume ?? 0),
        }));
        setAllData(mapped);
        const last = mapped[mapped.length - 1];
        const prev = mapped[mapped.length - 2] ?? null;
        setLatestBar(last);
        setPrevBar(prev);
        setUpdatedAt(last.date);
      })
      .catch(() => {});
  }, [ticker]);

  const visibleData = useMemo(() => {
    const countByTimeframe = {
      '1d': 1,
      '5d': 5,
      '1m': 22,
      '6m': 130,
      '1y': 252,
      '5y': allData.length,
      Max: allData.length,
    };
    const count = countByTimeframe[timeframe] ?? 22;
    return allData.slice(-count);
  }, [timeframe, allData]);

  const currentValue = latestBar?.value ?? 0;
  const prevClose = prevBar?.value ?? currentValue;
  const changePct = prevClose > 0 ? ((currentValue - prevClose) / prevClose) * 100 : 0;
  const isUp = changePct >= 0;

  // Price formatter: index shows points, stocks show VND
  const fmtPrice = (v) =>
    isIndex
      ? v.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
      : formatVND(v * 1000);

  // 52-week high / low
  const high52w = allData.length > 0 ? Math.max(...allData.map((d) => d.high)) : 0;
  const low52w = allData.length > 0 ? Math.min(...allData.map((d) => d.low)) : 0;

  const statsRows = latestBar
    ? [
        { label: 'Đóng cửa trước', value: fmtPrice(prevClose) },
        { label: 'Biên độ trong ngày', value: `${fmtPrice(latestBar.low)} – ${fmtPrice(latestBar.high)}` },
        { label: 'Biên độ 52 tuần', value: `${fmtPrice(low52w)} – ${fmtPrice(high52w)}` },
        { label: 'Khối lượng', value: formatVolume(latestBar.volume) },
        { label: '% Thay đổi hôm nay', value: `${isUp ? '+' : ''}${changePct.toFixed(2)}%` },
      ]
    : [
        { label: 'Đóng cửa trước', value: '...' },
        { label: 'Biên độ trong ngày', value: '...' },
        { label: 'Biên độ 52 tuần', value: '...' },
        { label: 'Khối lượng', value: '...' },
        { label: '% Thay đổi hôm nay', value: '...' },
      ];

  return (
    <section className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-gray-100 grid place-items-center text-gray-700">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 19V5" strokeLinecap="round" />
                  <path d="M4 19h16" strokeLinecap="round" />
                  <path d="M7 15l3-4 3 2 4-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-extrabold text-black">{displayName}</div>
                <div className="text-xs text-black font-medium">{isIndex ? 'Tổng quan thị trường' : 'Biểu đồ giá'}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {timeframes.map((tf) => {
                const isActive = tf.key === timeframe;
                return (
                  <button
                    key={tf.key}
                    type="button"
                    onClick={() => setTimeframe(tf.key)}
                    className={[
                      'h-9 px-3 rounded-lg text-sm font-medium border border-gray-200',
                      isActive ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-700 hover:bg-gray-50',
                    ].join(' ')}
                    aria-pressed={isActive}
                  >
                    {tf.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="text-4xl font-bold text-gray-900">
                  {isIndex
                    ? currentValue.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
                    : (currentValue * 1000).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' đ'}
                </div>
                <div className={`px-2.5 py-1 rounded-full text-sm font-semibold ${isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {isUp ? '+' : ''}{changePct.toFixed(2)}%
                </div>
              </div>
              <div className="mt-1 text-xs text-gray-700 font-medium">
                {updatedAt ? `Cập nhật: ${formatDateVnLong(updatedAt)} · Đóng cửa phiên giao dịch` : 'Đang tải...'}
              </div>
            </div>
          </div>

          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
              <AreaChart data={visibleData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="vnIndexFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="80%" stopColor="#10B981" stopOpacity={0.04} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="4 4" />

                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  minTickGap={16}
                  tickFormatter={formatDateVnShort}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  width={isIndex ? 60 : 72}
                  tickFormatter={(v) =>
                    isIndex
                      ? v.toLocaleString('vi-VN', { maximumFractionDigits: 0 })
                      : `${(v * 1000).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}`
                  }
                  domain={[(min) => Math.floor(min * 0.995), (max) => Math.ceil(max * 1.005)]}
                />

                <Tooltip content={<CustomTooltip isIndex={isIndex} />} cursor={{ stroke: '#E5E7EB', strokeDasharray: '4 4' }} />

                <Area
                  type="linear"
                  dataKey="value"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#vnIndexFill)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: '#10B981', fill: '#FFFFFF' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="text-sm font-extrabold text-black">Mô tả</div>
              <button
                type="button"
                className="h-8 w-8 grid place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                aria-label="Tùy chọn"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <circle cx="6" cy="12" r="1.6" />
                  <circle cx="12" cy="12" r="1.6" />
                  <circle cx="18" cy="12" r="1.6" />
                </svg>
              </button>
            </div>

            <button
              type="button"
              className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-700 hover:bg-gray-50"
              aria-label="Khoảng thời gian"
            >
              24 giờ
            </button>
          </div>

          <div className="px-4 pb-2">
            {statsRows.map((row, idx) => (
              <div
                key={row.label}
                className={[
                  'py-3 flex items-center justify-between gap-4',
                  idx !== statsRows.length - 1 ? 'border-b border-gray-100' : '',
                ].join(' ')}
              >
                <div className="text-sm font-medium text-gray-900">{row.label}</div>
                <div className="text-sm font-medium text-gray-900">{row.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 19V5" strokeLinecap="round" />
                <path d="M4 19h16" strokeLinecap="round" />
                <path d="M7 16v-5" strokeLinecap="round" />
                <path d="M11 16V9" strokeLinecap="round" />
                <path d="M15 16v-8" strokeLinecap="round" />
                <path d="M19 16v-3" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="text-xs text-gray-700 font-medium">Khối lượng giao dịch</div>
              <div className="text-2xl font-extrabold text-black">{formatVolume(latestBar?.volume ?? 0)}</div>
            </div>
          </div>

          <div className="flex items-end gap-1 h-12" aria-hidden="true">
            {allData.slice(-7).map((d, i) => {
              const maxVol = Math.max(...allData.slice(-7).map((x) => x.volume), 1);
              const h = Math.max(4, Math.round((d.volume / maxVol) * 44));
              return <div key={i} className="w-2 rounded-sm bg-emerald-200" style={{ height: `${h}px` }} />;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
