import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { User } from '../types';
import { getUser, createUser, updateUserDoc } from '../services/firestore';

const USER_KEY = '@spot_user';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const signingUp = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (signingUp.current) return;

      if (firebaseUser) {
        try {
          const stored = await AsyncStorage.getItem(USER_KEY);
          const local: User | null = stored ? JSON.parse(stored) : null;
          const remote = await getUser(firebaseUser.uid);

          if (remote) {
            const merged = local && local.id === firebaseUser.uid
              ? { ...local, ...remote }
              : remote;
            setUser(merged);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(merged));
          } else if (local && local.id === firebaseUser.uid) {
            setUser(local);
          } else {
            setUser(null);
          }
        } catch (e) {
          console.warn('Failed to load user profile', e);
          setUser(null);
        }
      } else {
        await AsyncStorage.removeItem(USER_KEY);
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    signingUp.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const newUser: User = {
        id: cred.user.uid,
        username,
        email,
        friendIds: [],
        createdAt: Date.now(),
      };
      await createUser(newUser);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
      setUser(newUser);
      setLoading(false);
    } finally {
      signingUp.current = false;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
    await updateUserDoc(user.id, updates);
    setUser(updated);
  }, [user]);

  const logout = useCallback(async () => {
    await signOut(auth);
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const reload = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;
    const remote = await getUser(firebaseUser.uid);
    if (remote) {
      setUser(remote);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(remote));
    }
  }, []);

  return { user, loading, signUp, login, updateUser, logout, resetPassword, reload };
}
