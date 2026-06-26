import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTheme, Colors, DURATION_LABELS } from '../theme';
import { Spot, Group, Duration, User, CheckIn } from '../types';
import { createCheckIn, deleteCheckIn, deleteSpot, subscribeGroups, getFriends } from '../services/firestore';
import { sendPushNotifications } from '../services/notifications';

interface Props {
  visible: boolean;
  spot: Spot | null;
  user: User;
  activeCheckIn: CheckIn | null;
  onCheckOut: () => Promise<void>;
  onClose: () => void;
}

const DURATIONS: Duration[] = ['30min', '1h', '2h', 'all-day', 'custom'];

function formatRemaining(expiresAt: number): string {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return 'Expired';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m left`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m left` : `${hours}h left`;
}

const createStyles = (colors: Colors) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, backgroundColor: colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  spotEmoji: { fontSize: 36, textAlign: 'center', marginBottom: 6 },
  spotName: {
    fontSize: 22, fontWeight: '700', color: colors.text,
    textAlign: 'center', marginBottom: 20,
  },
  alreadyHereContainer: { alignItems: 'center', paddingBottom: 8 },
  alreadyHereBadge: {
    backgroundColor: `${colors.success}22`,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16,
    borderWidth: 1, borderColor: `${colors.success}44`,
  },
  alreadyHereBadgeText: { color: colors.success, fontSize: 13, fontWeight: '600' },
  headingBadge: {
    backgroundColor: `${colors.warning}22`,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16,
    borderWidth: 1, borderColor: `${colors.warning}44`,
  },
  headingBadgeText: { color: colors.warning, fontSize: 13, fontWeight: '600' },
  currentStatus: {
    color: colors.textSecondary, fontSize: 16,
    fontStyle: 'italic', textAlign: 'center', marginBottom: 12,
  },
  currentMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  metaItem: { color: colors.textSecondary, fontSize: 14 },
  metaDot: { color: colors.textMuted, fontSize: 14 },
  checkOutBtn: {
    backgroundColor: '#E53935', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 48, alignItems: 'center', width: '100%',
  },
  arrivedBtn: {
    backgroundColor: colors.success, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', width: '100%', marginBottom: 10,
  },
  arrivedBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelPreBtn: {
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 12, alignItems: 'center', width: '100%',
  },
  cancelPreBtnText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  checkOutBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchingNote: {
    color: colors.textMuted, fontSize: 12,
    textAlign: 'center', marginBottom: 8, fontStyle: 'italic',
  },
  label: {
    color: colors.textSecondary, fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16,
  },
  input: {
    backgroundColor: colors.background, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  durationScroll: { marginBottom: 4 },
  durationRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  durationBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: colors.background, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  durationBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  durationText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  durationTextActive: { color: '#fff', fontWeight: '700' },
  customTimeRow: {
    flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'center',
  },
  stepperGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepperBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnText: { color: colors.text, fontSize: 18, fontWeight: '600' },
  stepperValue: {
    flexDirection: 'row', alignItems: 'baseline',
    backgroundColor: '#2A2A2A',
    borderWidth: 1, borderColor: '#FF6B6B',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    minWidth: 56, justifyContent: 'center',
  },
  stepperValueText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  stepperUnit: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginLeft: 2 },
  customError: { color: '#E53935', fontSize: 12, marginTop: 6, textAlign: 'center' },
  groupScroll: { marginBottom: 4 },
  groupBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.background, marginRight: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  groupBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  groupText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  groupTextActive: { color: '#fff', fontWeight: '600' },
  confirmBtn: {
    backgroundColor: colors.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  preBtn: {
    borderRadius: 14, borderWidth: 1.5, borderColor: colors.accent,
    paddingVertical: 14, alignItems: 'center', marginTop: 10,
  },
  preBtnText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  confirmText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  deleteSpotBtn: {
    borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 20,
  },
  deleteSpotText: { color: '#E53935', fontSize: 14, fontWeight: '600' },
});

export default function CheckInSheet({ visible, spot, user, activeCheckIn, onCheckOut, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [status, setStatus] = useState('');
  const [duration, setDuration] = useState<Duration>('1h');
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [arriving, setArriving] = useState(false);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(0);
  const customTotalMin = customHours * 60 + customMinutes;

  useEffect(() => {
    if (!visible) return;
    const unsub = subscribeGroups(user.id, (g) => { setGroups(g); });
    return unsub;
  }, [visible, user.id]);

  const alreadyHere = activeCheckIn?.spotId === spot?.id && activeCheckIn?.type !== 'pre';
  const headingHere = activeCheckIn?.spotId === spot?.id && activeCheckIn?.type === 'pre';
  const hasDifferentCheckIn = !!activeCheckIn && !alreadyHere && !headingHere;

  async function handleCheckOut() {
    setCheckingOut(true);
    try { await onCheckOut(); onClose(); }
    catch { Alert.alert('Error', 'Could not check out. Please try again.'); }
    finally { setCheckingOut(false); }
  }

  async function handleArrived() {
    if (!spot || !activeCheckIn) return;
    setArriving(true);
    try {
      await deleteCheckIn(activeCheckIn.id);
      await createCheckIn({
        userId: user.id, spotId: spot.id,
        status: activeCheckIn.status, duration: activeCheckIn.duration,
        groupId: activeCheckIn.groupId, type: 'active',
      });
      const msg = `${user.username} arrived at ${spot.name}${activeCheckIn.status ? ` · ${activeCheckIn.status}` : ''}`;
      if (activeCheckIn.groupId === 'all') {
        if (user.friendIds.length > 0) {
          const friends = await getFriends(user.friendIds);
          const tokens = friends.map((f) => f.pushToken).filter((t): t is string => !!t);
          await sendPushNotifications(tokens, msg);
        }
      } else {
        const group = groups.find((g) => g.id === activeCheckIn.groupId);
        if (group) {
          const memberIds = group.memberIds.filter((id) => id !== user.id);
          const members = await getFriends(memberIds);
          const tokens = members.map((m) => m.pushToken).filter((t): t is string => !!t);
          await sendPushNotifications(tokens, msg);
        }
      }
      onClose();
    } catch { Alert.alert('Error', 'Could not update check-in.'); }
    finally { setArriving(false); }
  }

  function formatCustomLabel(h: number, m: number): string {
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }

  async function handleConfirm(type: 'active' | 'pre' = 'active') {
    if (!spot) return;
    if (duration === 'custom' && customTotalMin < 5) {
      Alert.alert('Invalid duration', 'Minimum custom time is 5 minutes.');
      return;
    }
    setLoading(true);
    try {
      if (activeCheckIn) await deleteCheckIn(activeCheckIn.id);

      const customDurationMs = duration === 'custom' ? customTotalMin * 60 * 1000 : undefined;
      await createCheckIn({
        userId: user.id, spotId: spot.id,
        status: status.trim(), duration, groupId: selectedGroupId, type,
        customDurationMs,
      });

      if (type === 'active') {
        const durationLabel = duration === 'custom'
          ? formatCustomLabel(customHours, customMinutes)
          : DURATION_LABELS[duration];
        const msg = `${user.username} is at ${spot.name} · ${status.trim() || 'hanging out'} · ${durationLabel}`;
        if (selectedGroupId === 'all') {
          if (user.friendIds.length > 0) {
            const friends = await getFriends(user.friendIds);
            const tokens = friends.map((f) => f.pushToken).filter((t): t is string => !!t);
            await sendPushNotifications(tokens, msg);
          }
        } else {
          const group = groups.find((g) => g.id === selectedGroupId);
          if (group) {
            const memberIds = group.memberIds.filter((id) => id !== user.id);
            const members = await getFriends(memberIds);
            const tokens = members.map((m) => m.pushToken).filter((t): t is string => !!t);
            await sendPushNotifications(tokens, msg);
          }
        }
      }

      onClose(); setStatus(''); setDuration('1h'); setSelectedGroupId('all');
      setCustomHours(0); setCustomMinutes(0);
    } catch { Alert.alert('Error', 'Failed to check in. Please try again.'); }
    finally { setLoading(false); }
  }

  function handleDeleteSpot() {
    if (!spot) return;
    Alert.alert(
      'Delete spot',
      `Remove "${spot.name}" from the map? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteSpot(spot.id);
              onClose();
            } catch { Alert.alert('Error', 'Could not delete spot.'); }
          },
        },
      ]
    );
  }

  if (!spot) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.spotEmoji}>{spot.emoji}</Text>
          <Text style={styles.spotName}>{spot.name}</Text>

          {alreadyHere && activeCheckIn ? (
            <View style={styles.alreadyHereContainer}>
              <View style={styles.alreadyHereBadge}>
                <Text style={styles.alreadyHereBadgeText}>You're here now</Text>
              </View>
              {activeCheckIn.status ? (
                <Text style={styles.currentStatus}>"{activeCheckIn.status}"</Text>
              ) : null}
              <View style={styles.currentMeta}>
                <Text style={styles.metaItem}>⏱ {DURATION_LABELS[activeCheckIn.duration]}</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={[styles.metaItem, { color: colors.accent }]}>
                  {formatRemaining(activeCheckIn.expiresAt)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.checkOutBtn, checkingOut && styles.btnDisabled]}
                onPress={handleCheckOut} disabled={checkingOut} activeOpacity={0.8}
              >
                {checkingOut ? <ActivityIndicator color="#fff" /> : <Text style={styles.checkOutBtnText}>Check out</Text>}
              </TouchableOpacity>
            </View>
          ) : headingHere && activeCheckIn ? (
            <View style={styles.alreadyHereContainer}>
              <View style={styles.headingBadge}>
                <Text style={styles.headingBadgeText}>🚶 Heading here</Text>
              </View>
              {activeCheckIn.status ? (
                <Text style={styles.currentStatus}>"{activeCheckIn.status}"</Text>
              ) : null}
              <View style={styles.currentMeta}>
                <Text style={styles.metaItem}>⏱ {DURATION_LABELS[activeCheckIn.duration]}</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={[styles.metaItem, { color: colors.warning }]}>
                  {formatRemaining(activeCheckIn.expiresAt)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.arrivedBtn, arriving && styles.btnDisabled]}
                onPress={handleArrived} disabled={arriving} activeOpacity={0.8}
              >
                {arriving ? <ActivityIndicator color="#fff" /> : <Text style={styles.arrivedBtnText}>I've arrived!</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelPreBtn, checkingOut && styles.btnDisabled]}
                onPress={handleCheckOut} disabled={checkingOut} activeOpacity={0.8}
              >
                {checkingOut ? <ActivityIndicator size="small" color={colors.textMuted} /> : <Text style={styles.cancelPreBtnText}>Cancel pre-check-in</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {hasDifferentCheckIn && (
                <Text style={styles.switchingNote}>
                  {activeCheckIn?.type === 'pre'
                    ? "You'll stop heading to your other spot automatically."
                    : "You'll be checked out of your current spot automatically."}
                </Text>
              )}

              <Text style={styles.label}>What are you up to?</Text>
              <TextInput
                style={styles.input} value={status} onChangeText={setStatus}
                placeholder="Working on a project..." placeholderTextColor={colors.textMuted}
                maxLength={80} returnKeyType="done"
              />

              <Text style={styles.label}>How long?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.durationScroll}>
                <View style={styles.durationRow}>
                  {DURATIONS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.durationBtn, d === duration && styles.durationBtnActive]}
                      onPress={() => setDuration(d)} activeOpacity={0.7}
                    >
                      <Text style={[styles.durationText, d === duration && styles.durationTextActive]}>
                        {d === 'custom'
                          ? (duration === 'custom' && customTotalMin >= 5
                            ? formatCustomLabel(customHours, customMinutes)
                            : 'Custom +')
                          : DURATION_LABELS[d]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              {duration === 'custom' && (
                <>
                  <View style={styles.customTimeRow}>
                    <View style={styles.stepperGroup}>
                      <TouchableOpacity style={styles.stepperBtn} onPress={() => setCustomHours(Math.max(0, customHours - 1))} activeOpacity={0.7}>
                        <Text style={styles.stepperBtnText}>−</Text>
                      </TouchableOpacity>
                      <View style={styles.stepperValue}>
                        <Text style={styles.stepperValueText}>{customHours}</Text>
                        <Text style={styles.stepperUnit}>h</Text>
                      </View>
                      <TouchableOpacity style={styles.stepperBtn} onPress={() => { const h = Math.min(12, customHours + 1); setCustomHours(h); if (h === 12) setCustomMinutes(0); }} activeOpacity={0.7}>
                        <Text style={styles.stepperBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.stepperGroup}>
                      <TouchableOpacity style={styles.stepperBtn} onPress={() => { if (customHours < 12) setCustomMinutes(Math.max(0, customMinutes - 5)); }} activeOpacity={0.7}>
                        <Text style={styles.stepperBtnText}>−</Text>
                      </TouchableOpacity>
                      <View style={styles.stepperValue}>
                        <Text style={styles.stepperValueText}>{customMinutes}</Text>
                        <Text style={styles.stepperUnit}>m</Text>
                      </View>
                      <TouchableOpacity style={styles.stepperBtn} onPress={() => { if (customHours < 12) setCustomMinutes(Math.min(55, customMinutes + 5)); }} activeOpacity={0.7}>
                        <Text style={styles.stepperBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {customTotalMin > 0 && customTotalMin < 5 && (
                    <Text style={styles.customError}>Minimum 5 minutes</Text>
                  )}
                </>
              )}

              <Text style={styles.label}>Notify</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupScroll}>
                <TouchableOpacity
                  style={[styles.groupBtn, selectedGroupId === 'all' && styles.groupBtnActive]}
                  onPress={() => setSelectedGroupId('all')} activeOpacity={0.7}
                >
                  <Text style={[styles.groupText, selectedGroupId === 'all' && styles.groupTextActive]}>
                    All friends
                  </Text>
                </TouchableOpacity>
                {groups.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.groupBtn, g.id === selectedGroupId && styles.groupBtnActive]}
                    onPress={() => setSelectedGroupId(g.id)} activeOpacity={0.7}
                  >
                    <Text style={[styles.groupText, g.id === selectedGroupId && styles.groupTextActive]}>
                      {g.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[styles.confirmBtn, loading && styles.btnDisabled]}
                onPress={() => handleConfirm('active')} disabled={loading} activeOpacity={0.8}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Check in</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.preBtn, loading && styles.btnDisabled]}
                onPress={() => handleConfirm('pre')} disabled={loading} activeOpacity={0.8}
              >
                <Text style={styles.preBtnText}>I'm heading there</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.deleteSpotBtn} onPress={handleDeleteSpot} activeOpacity={0.8}>
            <Text style={styles.deleteSpotText}>🗑 Delete this spot</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
