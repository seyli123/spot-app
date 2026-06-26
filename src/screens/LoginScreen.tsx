import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useTheme, Colors } from '../theme';

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
  onGoToSignUp: () => void;
}

const createStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: {
    fontSize: 40, fontWeight: '700', color: colors.text, letterSpacing: -1, marginBottom: 8,
  },
  subtitle: {
    fontSize: 16, color: colors.textMuted, textAlign: 'center', marginBottom: 36, lineHeight: 22,
  },
  inputWrapper: { width: '100%', marginBottom: 16 },
  label: {
    color: colors.textSecondary, fontSize: 13, fontWeight: '600',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 17, color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 24, marginTop: 4 },
  forgotText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  button: {
    backgroundColor: colors.accent, borderRadius: 14,
    paddingVertical: 16, width: '100%', alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 24,
  },
  switchText: { color: colors.textMuted, fontSize: 15 },
  switchLink: { color: colors.accent, fontSize: 15, fontWeight: '700' },
});

export default function LoginScreen({ onLogin, onResetPassword, onGoToSignUp }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      await onLogin(email.trim(), password);
    } catch (e: any) {
      const code = e?.code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        Alert.alert('Login failed', 'Invalid email or password.');
      } else if (code === 'auth/invalid-email') {
        Alert.alert('Invalid email', 'Please enter a valid email address.');
      } else if (code === 'auth/too-many-requests') {
        Alert.alert('Too many attempts', 'Please try again later.');
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Type your email address above, then tap "Forgot password?" again.');
      return;
    }
    try {
      await onResetPassword(email.trim());
      Alert.alert('Reset email sent', 'Check your inbox for a password reset link.');
    } catch (e: any) {
      const code = e?.code;
      if (code === 'auth/user-not-found') {
        Alert.alert('Not found', 'No account with that email address.');
      } else if (code === 'auth/invalid-email') {
        Alert.alert('Invalid email', 'Please enter a valid email address.');
      } else {
        Alert.alert('Error', 'Could not send reset email. Please try again.');
      }
    }
  }

  const canSubmit = email.trim() && password;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.emoji}>📍</Text>
        <Text style={styles.title}>Spot</Text>
        <Text style={styles.subtitle}>Check in with friends around Copenhagen</Text>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input} value={email} onChangeText={setEmail}
            placeholder="you@example.com" placeholderTextColor={colors.textMuted}
            autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
            textContentType="emailAddress" autoComplete="email"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input} value={password} onChangeText={setPassword}
            placeholder="Enter your password" placeholderTextColor={colors.textMuted}
            secureTextEntry textContentType="password" autoComplete="password"
            onSubmitEditing={handleLogin} returnKeyType="done"
          />
        </View>

        <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, (!canSubmit || loading) && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={!canSubmit || loading} activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.buttonText}>Log in</Text>
          )}
        </TouchableOpacity>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Don't have an account? </Text>
          <TouchableOpacity onPress={onGoToSignUp}>
            <Text style={styles.switchLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
