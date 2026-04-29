import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const timeframes = [
  { key: '1d', label: '1 ngày' },
  { key: '5d', label: '5 ngày' },
  { key: '1m', label: '1 tháng' },
  { key: '6m', label: '6 tháng' },
  { key: '1y', label: '1 năm' },
  { key: '5y', label: '5 năm' },
  { key: 'Max', label: 'Tối đa' },
];

function createRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function formatDateISO(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function generateChartData({
  seed = 20260427,
  points = 120,
  startValue = 3920,
  endValue = 4566.48,
  startDateUTC = new Date(Date.UTC(2026, 0, 1)),
} = {}) {
  const rand = createRng(seed);
  const data = [];

  let value = startValue;
  for (let i = 0; i < points; i += 1) {
    const drift = (endValue - startValue) / points;
    const noise = (rand() - 0.5) * 22; // make it gập ghềnh hơn
    const shock = rand() < 0.12 ? (rand() - 0.5) * 70 : 0;
    value = Math.max(2500, value + drift + noise + shock);

    const day = new Date(startDateUTC);
    day.setUTCDate(day.getUTCDate() + i);
    data.push({ date: formatDateISO(day), value: Number(value.toFixed(2)) });
  }

  data[data.length - 1].value = endValue;
  return data;
}

const chartData = generateChartData();

const statsData = [
  { label: 'Đóng cửa trước', value: '4.491,25' },
  { label: 'Biên độ trong ngày', value: '4.512,20 - 4.588,10' },
  { label: 'Biên độ 52 tuần', value: '3.620,10 - 4.690,55' },
  { label: 'Vốn hóa', value: '40,3 nghìn tỷ ₫' },
  { label: 'Khối lượng', value: '1,34 tỷ' },
  { label: 'Tỷ suất cổ tức', value: '1,18%' },
  { label: 'Chỉ số P/E', value: '19,6' },
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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const v = payload[0]?.value;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2">
      <div className="text-xs text-gray-500">{formatDateVnLong(label)}</div>
      <div className="text-sm font-semibold text-gray-900">{formatVND(v)}</div>
    </div>
  );
}

export default function MainChartSection() {
  const [timeframe, setTimeframe] = useState('1m');

  const visibleData = useMemo(() => {
    const countByTimeframe = {
      '1d': 24,
      '5d': 40,
      '1m': 60,
      '6m': 120,
      '1y': 120,
      '5y': 120,
      Max: chartData.length,
    };

    const count = countByTimeframe[timeframe] ?? 20;
    return chartData.slice(-count);
  }, [timeframe]);

  const currentValue = 4566.48;

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
                <div className="text-sm font-extrabold text-black">VN-Index</div>
                <div className="text-xs text-black font-medium">Tổng quan thị trường</div>
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
                <div className="text-4xl font-bold text-gray-900">{formatVND(currentValue)}</div>
                <div className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold">
                  +1.66%
                </div>
              </div>
              <div className="mt-1 text-xs text-gray-700 font-medium">Cập nhật: 27/04/2026 · 15:30 (GMT+7)</div>
            </div>
          </div>

          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
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
                  width={48}
                  tickFormatter={(v) => formatVND(v, 0)}
                  domain={['dataMin - 20', 'dataMax + 20']}
                />

                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E5E7EB', strokeDasharray: '4 4' }} />

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
            {statsData.map((row, idx) => (
              <div
                key={row.label}
                className={[
                  'py-3 flex items-center justify-between gap-4',
                  idx !== statsData.length - 1 ? 'border-b border-gray-100' : '',
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
              <div className="text-xs text-gray-700 font-medium">Vốn hóa</div>
              <div className="text-2xl font-extrabold text-black">40,3 nghìn tỷ ₫</div>
            </div>
          </div>

          <div className="flex items-end gap-1 h-12" aria-hidden="true">
            <div className="w-2 h-4 rounded-sm bg-emerald-200" />
            <div className="w-2 h-7 rounded-sm bg-emerald-200" />
            <div className="w-2 h-5 rounded-sm bg-emerald-200" />
            <div className="w-2 h-9 rounded-sm bg-emerald-200" />
            <div className="w-2 h-6 rounded-sm bg-emerald-200" />
            <div className="w-2 h-11 rounded-sm bg-emerald-200" />
            <div className="w-2 h-8 rounded-sm bg-emerald-200" />
          </div>
        </div>
      </div>
    </section>
  );
}
