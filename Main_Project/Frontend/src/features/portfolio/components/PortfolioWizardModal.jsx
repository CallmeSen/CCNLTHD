import { useEffect, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { usePortfolio } from '../context/PortfolioContext';

const ANALYSIS_MESSAGES = [
  'Đang tải dữ liệu Market Data...',
  'Risk Manager đang đánh giá...',
  'Đang tối ưu hóa tỷ trọng...',
];

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <path d="M6 6l12 12" strokeLinecap="round" />
      <path d="M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function SpinnerIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-20" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-90" />
    </svg>
  );
}

function CheckCircleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PencilIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <path d="M4 20h4l10-10-4-4L4 16v4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 7l4 4" strokeLinecap="round" />
    </svg>
  );
}

function RobotIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <rect x="5" y="8" width="14" height="11" rx="3" />
      <path d="M12 4v4" strokeLinecap="round" />
      <circle cx="9.5" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13" r="1" fill="currentColor" stroke="none" />
      <path d="M9 16h6" strokeLinecap="round" />
    </svg>
  );
}

function TooltipAllocation({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2">
      <div className="text-sm font-semibold text-gray-900">{item.name}</div>
      <div className="text-xs text-gray-500">{item.value}%</div>
    </div>
  );
}

const PIE_COLORS = ['#2563EB', '#14B8A6', '#F59E0B'];

const PROPOSED_STOCK_LIBRARY = {
  FPT: { key: 'fpt', ticker: 'FPT', name: 'FPT', sector: 'Công nghệ', avgPrice: 105000, growth: 0.14, sharpe: 1.26 },
  VNM: { key: 'vnm', ticker: 'VNM', name: 'VNM', sector: 'Hàng tiêu dùng', avgPrice: 69000, growth: 0.09, sharpe: 1.05 },
  SSI: { key: 'ssi', ticker: 'SSI', name: 'SSI', sector: 'Chứng khoán', avgPrice: 32000, growth: 0.12, sharpe: 1.12 },
  HPG: { key: 'hpg', ticker: 'HPG', name: 'HPG', sector: 'Thép', avgPrice: 27000, growth: 0.13, sharpe: 1.08 },
  MWG: { key: 'mwg', ticker: 'MWG', name: 'MWG', sector: 'Bán lẻ', avgPrice: 52000, growth: 0.11, sharpe: 1.04 },
  TCB: { key: 'tcb', ticker: 'TCB', name: 'TCB', sector: 'Ngân hàng', avgPrice: 39000, growth: 0.1, sharpe: 1.1 },
};

const ALL_MOCK_STOCKS = [
  PROPOSED_STOCK_LIBRARY.FPT,
  PROPOSED_STOCK_LIBRARY.VNM,
  PROPOSED_STOCK_LIBRARY.SSI,
  PROPOSED_STOCK_LIBRARY.MWG,
  PROPOSED_STOCK_LIBRARY.TCB,
  PROPOSED_STOCK_LIBRARY.HPG,
  { key: 'vic', ticker: 'VIC', name: 'VIC', sector: 'Bất động sản', avgPrice: 42000, growth: 0.08, sharpe: 0.98 },
  { key: 'msn', ticker: 'MSN', name: 'MSN', sector: 'Hàng tiêu dùng', avgPrice: 65000, growth: 0.09, sharpe: 1.01 },
  { key: 'vcb', ticker: 'VCB', name: 'VCB', sector: 'Ngân hàng', avgPrice: 92000, growth: 0.07, sharpe: 1.14 },
  { key: 'ree', ticker: 'REE', name: 'REE', sector: 'Năng lượng', avgPrice: 61000, growth: 0.1, sharpe: 1.03 },
  { key: 'gmd', ticker: 'GMD', name: 'GMD', sector: 'Vận tải', avgPrice: 70000, growth: 0.11, sharpe: 1.02 },
  { key: 'plx', ticker: 'PLX', name: 'PLX', sector: 'Năng lượng', avgPrice: 38000, growth: 0.06, sharpe: 0.96 },
];

function buildInitialEditableHoldings(riskLevel) {
  const allocationsByRisk = {
    0: [30, 45, 25],
    1: [40, 30, 30],
    2: [50, 20, 30],
  };

  const base = allocationsByRisk[riskLevel] ?? allocationsByRisk[1];

  return [PROPOSED_STOCK_LIBRARY.FPT, PROPOSED_STOCK_LIBRARY.VNM, PROPOSED_STOCK_LIBRARY.SSI].map((item, index) => ({
    ...item,
    allocation: base[index],
  }));
}

function buildAssetsFromHoldings(holdings, budgetValue) {
  return holdings.map((holding) => {
    const capital = Math.round((budgetValue * holding.allocation) / 100);
    const quantity = Math.max(1, Math.floor(capital / holding.avgPrice));
    const currentPrice = Math.round(holding.avgPrice * (1 + holding.growth));
    const pnl = Number((((currentPrice - holding.avgPrice) / holding.avgPrice) * 100).toFixed(2));

    return {
      ticker: holding.ticker,
      quantity,
      avgPrice: holding.avgPrice,
      currentPrice,
      allocation: holding.allocation,
      pnl,
    };
  });
}

function formatBudgetVnd(value) {
  return Intl.NumberFormat('vi-VN').format(value);
}

export default function PortfolioWizardModal({ open, onClose }) {
  const { addPortfolio, createPortfolioOnServer, setActivePortfolio } = usePortfolio();
  const [step, setStep] = useState(0);
  const [budget, setBudget] = useState('50000000');
  const [riskLevel, setRiskLevel] = useState(1);
  const [portfolioName, setPortfolioName] = useState('');
  const [proposedStocks, setProposedStocks] = useState(() => buildInitialEditableHoldings(1));
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageIndex, setMessageIndex] = useState(0);
  const riskLabels = ['An toàn', 'Cân bằng', 'Mạo hiểm'];

  const currentMessage = useMemo(() => ANALYSIS_MESSAGES[messageIndex % ANALYSIS_MESSAGES.length], [messageIndex]);
  const donutData = useMemo(
    () => proposedStocks
      .filter((item) => Number(item.allocation) > 0)
      .map((item) => ({ key: item.key, name: `${item.ticker} • ${item.sector}`, value: item.allocation })),
    [proposedStocks],
  );
  const totalAllocation = useMemo(
    () => proposedStocks.reduce((acc, item) => acc + Number(item.allocation || 0), 0),
    [proposedStocks],
  );
  const expectedReturn = useMemo(() => {
    return proposedStocks.reduce((acc, item) => acc + (item.growth * item.allocation), 0);
  }, [proposedStocks]);
  const estimatedSharpe = useMemo(() => {
    const base = proposedStocks.reduce((acc, item) => acc + (item.sharpe * item.allocation), 0) / 100;
    return Number(base.toFixed(2));
  }, [proposedStocks]);
  const isAllocationValid = proposedStocks.length > 0 && totalAllocation === 100;
  const isNameValid = portfolioName.trim().length > 0;
  const canSave = isAllocationValid && isNameValid;
  const searchResults = useMemo(
    () =>
      ALL_MOCK_STOCKS.filter(
        (option) =>
          option.ticker.toLowerCase().includes(searchQuery.trim().toLowerCase()) &&
          !proposedStocks.some((item) => item.ticker === option.ticker),
      ),
    [proposedStocks, searchQuery],
  );
  const shouldShowSearchDropdown = isAddingStock && searchQuery.trim().length > 0 && searchResults.length > 0;

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setMessageIndex(0);
    setPortfolioName('');
    setProposedStocks(buildInitialEditableHoldings(riskLevel));
    setIsAddingStock(false);
    setSearchQuery('');
  }, [open]);

  useEffect(() => {
    if (!open || step !== 2) return;

    const messageInterval = window.setInterval(() => {
      setMessageIndex((prev) => prev + 1);
    }, 1500);

    const finishTimer = window.setTimeout(() => {
      setProposedStocks(buildInitialEditableHoldings(riskLevel));
      setIsAddingStock(false);
      setSearchQuery('');
      setStep(3);
    }, 4500);

    return () => {
      window.clearInterval(messageInterval);
      window.clearTimeout(finishTimer);
    };
  }, [open, step, riskLevel]);

  const handleClose = () => {
    setStep(0);
    setMessageIndex(0);
    setPortfolioName('');
    setProposedStocks(buildInitialEditableHoldings(riskLevel));
    setIsAddingStock(false);
    setSearchQuery('');
    onClose();
  };

  const updateHoldingAllocation = (key, nextValue) => {
    const numeric = Number(nextValue);
    const safeValue = Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) : 0;

    setProposedStocks((prev) =>
      prev.map((item) =>
        item.key === key
          ? {
              ...item,
              allocation: safeValue,
            }
          : item,
      ),
    );
  };

  const removeHolding = (key) => {
    setProposedStocks((prev) => prev.filter((item) => item.key !== key));
  };

  const confirmAddStock = (ticker) => {
    const stock = ALL_MOCK_STOCKS.find((item) => item.ticker === ticker);
    if (!stock) return;

    setProposedStocks((prev) => {
      if (prev.some((item) => item.ticker === stock.ticker)) return prev;
      return [...prev, { ...stock, allocation: 0 }];
    });

    setIsAddingStock(false);
    setSearchQuery('');
  };

  const handleConfirmSave = async () => {
    if (!canSave) return;

    const parsedBudget = Number(budget);
    const safeBudget = Number.isFinite(parsedBudget) && parsedBudget > 0 ? parsedBudget : 50000000;
    const assets = buildAssetsFromHoldings(proposedStocks, safeBudget);

    const newPortfolio = {
      id: `pw-${Date.now()}`,
      name: portfolioName.trim(),
      isDefault: false,
      pnl: Math.round(safeBudget * (expectedReturn / 100)),
      sharpe: estimatedSharpe,
      beta: Number((0.85 + (riskLevel * 0.2)).toFixed(2)),
      assets,
    };

    await createPortfolioOnServer(newPortfolio);
    handleClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="portfolio-wizard-title"
    >
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 sm:p-8 relative"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 h-9 w-9 inline-grid place-items-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          aria-label="Đóng"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 id="portfolio-wizard-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900!">
                Bạn muốn tạo danh mục như thế nào?
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setPortfolioName('');
                  setProposedStocks([]);
                  setSearchQuery('');
                  setIsAddingStock(false);
                  setStep(3);
                }}
                className="rounded-2xl border border-gray-200 bg-white p-5 text-left hover:border-blue-300 hover:shadow-sm transition"
              >
                <PencilIcon className="h-8 w-8 text-gray-700" />
                <div className="mt-4 text-lg font-bold text-gray-900">Tự xây dựng</div>
                <div className="mt-1 text-sm font-medium text-gray-900">Tự tìm kiếm mã và thiết lập tỷ trọng theo ý muốn</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProposedStocks(buildInitialEditableHoldings(riskLevel));
                  setSearchQuery('');
                  setIsAddingStock(false);
                  setStep(1);
                }}
                className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 text-left hover:border-blue-300 hover:shadow-sm transition"
              >
                <RobotIcon className="h-8 w-8 text-blue-600" />
                <div className="mt-4 text-lg font-bold text-gray-900">Trợ lý AI thiết kế</div>
                <div className="mt-1 text-sm font-medium text-gray-900">Nhập ngân sách và mức rủi ro để AI đề xuất tối ưu</div>
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h2 id="portfolio-wizard-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900!">
                Trợ lý AI - Khởi tạo danh mục
              </h2>
              <p className="mt-2 text-sm font-medium text-gray-900">Thiết lập thông số đầu vào để AI đề xuất danh mục phù hợp.</p>
            </div>

            <div className="space-y-3">
              <label htmlFor="portfolio-budget" className="text-sm font-bold text-gray-900">
                Ngân sách
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-semibold text-gray-900">VNĐ</span>
                <input
                  id="portfolio-budget"
                  type="text"
                  inputMode="numeric"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value.replace(/[^\d]/g, ''))}
                  className="w-full rounded-xl border border-gray-200 bg-white py-4 pl-16 pr-4 text-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập ngân sách"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="risk-level" className="text-sm font-bold text-gray-900">
                  Mức rủi ro
                </label>
                <span className="text-sm font-semibold text-blue-600">{riskLabels[riskLevel]}</span>
              </div>

              <input
                id="risk-level"
                type="range"
                min="0"
                max="2"
                step="1"
                value={riskLevel}
                onChange={(event) => setRiskLevel(Number(event.target.value))}
                className="w-full accent-blue-600"
              />

              <div className="grid grid-cols-3 text-xs sm:text-sm font-medium text-gray-900">
                <span className="text-left">An toàn</span>
                <span className="text-center">Cân bằng</span>
                <span className="text-right">Mạo hiểm</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setMessageIndex(0);
                  setStep(2);
                }}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Phân tích ngay
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="min-h-90 flex flex-col items-center justify-center text-center">
            <SpinnerIcon className="h-14 w-14 text-blue-600 animate-spin" />
            <h3 className="mt-6 text-xl font-bold text-gray-900">AI đang phân tích danh mục</h3>
            <p className="mt-3 text-sm text-gray-500 animate-pulse">{currentMessage}</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
              <h3 className="text-2xl font-bold text-gray-900">Đề xuất Tối ưu cho bạn</h3>
            </div>

            <div className="space-y-2">
              <label htmlFor="portfolio-name" className="text-sm font-bold text-gray-900">
                Tên danh mục
              </label>
              <input
                id="portfolio-name"
                type="text"
                value={portfolioName}
                onChange={(event) => setPortfolioName(event.target.value)}
                placeholder="VD: Danh mục Đầu tư Tăng trưởng"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
              {!isNameValid && <p className="text-sm text-red-500">Vui lòng nhập tên danh mục trước khi lưu.</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-gray-200 p-0 max-h-100 overflow-y-auto">
                <div className="sticky top-0 z-10 bg-white p-4 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-900">Tỷ trọng cổ phiếu đề xuất</div>
                </div>

                <div className="divide-y divide-gray-100">
                  {proposedStocks.length === 0 ? (
                    <div className="min-h-40 px-4 py-6 flex items-center justify-center text-center text-sm text-gray-500">
                      Chưa có cổ phiếu nào. Hãy dùng ô tìm kiếm bên dưới để thêm mã.
                    </div>
                  ) : (
                    proposedStocks.map((holding) => (
                      <div key={holding.key} className="grid grid-cols-3 gap-3 items-center p-3 border-b border-gray-100 last:border-b-0">
                        <div className="col-span-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{holding.ticker}</div>
                          <div className="text-xs text-gray-500 truncate">{holding.sector}</div>
                        </div>

                        <div className="col-span-1">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={holding.allocation}
                            onChange={(event) => updateHoldingAllocation(holding.key, event.target.value)}
                            className="w-full accent-blue-600"
                          />
                        </div>

                        <div className="col-span-1 flex items-center justify-end gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={holding.allocation}
                            onChange={(event) => updateHoldingAllocation(holding.key, event.target.value)}
                            className="w-12 rounded-lg border border-gray-200 px-2 py-1 text-right text-sm font-semibold text-gray-900"
                          />
                          <span className="text-xs font-semibold text-gray-500 w-6 text-right">%</span>
                          <button
                            type="button"
                            onClick={() => removeHolding(holding.key)}
                            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 shrink-0"
                            aria-label={`Xóa ${holding.ticker}`}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-4 w-4">
                              <path d="M3 6h18" strokeLinecap="round" />
                              <path d="M8 6V4h8v2" strokeLinecap="round" />
                              <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M10 11v6" strokeLinecap="round" />
                              <path d="M14 11v6" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 border-t border-gray-100">
                  {isAddingStock ? (
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Tìm kiếm mã cổ phiếu..."
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      {shouldShowSearchDropdown && (
                        <ul className="absolute left-0 right-0 top-full z-20 mt-2 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                          {searchResults.map((item) => (
                            <li key={item.ticker}>
                              <button
                                type="button"
                                onClick={() => confirmAddStock(item.ticker)}
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                              >
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">{item.ticker}</div>
                                  <div className="text-xs text-gray-500">{item.sector}</div>
                                </div>
                                <span className="text-xs font-semibold text-blue-600">+ Thêm</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {searchQuery.trim().length > 0 && !searchResults.length && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-lg">
                          Không tìm thấy mã phù hợp.
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingStock(false);
                          setSearchQuery('');
                        }}
                        className="mt-2 text-xs font-semibold text-gray-500 hover:text-gray-700"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingStock(true);
                        setSearchQuery('');
                      }}
                      className="w-full rounded-xl border border-dashed border-gray-300 bg-transparent px-4 py-3 text-sm font-semibold text-gray-500 hover:border-blue-300 hover:text-blue-600"
                    >
                      + Thêm mã cổ phiếu
                    </button>
                  )}
                </div>

                <div className="px-3 pb-3 pt-1">
                  <p className="text-sm font-semibold text-gray-900">Tổng tỷ trọng: {totalAllocation}%</p>
                  {!isAllocationValid && (
                    <p className="mt-1 text-sm text-red-500">
                      {totalAllocation > 100
                        ? `Tổng tỷ trọng đang vượt ${totalAllocation - 100}%. Vui lòng giảm để về 100%.`
                        : `Tổng tỷ trọng còn thiếu ${100 - totalAllocation}%. Vui lòng tăng để đủ 100%.`}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-6 bg-gray-50/60 space-y-5">
                <div className="flex flex-col items-center">
                  <div className="h-56 w-full max-w-xs flex items-center justify-center">
                    {proposedStocks.length === 0 ? (
                      <div className="h-36 w-36 rounded-full border-8 border-gray-200" />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip content={<TooltipAllocation />} />
                          <Pie
                            data={donutData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={56}
                            outerRadius={90}
                            paddingAngle={2}
                            stroke="#FFFFFF"
                            strokeWidth={2}
                          >
                            {donutData.map((item, idx) => (
                              <Cell key={item.key} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="mt-4 w-full space-y-2">
                    {donutData.length ? (
                      donutData.map((item, idx) => (
                        <div key={item.key} className="flex items-center justify-center gap-4">
                          <div className="flex items-center gap-2 text-gray-700">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{item.value}%</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-sm text-gray-500">Chưa có mã nào để hiển thị trên biểu đồ.</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm font-semibold text-gray-900 mb-3">Chỉ số ước tính</div>
                  <div className="space-y-2.5">
                    <p className="text-sm text-gray-700">
                      Lợi nhuận kỳ vọng: <span className="font-bold text-emerald-600">+{expectedReturn.toFixed(1)}%/năm</span>
                    </p>
                    <p className="text-sm text-gray-700">
                      Sharpe Ratio ước tính: <span className="font-bold text-gray-900">{estimatedSharpe}</span>
                    </p>
                    <p className="text-sm text-gray-700">
                      Mức rủi ro: <span className="font-bold text-blue-600">{riskLabels[riskLevel]}</span>
                    </p>
                    <p className="text-xs text-gray-500 pt-1">Ngân sách mô phỏng: {formatBudgetVnd(Number(budget) || 0)} VNĐ</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Tạo lại
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={!canSave}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
                  canSave ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Xác nhận &amp; Lưu danh mục
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
