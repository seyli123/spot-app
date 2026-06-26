import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey: extra.firebaseApiKey ?? 'AIzaSyB2hw_NFC-dbHNc2Z2mAxRe1MmOLRKXDgA',
  authDomain: extra.firebaseAuthDomain ?? 'spot-app-c8071.firebaseapp.com',
  projectId: extra.firebaseProjectId ?? 'spot-app-c8071',
  storageBucket: extra.firebaseStorageBucket ?? 'spot-app-c8071.firebasestorage.app',
  messagingSenderId: extra.firebaseMessagingSenderId ?? '566320353738',
  appId: extra.firebaseAppId ?? '1:566320353738:web:b7e2e2bcd81276d6d23f33',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
