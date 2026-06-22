import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { clearStoredAuth, getStoredToken } from '../services/secureAuthStorage';

function getApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  if (Platform.OS === 'web') {
    return 'http://localhost:8080/api';
  }

  const expoHost = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost;
  const host = expoHost?.split(':')[0];
  return host ? `http://${host}:8080/api` : 'http://localhost:8080/api';
}

const BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

const PUBLIC_ROUTES = ['/auth/login', '/auth/register'];
const unauthorizedListeners = new Set();

export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

api.interceptors.request.use(
  async (config) => {
    const isPublic = PUBLIC_ROUTES.some(route => config.url?.includes(route));
    if (!isPublic && !config.skipAuth) {
      try {
        const token = await getStoredToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
      } catch { /* continuer sans token */ }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isPublic = error.config?.skipAuth
      || PUBLIC_ROUTES.some(route => error.config?.url?.includes(route));
    if (error.response?.status === 401 && !isPublic) {
      await clearStoredAuth();
      unauthorizedListeners.forEach(listener => listener());
    }
    return Promise.reject(error);
  }
);

export default api;
