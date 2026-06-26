import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';

const AUTH_KEY = '@spot_auth';

interface AuthResult {
  uid: string;
  email: string;
  refreshToken: string;
}

interface StoredAuth {
  uid: string;
  refreshToken: string;
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${AUTH_URL}:signUp?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (data.error) throw makeAuthError(data.error.message);
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ uid: data.localId, refreshToken: data.refreshToken }));
  return { uid: data.localId, email: data.email, refreshToken: data.refreshToken };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${AUTH_URL}:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (data.error) throw makeAuthError(data.error.message);
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ uid: data.localId, refreshToken: data.refreshToken }));
  return { uid: data.localId, email: data.email, refreshToken: data.refreshToken };
}

export async function sendPasswordReset(email: string): Promise<void> {
  const res = await fetch(`${AUTH_URL}:sendOobCode?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
  });
  const data = await res.json();
  if (data.error) throw makeAuthError(data.error.message);
}

export async function getStoredAuth(): Promise<StoredAuth | null> {
  const raw = await AsyncStorage.getItem(AUTH_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearStoredAuth(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
}

function makeAuthError(message: string): Error & { code: string } {
  const key = message.split(':')[0].trim();
  const codeMap: Record<string, string> = {
    EMAIL_EXISTS: 'auth/email-already-in-use',
    INVALID_EMAIL: 'auth/invalid-email',
    WEAK_PASSWORD: 'auth/weak-password',
    EMAIL_NOT_FOUND: 'auth/user-not-found',
    INVALID_PASSWORD: 'auth/wrong-password',
    USER_DISABLED: 'auth/user-disabled',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'auth/too-many-requests',
    INVALID_LOGIN_CREDENTIALS: 'auth/invalid-credential',
  };
  const err = new Error(message) as Error & { code: string };
  err.code = codeMap[key] ?? 'auth/unknown';
  return err;
}
