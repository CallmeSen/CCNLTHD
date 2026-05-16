import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layouts/Mainlayout'
import Dashboard from './pages/Dashboard'
import Portfolio from './pages/Portfolio'
import StockDetail from './pages/StockDetail'
import ChatAI from './pages/ChatAI.tsx'
import History from './pages/History.tsx'
import Analysis from './pages/Analysis'
import Report from './pages/Report.tsx'
import Settings from './pages/Settings.tsx'
import Market from './pages/Market'
import Home from './pages/Home'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/login'
import SignupPage from './pages/signup'
import { PortfolioProvider } from './features/portfolio/context/PortfolioContext'

function App() {
  return (
    <PortfolioProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="chatai" element={<Navigate to="/agent" replace />} />
          <Route path="agent" element={<ChatAI />} />
          <Route path="history" element={<History />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="report/:runId" element={<Report />} />
          <Route path="portforlios" element={<Portfolio />} />
          <Route path="settings" element={<Settings />} />
          <Route path="stock/:ticker" element={<StockDetail />} />
          <Route path="market" element={<Market />} />
        </Route>

        <Route path="*" element={<div>404 - Không tìm thấy trang</div>} />
      </Routes>
    </PortfolioProvider>
  )
}

export default App
