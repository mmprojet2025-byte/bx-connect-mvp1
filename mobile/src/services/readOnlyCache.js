import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'bxconnect_readonly_cache:';

export async function saveReadOnlyCache(key, data) {
  try {
    await AsyncStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        data,
      }),
    );
  } catch {
    // Cache is best effort and must never block the main API flow.
  }
}

export async function getReadOnlyCache(key) {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.data) ? parsed.data : null;
  } catch {
    return null;
  }
}
