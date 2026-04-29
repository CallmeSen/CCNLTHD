import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layouts/Mainlayout';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import StockDetail from './pages/StockDetail';
import ChatAI from './pages/ChatAI';
import Market from './pages/Market';
import Home from './pages/Home';
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/login'
import SignupPage from './pages/signup'
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="chatai" element={<ChatAI />} />
        <Route path="portforlios" element={<Portfolio />} />
        <Route path="settings" element={<div>Cài đặt</div>} />
        <Route path="stock/:ticker" element={<StockDetail />} />
        <Route path="market" element={<Market />} />
      </Route>

      <Route path="*" element={<div>404 - Không tìm thấy trang</div>} />
    </Routes>
  );
}

export default App;