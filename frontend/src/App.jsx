import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import StocksPage from './pages/StocksPage'
import AnalyticsPage from './pages/AnalyticsPage'
import PredictorPage from './pages/PredictorPage'
import StockDetail from './pages/StockDetail'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"           element={<Dashboard />} />
        <Route path="/stocks"     element={<StocksPage />} />
        <Route path="/stocks/:ticker" element={<StockDetail />} />
        <Route path="/analytics"  element={<AnalyticsPage />} />
        <Route path="/predictor"  element={<PredictorPage />} />
      </Routes>
    </Layout>
  )
}
