import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { getUser, createUser, updateUserDoc, searchUsers } from '../services/firestore';

const USER_KEY = '@spot_user';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const stored = await AsyncStorage.getItem(USER_KEY);
      if (stored) {
        const parsed: User = JSON.parse(stored);
        const remote = await getUser(parsed.id);
        const merged: User = remote ? { ...parsed, ...remote } : parsed;
        setUser(merged);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(merged));
      }
    } catch (e) {
      console.warn('Failed to load user', e);
    } finally {
      setLoading(false);
    }
  }

  const saveUser = useCallback(async (newUser: User) => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
    await createUser(newUser);
    setUser(newUser);
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
    await updateUserDoc(user.id, updates);
    setUser(updated);
  }, [user]);

  // Restore an existing account by username (no Firestore write)
  const loginWithUsername = useCallback(async (username: string): Promise<'ok' | 'not_found' | 'error'> => {
    try {
      const results = await searchUsers(username.trim());
      const found = results.find((u) => u.username === username.trim());
      if (!found) return 'not_found';
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(found));
      setUser(found);
      return 'ok';
    } catch {
      return 'error';
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  return { user, loading, saveUser, updateUser, loginWithUsername, logout, reload: loadUser };
}
