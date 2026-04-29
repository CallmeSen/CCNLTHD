import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { usePortfolio } from '../context/PortfolioContext';
import MetricsBar from './MetricsBar';
import AssetDetailModal from './AssetDetailModal';

const MAU_PIE = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#06B6D4'];
const MAU_PIE_CLASS = [
  'bg-amber-500',
  'bg-red-500',
  'bg-emerald-500',
  'bg-blue-500',
  'bg-violet-500',
  'bg-cyan-500',
];

function dinhDangTienVnd(value, maximumFractionDigits = 0) {
  return Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits,
  }).format(value);
}

function dinhDangSo(value) {
  return Intl.NumberFormat('vi-VN').format(value);
}

function dinhDangPhanTram(value) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function taoDuLieuBienDongTrongNgay(seedValue) {
  const base = seedValue ?? 1200000;
  const points = 24;
  const data = [];
  let v = base * 0.6;

  for (let i = 0; i < points; i += 1) {
    const noise = (Math.random() - 0.5) * (base * 0.08);
    const drift = base / points;
    v = Math.max(0, v + drift + noise);
    data.push({ t: i, v: Math.round(v) });
  }

  data[data.length - 1].v = base;
  return data;
}

function TooltipPie({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2">
      <div className="text-sm font-semibold text-gray-900">{p.ticker}</div>
      <div className="text-xs text-gray-500">Tỷ trọng: {p.percent.toFixed(1)}%</div>
    </div>
  );
}

function TooltipSparkline({ active, payload }) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2">
      <div className="text-xs text-gray-500">Biến động</div>
      <div className="text-sm font-semibold text-gray-900">{dinhDangTienVnd(v)}</div>
    </div>
  );
}

function IconBaCham(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

function TopCards({ tongGiaTri, bienDongVnd, bienDongPct, duLieuSparkline }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-sm font-medium text-gray-900">Tổng giá trị</div>
        <div className="mt-2 text-3xl font-bold text-gray-900">{dinhDangTienVnd(tongGiaTri)}</div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-900">Biến động trong ngày</div>
          <div className="mt-2 flex items-baseline gap-3 flex-wrap">
            <div className="text-3xl font-bold text-emerald-500">{dinhDangTienVnd(bienDongVnd)}</div>
            <div className="text-lg font-bold text-emerald-500">{dinhDangPhanTram(bienDongPct)}</div>
          </div>
          <div className="mt-1 text-xs text-gray-500">So với giá đóng cửa gần nhất</div>
        </div>

        <div className="h-20 w-full md:w-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={duLieuSparkline} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<TooltipSparkline />} cursor={{ stroke: '#E5E7EB', strokeDasharray: '4 4' }} />
              <Area type="linear" dataKey="v" stroke="#10B981" strokeWidth={2} fill="url(#sparkFill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function AllocationChart({ pieData, tongGiaTri }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 h-full">
      <div className="text-base font-bold text-gray-900">Phân bổ danh mục hiện tại</div>

      <div className="mt-5 flex flex-col md:flex-row gap-6 md:items-center">
        <div className="h-56 w-full md:w-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<TooltipPie />} />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="ticker"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={2}
                stroke="#FFFFFF"
                strokeWidth={2}
              >
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={MAU_PIE[idx % MAU_PIE.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1">
          <div className="space-y-3">
            {pieData.map((item, idx) => (
              <div key={item.ticker} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-3 w-3 rounded-full ${MAU_PIE_CLASS[idx % MAU_PIE_CLASS.length]}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{item.ticker}</div>
                    <div className="text-xs text-gray-500">
                      Số lượng: {dinhDangSo(item.quantity)} · Tỷ trọng: {item.percent.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-900">{dinhDangTienVnd((tongGiaTri * item.percent) / 100)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HoldingsTable({ assets, onSelectAsset }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div className="text-base font-bold text-gray-900">Danh sách tài sản</div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Mã CP</th>
              <th className="text-right font-semibold px-4 py-3">Số lượng</th>
              <th className="text-right font-semibold px-4 py-3">Giá vốn</th>
              <th className="text-right font-semibold px-4 py-3">Giá hiện tại</th>
              <th className="text-right font-semibold px-4 py-3">Tỷ trọng (%)</th>
              <th className="text-right font-semibold px-4 py-3">Lời/Lỗ (%)</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assets.map((a) => {
              const pnlCls = a.pnl >= 0 ? 'text-emerald-500' : 'text-red-500';
              return (
                <tr
                  key={a.ticker}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onSelectAsset?.(a)}
                >
                  <td className="px-4 py-3 font-semibold text-gray-900">{a.ticker}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{dinhDangSo(a.quantity)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{dinhDangTienVnd(a.avgPrice)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{dinhDangTienVnd(a.currentPrice)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{a.allocation.toFixed(0)}%</td>
                  <td className={`px-4 py-3 text-right font-semibold ${pnlCls}`}>{dinhDangPhanTram(a.pnl)}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="h-8 w-8 inline-grid place-items-center text-gray-500 hover:text-gray-700" aria-label="Tùy chọn">
                      <IconBaCham className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function PortfolioDashboard() {
  const { activePortfolio } = usePortfolio();
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  const assets = useMemo(() => activePortfolio?.assets ?? [], [activePortfolio]);

  const { tongGiaTri, bienDongPct, bienDongVnd } = useMemo(() => {
    const total = assets.reduce((acc, a) => acc + a.quantity * a.currentPrice, 0);
    const pct = 1.66;
    const change = (total * pct) / 100;
    return { tongGiaTri: total, bienDongPct: pct, bienDongVnd: change };
  }, [assets]);

  const duLieuSparkline = useMemo(() => taoDuLieuBienDongTrongNgay(bienDongVnd), [bienDongVnd]);

  const pieData = useMemo(() => {
    const totalAlloc = assets.reduce((acc, a) => acc + (a.allocation ?? 0), 0);
    return assets.map((a) => {
      const percent = totalAlloc > 0 ? (a.allocation / totalAlloc) * 100 : 0;
      return {
        ticker: a.ticker,
        value: percent,
        percent,
        quantity: a.quantity,
      };
    });
  }, [assets]);

  if (!activePortfolio) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-gray-900 font-semibold">Chưa có danh mục nào.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TopCards
        tongGiaTri={tongGiaTri}
        bienDongVnd={bienDongVnd}
        bienDongPct={bienDongPct}
        duLieuSparkline={duLieuSparkline}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        <div className="lg:col-span-8">
          <AllocationChart pieData={pieData} tongGiaTri={tongGiaTri} />
        </div>

        <div className="lg:col-span-4">
          <MetricsBar activePortfolio={activePortfolio} />
        </div>
      </div>

      <HoldingsTable assets={assets} onSelectAsset={(asset) => {
        setSelectedAsset(asset);
        setIsAssetModalOpen(true);
      }} />

      <AssetDetailModal
        isOpen={isAssetModalOpen}
        onClose={() => {
          setIsAssetModalOpen(false);
          setSelectedAsset(null);
        }}
        asset={selectedAsset}
      />
    </div>
  );
}
