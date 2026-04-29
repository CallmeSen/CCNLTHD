export const mockPortfolios = [
  {
    id: 'p1',
    name: 'Danh mục Lướt sóng',
    isDefault: true,
    pnl: 24500000,
    sharpe: 1.45,
    beta: 0.85,
    assets: [
      { ticker: 'FPT', quantity: 1000, avgPrice: 95000, currentPrice: 105000, allocation: 40, pnl: 10.5 },
      { ticker: 'VNM', quantity: 800, avgPrice: 67000, currentPrice: 65500, allocation: 25, pnl: -2.24 },
      { ticker: 'SSI', quantity: 1500, avgPrice: 28500, currentPrice: 31200, allocation: 20, pnl: 9.47 },
      { ticker: 'MWG', quantity: 600, avgPrice: 49000, currentPrice: 51200, allocation: 15, pnl: 4.49 },
    ],
  },
  {
    id: 'p2',
    name: 'Danh mục An toàn',
    isDefault: false,
    pnl: -3200000,
    sharpe: 0.92,
    beta: 0.62,
    assets: [
      { ticker: 'VCB', quantity: 500, avgPrice: 88000, currentPrice: 90500, allocation: 35, pnl: 2.84 },
      { ticker: 'VIC', quantity: 300, avgPrice: 43500, currentPrice: 41800, allocation: 20, pnl: -3.91 },
      { ticker: 'REE', quantity: 900, avgPrice: 61500, currentPrice: 64200, allocation: 25, pnl: 4.39 },
      { ticker: 'GAS', quantity: 200, avgPrice: 97200, currentPrice: 100100, allocation: 20, pnl: 2.98 },
    ],
  },
  {
    id: 'p3',
    name: 'Danh mục Dài hạn',
    isDefault: false,
    pnl: 11800000,
    sharpe: 1.12,
    beta: 1.08,
    assets: [
      { ticker: 'HPG', quantity: 3000, avgPrice: 24500, currentPrice: 27100, allocation: 30, pnl: 10.61 },
      { ticker: 'VHM', quantity: 700, avgPrice: 52500, currentPrice: 54800, allocation: 25, pnl: 4.38 },
      { ticker: 'MSN', quantity: 400, avgPrice: 70500, currentPrice: 66400, allocation: 20, pnl: -5.82 },
      { ticker: 'CTG', quantity: 1200, avgPrice: 31200, currentPrice: 33500, allocation: 25, pnl: 7.37 },
    ],
  },
];
