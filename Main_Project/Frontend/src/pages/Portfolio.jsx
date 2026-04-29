import { PortfolioProvider } from '../features/portfolio/context/PortfolioContext';
import PortfolioHeader from '../features/portfolio/components/PortfolioHeader';
import PortfolioDashboard from '../features/portfolio/components/PortfolioDashboard';

export default function Portfolio() {
  return (
    <PortfolioProvider>
      <div className="space-y-6">
        <PortfolioHeader />
        <PortfolioDashboard />
      </div>
    </PortfolioProvider>
  );
}
