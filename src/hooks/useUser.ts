import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { getUser, createUser, updateUserDoc } from '../services/firestore';
import {
  signUpWithEmail,
  signInWithEmail,
  sendPasswordReset,
  getStoredAuth,
  clearStoredAuth,
} from '../services/auth';

const USER_KEY = '@spot_user';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const [storedUser, storedAuth] = await Promise.all([
        AsyncStorage.getItem(USER_KEY),
        getStoredAuth(),
      ]);

      if (storedUser && storedAuth) {
        const parsed: User = JSON.parse(storedUser);
        if (parsed.id === storedAuth.uid) {
          const remote = await getUser(parsed.id);
          const merged: User = remote ? { ...parsed, ...remote } : parsed;
          setUser(merged);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(merged));
        } else {
          await Promise.all([AsyncStorage.removeItem(USER_KEY), clearStoredAuth()]);
        }
      } else if (storedUser || storedAuth) {
        await Promise.all([AsyncStorage.removeItem(USER_KEY), clearStoredAuth()]);
      }
    } catch (e) {
      console.warn('Failed to load user', e);
    } finally {
      setLoading(false);
    }
  }

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    const result = await signUpWithEmail(email, password);
    const newUser: User = {
      id: result.uid,
      username,
      email,
      friendIds: [],
      createdAt: Date.now(),
    };
    await createUser(newUser);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setUser(newUser);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await signInWithEmail(email, password);
    const remote = await getUser(result.uid);
    if (!remote) {
      const err = new Error('User profile not found') as Error & { code: string };
      err.code = 'auth/user-not-found';
      throw err;
    }
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(remote));
    setUser(remote);
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
    await updateUserDoc(user.id, updates);
    setUser(updated);
  }, [user]);

  const logout = useCallback(async () => {
    await Promise.all([AsyncStorage.removeItem(USER_KEY), clearStoredAuth()]);
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordReset(email);
  }, []);

  const reload = useCallback(async () => {
    const storedAuth = await getStoredAuth();
    if (!storedAuth) return;
    const remote = await getUser(storedAuth.uid);
    if (remote) {
      setUser(remote);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(remote));
    }
  }, []);

  return { user, loading, signUp, login, updateUser, logout, resetPassword, reload };
}
