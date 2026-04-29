function formatSignedVnd(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';

  const n = Number(value);
  if (!Number.isFinite(n)) return '—';

  const abs = Math.abs(n);
  const formatted = Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(abs);

  if (n > 0) return `+${formatted}`;
  if (n < 0) return `-${formatted}`;
  return formatted;
}

function formatNumber(value, maximumFractionDigits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';

  const n = Number(value);
  if (!Number.isFinite(n)) return '—';

  return Intl.NumberFormat('en-US', {
    maximumFractionDigits,
  }).format(n);
}

export default function MetricsBar({ activePortfolio }) {
  const pnl = activePortfolio?.pnl;
  const sharpe = activePortfolio?.sharpe;
  const beta = activePortfolio?.beta;

  const pnlNumber = Number(pnl);
  const pnlCls = pnlNumber > 0 ? 'text-emerald-500' : pnlNumber < 0 ? 'text-red-500' : 'text-gray-900';

  return (
    <section className="flex flex-col gap-4 h-full">
      <div className="bg-white rounded-xl border border-gray-200 p-4 w-full flex-1">
        <div className="text-sm font-medium text-gray-900">Tổng Lời/Lỗ</div>
        <div className={`mt-2 text-2xl font-bold ${pnlCls}`}>{formatSignedVnd(pnl)}</div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 w-full flex-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-gray-900">Sharpe Ratio</div>
          <span className="relative inline-flex items-center group">
            <span
              className="h-5 w-5 rounded-full border border-gray-200 text-gray-400 text-xs font-bold inline-grid place-items-center"
              aria-label="Thông tin Sharpe Ratio"
            >
              ?
            </span>
            <span
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full mt-1 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            >
              Sharpe &gt; 1 là danh mục đang hoạt động tốt
            </span>
          </span>
        </div>

        <div className="mt-2 text-2xl font-bold text-gray-900">{formatNumber(sharpe, 2)}</div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 w-full flex-1">
        <div className="text-sm font-medium text-gray-900">Hệ số Beta</div>
        <div className="mt-2 text-2xl font-bold text-gray-900">{formatNumber(beta, 2)}</div>
        <div className="mt-1 text-xs text-gray-500">So với VN-Index</div>
      </div>
    </section>
  );
}
