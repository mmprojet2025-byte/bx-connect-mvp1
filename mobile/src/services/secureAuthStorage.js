import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const useSecureStore = Platform.OS !== 'web';

async function readTokenFromSecureStorage() {
  if (useSecureStore) {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function writeTokenToSecureStorage(token) {
  if (useSecureStore) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

async function deleteTokenFromSecureStorage() {
  if (useSecureStore) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getStoredToken() {
  const token = await readTokenFromSecureStorage();
  if (token || !useSecureStore) return token;

  const legacyToken = await AsyncStorage.getItem(TOKEN_KEY);
  if (legacyToken) {
    await writeTokenToSecureStorage(legacyToken);
  }
  return legacyToken;
}

export async function setStoredToken(token) {
  if (!token) {
    await deleteTokenFromSecureStorage();
    return;
  }
  await writeTokenToSecureStorage(token);
}

export async function getStoredUser() {
  return AsyncStorage.getItem(USER_KEY);
}

export async function setStoredUser(userData) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
}

export async function clearStoredAuth() {
  await Promise.all([
    deleteTokenFromSecureStorage(),
    AsyncStorage.removeItem(USER_KEY),
  ]);
}
