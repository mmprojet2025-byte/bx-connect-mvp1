import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ IMPORTANT : Sur mobile, localhost = le téléphone lui-même, pas ton Mac.
// Remplace l'IP ci-dessous par l'IP locale de ton Mac.
// Pour trouver ton IP : ipconfig getifaddr en0 dans le terminal Mac.
//
// Exemples :
//   iPhone réel sur Wi-Fi  → 'http://192.168.1.45:8080/api'
//   Simulateur iOS         → 'http://localhost:8080/api'
//   Expo Web (localhost)   → 'http://localhost:8080/api'

const BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// ─── Routes VRAIMENT publiques (sans token JWT) ───────────────────────────────
// ⚠️ CORRECTION : /activites retiré de PUBLIC_ROUTES
// → Le token sera envoyé si disponible, ce qui permet à l'admin de voir
//   toutes les activités. Les visiteurs non connectés n'ont pas de token
//   donc ils voient quand même les activités publiques.
const PUBLIC_ROUTES = ['/auth/login', '/auth/register'];

// ─── Intercepteur requête : ajoute le token JWT si disponible ────────────────
api.interceptors.request.use(
  async (config) => {
    const isPublic = PUBLIC_ROUTES.some(route => config.url?.includes(route));
    if (!isPublic) {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // AsyncStorage indisponible → on continue sans token
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Intercepteur réponse : gère les erreurs 401 (token expiré) ──────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;