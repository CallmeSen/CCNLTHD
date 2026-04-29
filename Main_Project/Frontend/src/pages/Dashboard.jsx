import TopStocksCarousel from '../features/market/components/TopStocksCarousel';
import MainChartSection from '../features/market/components/MainChartSection';

import { topStocks } from '../features/market/mock/topStocks';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <TopStocksCarousel items={topStocks} />
      <MainChartSection />
    </div>
  );
}
