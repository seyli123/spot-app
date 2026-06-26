import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useTheme, Colors } from '../theme';

interface Props {
  onSignUp: (email: string, password: string, username: string) => Promise<void>;
  onGoToLogin: () => void;
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
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 6, marginLeft: 2 },
  button: {
    backgroundColor: colors.accent, borderRadius: 14,
    paddingVertical: 16, width: '100%', alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 24,
  },
  switchText: { color: colors.textMuted, fontSize: 15 },
  switchLink: { color: colors.accent, fontSize: 15, fontWeight: '700' },
});

export default function SignUpScreen({ onSignUp, onGoToLogin }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    const trimmedUser = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUser || trimmedUser.length < 2) {
      Alert.alert('Choose a username', 'Must be at least 2 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUser)) {
      Alert.alert('Invalid username', 'Only letters, numbers and underscores.');
      return;
    }
    if (!trimmedEmail) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords don\'t match', 'Please make sure both passwords are the same.');
      return;
    }

    setLoading(true);
    try {
      await onSignUp(trimmedEmail, password, trimmedUser);
    } catch (e: any) {
      const code = e?.code;
      if (code === 'auth/email-already-in-use') {
        Alert.alert('Email taken', 'An account with this email already exists. Try logging in.');
      } else if (code === 'auth/invalid-email') {
        Alert.alert('Invalid email', 'Please enter a valid email address.');
      } else if (code === 'auth/weak-password') {
        Alert.alert('Weak password', 'Password must be at least 6 characters.');
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
      setLoading(false);
    }
  }

  const canSubmit = username.trim().length >= 2 && email.trim() && password.length >= 6 && confirmPassword;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.emoji}>📍</Text>
        <Text style={styles.title}>Spot</Text>
        <Text style={styles.subtitle}>Check in with friends around Copenhagen</Text>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input} value={username} onChangeText={setUsername}
            placeholder="e.g. mikkel_cph" placeholderTextColor={colors.textMuted}
            autoCapitalize="none" autoCorrect={false} maxLength={24}
            textContentType="username" autoComplete="username-new"
          />
          <Text style={styles.hint}>Letters, numbers, underscores only</Text>
        </View>

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
            placeholder="At least 6 characters" placeholderTextColor={colors.textMuted}
            secureTextEntry textContentType="newPassword" autoComplete="password-new"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword}
            placeholder="Re-enter your password" placeholderTextColor={colors.textMuted}
            secureTextEntry textContentType="newPassword" autoComplete="password-new"
            onSubmitEditing={handleSignUp} returnKeyType="done"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, (!canSubmit || loading) && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={!canSubmit || loading} activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Already have an account? </Text>
          <TouchableOpacity onPress={onGoToLogin}>
            <Text style={styles.switchLink}>Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
