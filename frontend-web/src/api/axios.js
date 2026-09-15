import axios from 'axios'
import { captureApiError } from '../monitoring/captureApiError.js'
import { shouldCloseSession } from './sessionPolicy.js'

// URL API depuis variable d'environnement Vite
// Creer .env.local avec : VITE_API_BASE_URL=http://localhost:8080/api
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
]
const unauthorizedListeners = new Set()

export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

api.interceptors.request.use(
  (config) => {
    const isPublic = PUBLIC_ROUTES.some(route => config.url?.includes(route))
    if (!isPublic) {
      const token = localStorage.getItem('token')
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const isNetworkError = !error.response && error.code !== 'ERR_CANCELED' && error.name !== 'CanceledError'
    const isServerError = status >= 500

    if (isNetworkError || isServerError) {
      captureApiError(error, isNetworkError ? 'network_error' : 'http_5xx_error')
    }

    const isPublicRequest = PUBLIC_ROUTES.some(route => error.config?.url?.includes(route))
    const hadStoredSession = Boolean(localStorage.getItem('token'))
    if (shouldCloseSession({
      status: error.response?.status,
      isPublicRequest,
      hadStoredSession,
    })) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      unauthorizedListeners.forEach(listener => listener())
    }
    return Promise.reject(error)
  }
)

export default api
