import { useEffect, useState } from 'react';
import TopStocksCarousel from '../features/market/components/TopStocksCarousel';
import MainChartSection from '../features/market/components/MainChartSection';

import { topStocks as fallbackTopStocks } from '../features/market/mock/topStocks';
import { fetchTopStocks } from '../services/stockApi';

export default function Dashboard() {
  const [topStocksData, setTopStocksData] = useState(fallbackTopStocks);
  const [selectedTicker, setSelectedTicker] = useState('VNINDEX');
  const [selectedTickerName, setSelectedTickerName] = useState('VN-Index');

  useEffect(() => {
    fetchTopStocks(10)
      .then((data) => {
        if (data.length > 0) setTopStocksData(data);
      })
      .catch(() => {
        // keep fallback mock data on error
      });
  }, []);

  const handleSelectTicker = (ticker, name) => {
    setSelectedTicker(ticker);
    setSelectedTickerName(name ?? ticker);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <TopStocksCarousel
        items={topStocksData}
        selectedTicker={selectedTicker}
        onSelectTicker={handleSelectTicker}
      />
      <MainChartSection ticker={selectedTicker} tickerName={selectedTickerName} />
    </div>
  );
}
