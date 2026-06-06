import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onUnauthorized } from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loading, setLoading] = useState(true); // ← vrai pendant le chargement initial

  // ─── Charger le token et le user depuis AsyncStorage au démarrage ──────────
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('token');
        const savedUser  = await AsyncStorage.getItem('user');
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        // En cas d'erreur de lecture, on vide le stockage
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  useEffect(() => onUnauthorized(() => {
    setToken(null);
    setUser(null);
    setSessionExpired(true);
  }), []);

  // ─── Login : appelé après /api/auth/login ─────────────────────────────────
  const login = async (newToken, userData) => {
    setSessionExpired(false);
    setToken(newToken);
    setUser(userData);
    await AsyncStorage.setItem('token', newToken);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  };

  // ─── Logout : vide tout ───────────────────────────────────────────────────
  const logout = async () => {
    setSessionExpired(false);
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove(['token', 'user']);
  };

  // ─── Helpers de rôle ──────────────────────────────────────────────────────
  const isAuthenticated = !!token && !!user;
  const role            = user?.role || null;
  const isMembre        = role === 'MEMBRE';
  const isReferent      = role === 'REFERENT';
  const isAdmin         = role === 'ADMIN';
  const isSuperAdmin    = role === 'SUPER_ADMIN';
  const isPartenaire    = role === 'PARTENAIRE';

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      sessionExpired,
      login,
      logout,
      isAuthenticated,
      role,
      isMembre,
      isReferent,
      isAdmin,
      isSuperAdmin,
      isPartenaire,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
