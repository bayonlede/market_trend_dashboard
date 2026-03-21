import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const BASE = BASE_URL.replace(/\/$/, '')

const api = axios.create({ 
  baseURL: BASE, 
  timeout: 20_000,
  headers: {
    'Accept': 'application/json',
  }
})

// Log connectivity issues to help debugging
api.interceptors.response.use(
  r => r,
  e => {
    console.error('API Error:', {
      url: e.config?.url,
      baseURL: e.config?.baseURL,
      status: e.response?.status,
      message: e.message
    })
    return Promise.reject(e)
  }
)

export const fetchMarketOverview      = () => api.get('/api/market/overview').then(r => r.data)
export const fetchStocks              = (params) => api.get('/api/stocks', { params }).then(r => r.data)
export const fetchStock               = (ticker) => api.get(`/api/stocks/${ticker}`).then(r => r.data)
export const fetchIndicators          = (ticker) => api.get(`/api/stocks/${ticker}/indicators`).then(r => r.data)
export const fetchSectorPerformance   = () => api.get('/api/analytics/sector-performance').then(r => r.data)
export const fetchRegimeHeatmap       = () => api.get('/api/analytics/regime-heatmap').then(r => r.data)
export const fetchTopPerformers       = () => api.get('/api/analytics/top-performers').then(r => r.data)
export const fetchVolumeDistribution  = () => api.get('/api/analytics/volume-distribution').then(r => r.data)
export const fetchIndexCorrelation    = () => api.get('/api/analytics/market-index-correlation').then(r => r.data)
export const fetchModelInfo           = () => api.get('/api/model/info').then(r => r.data)
export const postPredict              = (payload) => api.post('/api/predict', payload).then(r => r.data)
