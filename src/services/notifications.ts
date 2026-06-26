import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { updatePushToken } from './firestore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Notifications] Skipping: not a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission not granted');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  try {
    // projectId is required for standalone builds; in Expo Go it can be inferred
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;
    console.log('[Notifications] Push token obtained:', token);
    await updatePushToken(userId, token);
    return token;
  } catch (e) {
    console.warn('[Notifications] Failed to get push token:', e);
    return null;
  }
}

export async function sendPushNotifications(
  pushTokens: string[],
  message: string,
  title = 'Spot'
): Promise<void> {
  const validTokens = pushTokens.filter(
    (t) => typeof t === 'string' && t.startsWith('ExponentPushToken')
  );

  if (validTokens.length === 0) {
    console.log('[Notifications] No valid push tokens to send to');
    return;
  }

  console.log(`[Notifications] Sending to ${validTokens.length} token(s):`, message);

  const messages = validTokens.map((to) => ({
    to,
    sound: 'default',
    title,
    body: message,
    data: {},
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    const result = await response.json();
    console.log('[Notifications] Push API response:', JSON.stringify(result));
  } catch (e) {
    console.warn('[Notifications] Push API call failed:', e);
  }
}
