import axios from 'axios'

// URL API depuis variable d'environnement Vite
// Creer .env.local avec : VITE_API_BASE_URL=http://localhost:8080/api
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

const PUBLIC_ROUTES = ['/auth/login', '/auth/register']

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
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
