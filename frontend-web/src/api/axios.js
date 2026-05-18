import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Routes qui ne doivent PAS recevoir le token JWT
const PUBLIC_ROUTES = ['/auth/login', '/auth/register']

// Intercepteur : ajoute le token JWT seulement sur les routes privées
api.interceptors.request.use(
  (config) => {
    const isPublic = PUBLIC_ROUTES.some(route => config.url?.includes(route))
    if (!isPublic) {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Intercepteur : gère les erreurs 401 (token expiré)
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