import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, Animated, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, Colors, darkColors, lightColors, ThemeName } from '../theme';
import { User } from '../types';
import { getUserStats } from '../services/firestore';
import Avatar from '../components/Avatar';

interface Props {
  user: User;
  onUserUpdate: (updates: Partial<User>) => void;
  onLogout: () => void;
}

interface Stats { checkins: number; spots: number }

function formatMemberSince(ts?: number): string {
  if (!ts) return 'Unknown';
  return new Date(ts).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const createStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 20 },
  card: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  avatarWrapper: { position: 'relative', marginBottom: 16 },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center',
  },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  cameraIcon: { fontSize: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  displayName: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center' },
  editPencil: { fontSize: 14, color: colors.textMuted },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, width: '100%' },
  nameInput: {
    flex: 1, backgroundColor: colors.background, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 17, color: colors.text,
    borderWidth: 1, borderColor: colors.accent, fontWeight: '600',
  },
  saveNameBtn: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  saveNameText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelNameBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelNameText: { color: colors.textMuted, fontSize: 13 },
  usernameHandle: { fontSize: 15, color: colors.textMuted, marginBottom: 4 },
  memberSince: { fontSize: 13, color: colors.textMuted },
  statsCard: { flexDirection: 'row', paddingVertical: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: '700', color: colors.accent, marginBottom: 2 },
  statLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  statDivider: { width: 1, height: 40, backgroundColor: colors.border, alignSelf: 'center' },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, alignSelf: 'flex-start', marginBottom: 12,
  },
  // Appearance section
  themeRow: { flexDirection: 'row', gap: 12, width: '100%' },
  themeCard: {
    flex: 1, borderRadius: 12, overflow: 'hidden',
    borderWidth: 2, borderColor: colors.border,
  },
  themeCardSelected: { borderColor: colors.accent },
  themePreviewBg: { height: 72, padding: 10, justifyContent: 'center', alignItems: 'center' },
  themePreviewCard: {
    width: '80%', borderRadius: 8, padding: 8,
    borderWidth: 1, gap: 4,
  },
  themePreviewDot: { width: 16, height: 16, borderRadius: 8 },
  themePreviewLine: { height: 4, borderRadius: 2, width: '100%' },
  themeLabelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  themeLabel: { fontSize: 13, fontWeight: '600' },
  themeCheck: { fontSize: 14, fontWeight: '700' },
  // Info rows
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  infoLabel: { color: colors.textSecondary, fontSize: 14 },
  infoValue: { color: colors.textMuted, fontSize: 13, maxWidth: '55%', textAlign: 'right' },
  logoutBtn: {
    borderWidth: 1.5, borderColor: colors.accent, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  logoutText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  toast: {
    position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 24,
    alignSelf: 'center', backgroundColor: colors.success,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  toastText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

function Toast({ show, colors }: { show: boolean; colors: Colors }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (show) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(1400),
        Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    }
  }, [show]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Text style={styles.toastText}>✓ Saved</Text>
    </Animated.View>
  );
}

export default function ProfileScreen({ user, onUserUpdate, onLogout }: Props) {
  const { colors, theme, setTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [nickname, setNickname] = useState(user.nickname ?? '');
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => { getUserStats(user.id).then(setStats).catch(() => {}); }, [user.id]);
  useEffect(() => { setNickname(user.nickname ?? ''); }, [user.nickname]);

  async function handlePickPhoto() {
    Alert.alert('Profile photo', 'Choose source', [
      {
        text: 'Camera',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (perm.status !== 'granted') { Alert.alert('Permission needed', 'Camera access is required.'); return; }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.4, base64: true });
          if (!result.canceled && result.assets[0]?.base64) await doUpload(result.assets[0].base64);
        },
      },
      {
        text: 'Photo library',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (perm.status !== 'granted') { Alert.alert('Permission needed', 'Photo library access is required.'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.4, base64: true });
          if (!result.canceled && result.assets[0]?.base64) await doUpload(result.assets[0].base64);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function doUpload(base64: string) {
    setUploadingPhoto(true);
    try { await onUserUpdate({ photoBase64: base64 }); }
    catch { Alert.alert('Error', 'Could not save photo. Please try again.'); }
    finally { setUploadingPhoto(false); }
  }

  async function handleSaveName() {
    const trimmed = nickname.trim();
    setSavingName(true);
    try {
      await onUserUpdate({ nickname: trimmed || undefined });
      setEditingName(false);
      setShowToast(false);
      setTimeout(() => setShowToast(true), 50);
    } catch { Alert.alert('Error', 'Could not save name.'); }
    finally { setSavingName(false); }
  }

  function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: onLogout },
    ]);
  }

  const displayName = user.nickname || user.username;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Profile</Text>

        {/* Avatar + name */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickPhoto} disabled={uploadingPhoto} activeOpacity={0.85}>
            {uploadingPhoto ? (
              <View style={styles.avatarPlaceholder}><ActivityIndicator color={colors.accent} /></View>
            ) : (
              <Avatar username={displayName} photoBase64={user.photoBase64} size={96} color={colors.accent} />
            )}
            <View style={styles.cameraOverlay}><Text style={styles.cameraIcon}>📷</Text></View>
          </TouchableOpacity>

          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={styles.nameInput} value={nickname} onChangeText={setNickname}
                autoFocus maxLength={32} placeholder="Display name" placeholderTextColor={colors.textMuted}
                returnKeyType="done" onSubmitEditing={handleSaveName}
              />
              <TouchableOpacity style={styles.saveNameBtn} onPress={handleSaveName} disabled={savingName}>
                {savingName ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveNameText}>Save</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelNameBtn} onPress={() => { setEditingName(false); setNickname(user.nickname ?? ''); }}>
                <Text style={styles.cancelNameText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingName(true)} activeOpacity={0.7}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName}>{displayName}</Text>
                <Text style={styles.editPencil}>✎</Text>
              </View>
            </TouchableOpacity>
          )}

          <Text style={styles.usernameHandle}>@{user.username}</Text>
          <Text style={styles.memberSince}>Member since {formatMemberSince(user.createdAt)}</Text>
        </View>

        {/* Stats */}
        <View style={[styles.card, styles.statsCard]}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.friendIds.length}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats?.checkins ?? '—'}</Text>
            <Text style={styles.statLabel}>Check-ins</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats?.spots ?? '—'}</Text>
            <Text style={styles.statLabel}>Spots</Text>
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.themeRow}>
            {(['dark', 'light'] as ThemeName[]).map((t) => {
              const tc = t === 'dark' ? darkColors : lightColors;
              const selected = theme === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.themeCard, selected && styles.themeCardSelected]}
                  onPress={() => setTheme(t)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.themePreviewBg, { backgroundColor: tc.background }]}>
                    <View style={[styles.themePreviewCard, { backgroundColor: tc.surface, borderColor: tc.border }]}>
                      <View style={[styles.themePreviewDot, { backgroundColor: tc.accent }]} />
                      <View style={[styles.themePreviewLine, { backgroundColor: tc.textMuted }]} />
                      <View style={[styles.themePreviewLine, { backgroundColor: tc.border, width: '60%' }]} />
                    </View>
                  </View>
                  <View style={styles.themeLabelRow}>
                    <Text style={[styles.themeLabel, { color: colors.text }]}>
                      {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
                    </Text>
                    {selected && <Text style={[styles.themeCheck, { color: colors.accent }]}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Account */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">{user.id}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Push token</Text>
            <Text style={styles.infoValue}>{user.pushToken ? '✓ Active' : 'Not registered'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>
      <Toast show={showToast} colors={colors} />
    </SafeAreaView>
  );
}
