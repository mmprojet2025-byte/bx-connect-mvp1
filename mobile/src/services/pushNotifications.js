import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from '../api/axios';

const PUSH_TOKEN_STORAGE_KEY = 'bxconnect_expo_push_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function getPushPreferences() {
  const response = await api.get('/push/preferences');
  return response.data;
}

export async function enablePushNotifications() {
  if (Platform.OS === 'web') {
    return { status: 'unsupported' };
  }
  if (!Device.isDevice) {
    return { status: 'physical-device-required' };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'BX-Connect',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#38BDF8',
    });
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  let permissionStatus = existingPermissions.status;

  if (permissionStatus !== 'granted') {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    permissionStatus = requestedPermissions.status;
  }

  if (permissionStatus !== 'granted') {
    return { status: 'denied' };
  }

  const projectId =
    Constants.easConfig?.projectId
    || Constants.expoConfig?.extra?.eas?.projectId;

  if (!projectId) {
    return { status: 'missing-project-id' };
  }

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  const expoPushToken = tokenResult.data;

  const response = await api.post('/push/devices', {
    expoPushToken,
    platform: Platform.OS,
    enabled: true,
  });

  await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, expoPushToken);
  return {
    status: 'enabled',
    token: expoPushToken,
    preferences: response.data,
  };
}

export async function disablePushNotifications() {
  const response = await api.put('/push/preferences', { enabled: false });
  return response.data;
}

export async function unregisterCurrentPushDevice() {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
  if (!token) return;

  try {
    await api.delete(`/push/devices/${encodeURIComponent(token)}`);
  } finally {
    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  }
}
