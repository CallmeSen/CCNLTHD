import { useEffect, useState } from 'react';
import TopStocksCarousel from '../features/market/components/TopStocksCarousel';
import MainChartSection from '../features/market/components/MainChartSection';

import { topStocks as fallbackTopStocks } from '../features/market/mock/topStocks';
import { fetchTopStocks } from '../services/stockApi';

export default function Dashboard() {
  const [topStocksData, setTopStocksData] = useState(fallbackTopStocks);

  useEffect(() => {
    fetchTopStocks(10)
      .then((data) => {
        if (data.length > 0) setTopStocksData(data);
      })
      .catch(() => {
        // keep fallback mock data on error
      });
  }, []);

  return (
    <div className="space-y-6">
      <TopStocksCarousel items={topStocksData} />
      <MainChartSection />
    </div>
  );
}
