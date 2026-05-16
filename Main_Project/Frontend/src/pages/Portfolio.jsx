import PortfolioHeader from '../features/portfolio/components/PortfolioHeader';
import PortfolioDashboard from '../features/portfolio/components/PortfolioDashboard';

export default function Portfolio() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <PortfolioHeader />
      <PortfolioDashboard />
    </div>
  );
}
