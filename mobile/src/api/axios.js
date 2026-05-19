import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ IMPORTANT : Sur mobile, localhost = le téléphone lui-même, pas ton Mac.
// Remplace l'IP ci-dessous par l'IP locale de ton Mac.
// Pour trouver ton IP : ipconfig getifaddr en0 dans le terminal Mac.
//
// Exemples :
//   iPhone réel sur Wi-Fi  → 'http://192.168.1.45:8080/api'
//   Simulateur iOS         → 'http://localhost:8080/api'  (fonctionne sur simulateur)
//   Expo Web (localhost)   → 'http://localhost:8080/api'

const BASE_URL = 'http://localhost:8080/api'; // ← Change si tu testes sur iPhone réel

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 secondes max
});

// ─── Routes publiques (sans token JWT) ───────────────────────────────────────
const PUBLIC_ROUTES = ['/auth/login', '/auth/register', '/activites'];

// ─── Intercepteur requête : ajoute le token JWT ───────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const isPublic = PUBLIC_ROUTES.some(route => config.url?.includes(route));
    if (!isPublic) {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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
      // Token expiré → vider le stockage local
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;