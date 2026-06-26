import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { useTheme, Colors, DURATION_LABELS } from '../theme';
import { CheckInWithUser, Spot, User } from '../types';
import Avatar from './Avatar';
import { upsertOnMyWay, getOnMyWay, getUser, subscribeOnMyWayToCheckin } from '../services/firestore';
import { sendPushNotifications } from '../services/notifications';
import { OnMyWay } from '../types';

interface Props {
  visible: boolean;
  checkin: CheckInWithUser | null;
  spot: Spot | null;
  currentUser: User;
  onClose: () => void;
}

const CORAL = '#FF6B6B';
const ETA_OPTIONS = [5, 10, 15] as const;

function formatRemaining(expiresAt: number): string {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return 'Expired';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m left`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m left` : `${hours}h left`;
}

function formatTimeAgo(ts: number): string {
  const ms = Date.now() - ts;
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatArrival(expiresAt: number): string {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return 'Should be there by now';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `~${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `~${hours}h ${rem}m` : `~${hours}h`;
}

const createStyles = (colors: Colors) => StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    position: 'absolute',
    bottom: 100, left: 20, right: 20,
    maxHeight: '78%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 16,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16, zIndex: 10,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  scrollContent: {
    alignItems: 'center',
    padding: 24,
  },
  avatarCircle: {
    marginBottom: 12,
    borderWidth: 3, borderColor: colors.background,
  },
  username: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  preStatusPill: {
    backgroundColor: '#F59E0B22', borderWidth: 1, borderColor: '#F59E0B',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8,
  },
  preStatusPillText: { color: '#F59E0B', fontSize: 12, fontWeight: '700' },
  arrivalBadge: {
    color: '#F59E0B', fontSize: 12, fontWeight: '600',
    backgroundColor: '#F59E0B22',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10, overflow: 'hidden',
  },
  spotRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  spotEmoji: { fontSize: 22 },
  spotName: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, width: '100%', marginBottom: 16 },
  detailRows: { width: '100%', gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  detailText: { flex: 1, color: colors.textSecondary, fontSize: 14 },
  detailBadge: {
    color: colors.accent, fontSize: 12, fontWeight: '600',
    backgroundColor: `${colors.accent}22`,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10, overflow: 'hidden',
  },
  onTheirWayHeader: {
    color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 4,
  },
  comingSeparator: {
    height: 1, backgroundColor: colors.border, width: '100%', marginTop: 20, marginBottom: 16,
  },
  comingBtn: {
    width: '100%', height: 52,
    backgroundColor: CORAL, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: CORAL, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  comingBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },
  pillsRow: {
    flexDirection: 'row', gap: 10, justifyContent: 'center',
    paddingTop: 2,
  },
  confirmedBtn: {
    width: '100%', height: 52,
    backgroundColor: '#4CAF5022', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#4CAF50',
  },
  confirmedText: { color: '#4CAF50', fontSize: 14, fontWeight: '700' },
});

function PillButton({ minutes, selected, onPress, disabled }: {
  minutes: number;
  selected: boolean;
  onPress: (m: number) => void;
  disabled: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.14, useNativeDriver: true, friction: 4, tension: 200 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 200 }),
    ]).start();
    onPress(minutes);
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={{
          paddingHorizontal: 20, paddingVertical: 10,
          borderRadius: 20, borderWidth: 1.5, borderColor: CORAL,
          backgroundColor: selected ? CORAL : '#2A2A2A',
        }}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{minutes} min</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function CheckInDetailModal({ visible, checkin, spot, currentUser, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [, setTick] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'picking' | 'confirmed'>('idle');
  const [selectedEta, setSelectedEta] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [incomingFriends, setIncomingFriends] = useState<OnMyWay[]>([]);

  const pillsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!visible || !checkin || checkin.userId === currentUser.id || checkin.type === 'pre') {
      setPhase('idle');
      setSelectedEta(null);
      setSending(false);
      pillsAnim.setValue(0);
      return;
    }
    let cancelled = false;
    getOnMyWay(currentUser.id, checkin.id).then((existing) => {
      if (cancelled) return;
      if (existing) {
        setSelectedEta(existing.etaMinutes);
        setPhase('confirmed');
      } else {
        setPhase('idle');
        setSelectedEta(null);
        pillsAnim.setValue(0);
      }
    });
    return () => { cancelled = true; };
  }, [visible, checkin?.id, currentUser.id]);

  useEffect(() => {
    if (!visible || !checkin) {
      setIncomingFriends([]);
      return;
    }
    return subscribeOnMyWayToCheckin(checkin.id, setIncomingFriends);
  }, [visible, checkin?.id]);

  if (!checkin || !spot) return null;

  const isSelf = checkin.userId === currentUser.id;
  const showComing = !isSelf && checkin.type !== 'pre';
  const displayName = checkin.username ?? '?';
  const isPre = checkin.type === 'pre';
  const avatarColor = isPre ? '#FF9500' : (isSelf ? colors.success : colors.accent);

  function handleMainBtnPress() {
    if (phase === 'picking') {
      Animated.timing(pillsAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
      setPhase('idle');
    } else if (phase === 'idle') {
      Animated.timing(pillsAnim, { toValue: 1, duration: 220, useNativeDriver: false }).start();
      setPhase('picking');
    }
  }

  async function handlePillSelect(minutes: number) {
    if (sending) return;
    setSelectedEta(minutes);
    setSending(true);
    try {
      await upsertOnMyWay({
        fromUserId: currentUser.id,
        fromUsername: currentUser.username,
        toUserId: checkin!.userId,
        checkinId: checkin!.id,
        spotId: spot!.id,
        etaMinutes: minutes,
        createdAt: Date.now(),
      });
      const target = await getUser(checkin!.userId);
      if (target?.pushToken) {
        await sendPushNotifications(
          [target.pushToken],
          `${currentUser.username} is on their way · ETA ~${minutes} min`,
          "Someone's coming! 🚲"
        );
      }
      Animated.timing(pillsAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
      setPhase('confirmed');
    } catch {
      Alert.alert('Error', 'Could not send. Try again.');
      setSelectedEta(null);
    } finally {
      setSending(false);
    }
  }

  const pillsHeight = pillsAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 52] });

  return (
    <Modal visible={visible} animationType="fade" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.card}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Avatar
            username={displayName} photoBase64={checkin.photoBase64}
            size={64} color={avatarColor} style={styles.avatarCircle}
          />
          <Text style={styles.username}>@{displayName}{isSelf ? ' (you)' : ''}</Text>
          {isPre && (
            <View style={styles.preStatusPill}>
              <Text style={styles.preStatusPillText}>On the way</Text>
            </View>
          )}
          <View style={styles.spotRow}>
            <Text style={styles.spotEmoji}>{spot.emoji}</Text>
            <Text style={styles.spotName}>{spot.name}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRows}>
            {checkin.status ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>💬</Text>
                <Text style={styles.detailText}>{checkin.status}</Text>
              </View>
            ) : null}
            {isPre ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>🚶</Text>
                <Text style={styles.detailText}>Heading there</Text>
                <Text style={styles.arrivalBadge}>{formatArrival(checkin.expiresAt)}</Text>
              </View>
            ) : (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>⏱</Text>
                  <Text style={styles.detailText}>{DURATION_LABELS[checkin.duration]}</Text>
                  <Text style={styles.detailBadge}>{formatRemaining(checkin.expiresAt)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>🕐</Text>
                  <Text style={styles.detailText}>Checked in {formatTimeAgo(checkin.createdAt)}</Text>
                </View>
              </>
            )}
          </View>

          {incomingFriends.filter((f) => f.fromUserId !== currentUser.id).length > 0 && (
            <>
              <View style={styles.comingSeparator} />
              <View style={styles.detailRows}>
                <Text style={styles.onTheirWayHeader}>On their way</Text>
                {incomingFriends
                  .filter((f) => f.fromUserId !== currentUser.id)
                  .map((omw) => (
                    <View key={omw.id} style={styles.detailRow}>
                      <Text style={styles.detailIcon}>🚲</Text>
                      <Text style={styles.detailText}>{omw.fromUsername}</Text>
                      <Text style={styles.detailBadge}>{omw.etaMinutes} min</Text>
                    </View>
                  ))}
              </View>
            </>
          )}

          {showComing && (
            <>
              <View style={styles.comingSeparator} />
              {phase === 'confirmed' ? (
                <View style={styles.confirmedBtn}>
                  <Text style={styles.confirmedText}>✅ On my way · {selectedEta} min</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.comingBtn}
                    onPress={handleMainBtnPress}
                    activeOpacity={0.85}
                    disabled={sending}
                  >
                    <Text style={styles.comingBtnText}>🚲  Coming!</Text>
                  </TouchableOpacity>
                  <Animated.View style={{ opacity: pillsAnim, height: pillsHeight, overflow: 'hidden' }}>
                    <View style={styles.pillsRow}>
                      {ETA_OPTIONS.map((mins) => (
                        <PillButton
                          key={mins}
                          minutes={mins}
                          selected={selectedEta === mins}
                          onPress={handlePillSelect}
                          disabled={sending}
                        />
                      ))}
                    </View>
                  </Animated.View>
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
