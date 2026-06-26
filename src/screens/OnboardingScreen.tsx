import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { useTheme, Colors } from '../theme';
import { User } from '../types';

interface Props {
  onComplete: (user: User) => void;
  onLogin: (username: string) => Promise<'ok' | 'not_found' | 'error'>;
}

const createStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: {
    fontSize: 40, fontWeight: '700', color: colors.text, letterSpacing: -1, marginBottom: 8,
  },
  subtitle: {
    fontSize: 16, color: colors.textMuted, textAlign: 'center', marginBottom: 32, lineHeight: 22,
  },
  modeTabs: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12,
    padding: 4, marginBottom: 24, width: '100%',
    borderWidth: 1, borderColor: colors.border,
  },
  modeTab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  modeTabActive: { backgroundColor: colors.accent },
  modeTabText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  modeTabTextActive: { color: '#fff' },
  inputWrapper: { width: '100%', marginBottom: 24 },
  label: {
    color: colors.textSecondary, fontSize: 13, fontWeight: '600',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 17, color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 6, marginLeft: 2 },
  button: {
    backgroundColor: colors.accent, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 48, width: '100%', alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

export default function OnboardingScreen({ onComplete, onLogin }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    const trimmed = username.trim();
    if (!trimmed || trimmed.length < 2) { Alert.alert('Choose a username', 'Must be at least 2 characters.'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) { Alert.alert('Invalid username', 'Only letters, numbers and underscores.'); return; }
    setLoading(true);
    try {
      const id = Crypto.randomUUID();
      onComplete({ id, username: trimmed, friendIds: [], createdAt: Date.now() });
    } catch { Alert.alert('Error', 'Something went wrong. Please try again.'); setLoading(false); }
  }

  async function handleLogin() {
    const trimmed = username.trim();
    if (!trimmed) return;
    setLoading(true);
    const result = await onLogin(trimmed);
    setLoading(false);
    if (result === 'not_found') Alert.alert('Not found', `No account with username "@${trimmed}" exists.`);
    else if (result === 'error') Alert.alert('Error', 'Something went wrong. Please try again.');
  }

  const isSignUp = mode === 'signup';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Text style={styles.emoji}>📍</Text>
        <Text style={styles.title}>Spot</Text>
        <Text style={styles.subtitle}>Check in with friends around Copenhagen</Text>

        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, isSignUp && styles.modeTabActive]}
            onPress={() => { setMode('signup'); setUsername(''); }}
          >
            <Text style={[styles.modeTabText, isSignUp && styles.modeTabTextActive]}>Sign up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, !isSignUp && styles.modeTabActive]}
            onPress={() => { setMode('login'); setUsername(''); }}
          >
            <Text style={[styles.modeTabText, !isSignUp && styles.modeTabTextActive]}>Log in</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>{isSignUp ? 'Pick a username' : 'Your username'}</Text>
          <TextInput
            style={styles.input} value={username} onChangeText={setUsername}
            placeholder={isSignUp ? 'e.g. mikkel_cph' : 'Enter your username'}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none" autoCorrect={false} maxLength={24}
            onSubmitEditing={isSignUp ? handleSignUp : handleLogin} returnKeyType="done"
          />
          {isSignUp && <Text style={styles.hint}>Letters, numbers, underscores only</Text>}
        </View>

        <TouchableOpacity
          style={[styles.button, (!username.trim() || loading) && styles.buttonDisabled]}
          onPress={isSignUp ? handleSignUp : handleLogin}
          disabled={!username.trim() || loading} activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.buttonText}>{isSignUp ? 'Get started' : 'Log in'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
