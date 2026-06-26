import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { useTheme, Colors, COPENHAGEN, DARK_MAP_STYLE } from '../theme';
import { Spot, CheckIn, CheckInWithUser, User, Group } from '../types';
import {
  subscribeSpots, subscribeActiveCheckins, subscribeGroups,
  deleteCheckIn, createCheckIn, getGroup, getUser, getFriends,
  subscribeMyOnMyWay,
  subscribeIncomingOnMyWay,
} from '../services/firestore';
import { sendPushNotifications } from '../services/notifications';
import CheckInSheet from '../components/CheckInSheet';
import AddSpotSheet from '../components/AddSpotSheet';
import CheckInDetailModal from '../components/CheckInDetailModal';
import Avatar from '../components/Avatar';

interface Props { user: User }

const BANNER_LIFT = 76;

const createStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { flex: 1 },
  markerContainer: { alignItems: 'center' },
  markerBubble: {
    backgroundColor: colors.surface, borderRadius: 20, width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
  },
  markerEmoji: { fontSize: 22 },
  markerTail: {
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: colors.border, marginTop: -1,
  },
  bubbleWrapper: {
    width: 80, height: 80, alignItems: 'center', justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 54, height: 54, borderRadius: 27,
    borderWidth: 2.5, borderColor: '#FF6B6B',
  },
  bubbleFrame: {
    width: 54, height: 54, borderRadius: 27, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  bubbleFrameActive: {
    borderColor: '#FF6B6B',
    shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
  },
  bubbleFrameSelf: {
    borderColor: colors.success,
    shadowColor: colors.success, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
  },
  bubbleFramePre: {
    borderColor: '#FF9500', opacity: 0.65,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
  },
  bubbleFramePreSelf: {
    borderColor: '#FF9500', opacity: 0.75,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
  },
  badgeContainer: {
    position: 'absolute', bottom: 6, right: 4,
  },
  carEmoji: {
    fontSize: 13, lineHeight: 15,
  },
  countCircle: {
    position: 'absolute', top: -5, right: -7,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#FF6B6B',
    alignItems: 'center', justifyContent: 'center',
  },
  countText: {
    color: '#fff', fontSize: 11, fontWeight: '700', lineHeight: 13,
  },
  spotLabel: {
    marginTop: 3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
    maxWidth: 100,
  },
  spotLabelText: {
    color: '#fff', fontSize: 10, fontWeight: '600',
  },
  filterBar: {
    position: 'absolute', top: Constants.statusBarHeight + 12, left: 0, right: 0,
    paddingHorizontal: 12,
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.surface, marginRight: 8,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 3, elevation: 3,
  },
  filterChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  banner: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 18,
    paddingVertical: 10, paddingLeft: 14, paddingRight: 10,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 10,
  },
  bannerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerEmoji: { fontSize: 22 },
  bannerText: { flex: 1 },
  bannerSpot: { color: colors.text, fontSize: 14, fontWeight: '700' },
  bannerStatus: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  bannerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerCheckOutBtn: {
    backgroundColor: '#E53935', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8, minWidth: 90, alignItems: 'center',
  },
  bannerCheckOutBtnDisabled: { opacity: 0.6 },
  bannerCheckOutText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  bannerArrivedBtn: {
    backgroundColor: colors.success, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8, minWidth: 90, alignItems: 'center',
  },
  bannerArrivedText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  bannerCancelBtn: {
    borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
  },
  bannerCancelText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  recenterBtn: {
    position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 4,
  },
  recenterBtnActive: { borderColor: colors.accent },
  recenterIcon: { color: colors.text, fontSize: 18, lineHeight: 20 },
  fab: {
    position: 'absolute', right: 16, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
  },
  fabIcon: { color: '#fff', fontSize: 28, lineHeight: 30, fontWeight: '300' },
});

function CheckInBubble({ checkin, spotName, spotLat, spotLng, idx, isSelf, showCarBadge, incomingCount, colors, styles, onPress }: {
  checkin: CheckInWithUser;
  spotName: string;
  spotLat: number;
  spotLng: number;
  idx: number;
  isSelf: boolean;
  showCarBadge: boolean;
  incomingCount: number;
  colors: Colors;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  const isPre = checkin.type === 'pre';
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;

  const hasBadge = showCarBadge || incomingCount > 0;

  useEffect(() => {
    if (isPre) return;
    const loop = Animated.loop(
      Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: false })
    );
    loop.start();
    return () => loop.stop();
  }, [isPre]);

  useEffect(() => {
    if (hasBadge) {
      badgeScale.setValue(0);
      Animated.spring(badgeScale, {
        toValue: 1, friction: 5, tension: 200, useNativeDriver: true,
      }).start();
    } else {
      badgeScale.setValue(0);
    }
  }, [hasBadge, incomingCount]);

  const frameStyle = isPre
    ? (isSelf ? styles.bubbleFramePreSelf : styles.bubbleFramePre)
    : (isSelf ? styles.bubbleFrameSelf : styles.bubbleFrameActive);

  const label = spotName.length > 12 ? `${spotName.slice(0, 12)}…` : spotName;

  function renderBadge() {
    if (incomingCount >= 3) {
      return (
        <Animated.View style={[styles.badgeContainer, { transform: [{ scale: badgeScale }] }]}>
          <Text style={styles.carEmoji}>🚗</Text>
          <View style={styles.countCircle}>
            <Text style={styles.countText}>{incomingCount}</Text>
          </View>
        </Animated.View>
      );
    }
    if (incomingCount === 2) {
      return (
        <Animated.View style={[styles.badgeContainer, { transform: [{ scale: badgeScale }], flexDirection: 'row' }]}>
          <Text style={styles.carEmoji}>🚗</Text>
          <Text style={[styles.carEmoji, { marginLeft: -4 }]}>🚗</Text>
        </Animated.View>
      );
    }
    if (incomingCount === 1 || showCarBadge) {
      return (
        <Animated.View style={[styles.badgeContainer, { transform: [{ scale: badgeScale }] }]}>
          <Text style={styles.carEmoji}>🚗</Text>
        </Animated.View>
      );
    }
    return null;
  }

  return (
    <Marker
      coordinate={{ latitude: spotLat + 0.0001, longitude: spotLng + idx * 0.00014 }}
      anchor={{ x: 0.5, y: 0.45 }}
      onPress={onPress}
      tracksViewChanges={!isPre}
    >
      <View style={{ alignItems: 'center' }}>
        <View style={styles.bubbleWrapper}>
          {!isPre && (
            <Animated.View style={[styles.pulseRing, {
              opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
              transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }],
            }]} />
          )}
          <View style={[styles.bubbleFrame, frameStyle]}>
            <Avatar
              username={checkin.username ?? '?'} photoBase64={checkin.photoBase64}
              size={48} color={isPre ? '#FF9500' : (isSelf ? colors.success : colors.accent)}
            />
          </View>
          {renderBadge()}
        </View>
        <View style={styles.spotLabel}>
          <Text style={styles.spotLabelText} numberOfLines={1}>{label}</Text>
        </View>
      </View>
    </Marker>
  );
}

export default function MapScreen({ user }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const mapRef = useRef<MapView>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [rawCheckins, setRawCheckins] = useState<CheckIn[]>([]);
  const [userMap, setUserMap] = useState<Record<string, { username: string; photoBase64?: string }>>({
    [user.id]: { username: user.username, photoBase64: user.photoBase64 },
  });
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [checkInVisible, setCheckInVisible] = useState(false);
  const [addSpotVisible, setAddSpotVisible] = useState(false);
  const [detailCheckin, setDetailCheckin] = useState<CheckInWithUser | null>(null);
  const [detailSpot, setDetailSpot] = useState<Spot | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [locating, setLocating] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [arriving, setArriving] = useState(false);
  const [filterMode, setFilterMode] = useState<string>('all');
  const [myOnMyWayCheckinIds, setMyOnMyWayCheckinIds] = useState<Set<string>>(new Set());
  const [incomingUserIds, setIncomingUserIds] = useState<Set<string>>(new Set());
  const [incomingCountByCheckin, setIncomingCountByCheckin] = useState<Map<string, number>>(new Map());

  useEffect(() => { return subscribeSpots(setSpots); }, []);
  useEffect(() => { return subscribeActiveCheckins(setRawCheckins); }, []);
  useEffect(() => { return subscribeGroups(user.id, setMyGroups); }, [user.id]);
  useEffect(() => {
    return subscribeMyOnMyWay(user.id, (docs) => {
      setMyOnMyWayCheckinIds(new Set(docs.map((d) => d.checkinId)));
    });
  }, [user.id]);
  useEffect(() => {
    return subscribeIncomingOnMyWay(user.id, (docs) => {
      setIncomingUserIds(new Set(docs.map((d) => d.fromUserId)));
      const counts = new Map<string, number>();
      for (const d of docs) {
        counts.set(d.checkinId, (counts.get(d.checkinId) ?? 0) + 1);
      }
      setIncomingCountByCheckin(counts);
    });
  }, [user.id]);

  useEffect(() => {
    const unknownIds = [...new Set(rawCheckins.map((c) => c.userId).filter((id) => !userMap[id]))];
    if (unknownIds.length === 0) return;
    Promise.all(unknownIds.map(getUser)).then((users) => {
      const patch: Record<string, { username: string; photoBase64?: string }> = {};
      users.forEach((u) => { if (u) patch[u.id] = { username: u.username, photoBase64: u.photoBase64 }; });
      if (Object.keys(patch).length > 0) setUserMap((prev) => ({ ...prev, ...patch }));
    });
  }, [rawCheckins]);

  useEffect(() => {
    setUserMap((prev) => ({
      ...prev,
      [user.id]: { username: user.username, photoBase64: user.photoBase64 },
    }));
  }, [user.photoBase64, user.username]);

  const activeCheckins: CheckInWithUser[] = rawCheckins.map((c) => ({
    ...c,
    username: userMap[c.userId]?.username,
    photoBase64: userMap[c.userId]?.photoBase64,
  }));

  const myGroupIds = new Set(myGroups.map((g) => g.id));
  const visibleCheckins = activeCheckins.filter((c) => {
    if (c.userId === user.id) return true;
    if (c.groupId === 'all') return user.friendIds.includes(c.userId);
    return myGroupIds.has(c.groupId);
  });

  const filteredCheckins = filterMode === 'all'
    ? visibleCheckins
    : filterMode === 'friends'
      ? visibleCheckins.filter((c) => c.userId === user.id || c.groupId === 'all')
      : visibleCheckins.filter((c) => c.userId === user.id || c.groupId === filterMode);

  const myCheckIn = rawCheckins.find((c) => c.userId === user.id) ?? null;
  const myActiveCheckIn = myCheckIn?.type !== 'pre' ? myCheckIn : null;
  const myPreCheckIn = myCheckIn?.type === 'pre' ? myCheckIn : null;
  const myActiveSpot = myActiveCheckIn ? spots.find((s) => s.id === myActiveCheckIn.spotId) ?? null : null;
  const myPreSpot = myPreCheckIn ? spots.find((s) => s.id === myPreCheckIn.spotId) ?? null : null;

  async function handleCheckOut(): Promise<void> {
    if (!myCheckIn) return;
    setCheckingOut(true);
    try {
      const checkIn = myCheckIn;
      await deleteCheckIn(checkIn.id);
      if (checkIn.type === 'pre') return;
      const spotName = myActiveSpot?.name ?? 'a spot';
      const leaveMsg = `${user.username} left ${spotName}`;
      if (checkIn.groupId === 'all') {
        if (user.friendIds.length > 0) {
          const friends = await getFriends(user.friendIds);
          const tokens = friends.map((f) => f.pushToken).filter((t): t is string => !!t);
          await sendPushNotifications(tokens, leaveMsg);
        }
      } else if (checkIn.groupId) {
        const group = await getGroup(checkIn.groupId);
        if (group) {
          const memberIds = group.memberIds.filter((id) => id !== user.id);
          const members = await getFriends(memberIds);
          const tokens = members.map((m) => m.pushToken).filter((t): t is string => !!t);
          await sendPushNotifications(tokens, leaveMsg);
        }
      }
    } catch { Alert.alert('Error', 'Could not check out. Please try again.'); }
    finally { setCheckingOut(false); }
  }

  async function handleArrived(): Promise<void> {
    if (!myPreCheckIn || !myPreSpot) return;
    setArriving(true);
    try {
      await deleteCheckIn(myPreCheckIn.id);
      await createCheckIn({
        userId: user.id, spotId: myPreCheckIn.spotId,
        status: myPreCheckIn.status, duration: myPreCheckIn.duration,
        groupId: myPreCheckIn.groupId, type: 'active',
      });
      const msg = `${user.username} arrived at ${myPreSpot.name}${myPreCheckIn.status ? ` · ${myPreCheckIn.status}` : ''}`;
      if (myPreCheckIn.groupId === 'all') {
        if (user.friendIds.length > 0) {
          const friends = await getFriends(user.friendIds);
          const tokens = friends.map((f) => f.pushToken).filter((t): t is string => !!t);
          await sendPushNotifications(tokens, msg);
        }
      } else if (myPreCheckIn.groupId) {
        const group = await getGroup(myPreCheckIn.groupId);
        if (group) {
          const memberIds = group.memberIds.filter((id) => id !== user.id);
          const members = await getFriends(memberIds);
          const tokens = members.map((m) => m.pushToken).filter((t): t is string => !!t);
          await sendPushNotifications(tokens, msg);
        }
      }
    } catch { Alert.alert('Error', 'Could not mark as arrived.'); }
    finally { setArriving(false); }
  }

  async function handleLocateMe() {
    if (locating) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Location permission needed', 'Enable location in Settings.'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude, longitude: loc.coords.longitude,
        latitudeDelta: 0.01, longitudeDelta: 0.01,
      }, 600);
    } catch { Alert.alert('Error', 'Could not get your location.'); }
    finally { setLocating(false); }
  }

  const checkinsBySpot = filteredCheckins.reduce<Record<string, CheckInWithUser[]>>(
    (acc, c) => { if (!acc[c.spotId]) acc[c.spotId] = []; acc[c.spotId].push(c); return acc; }, {}
  );

  const hasBanner = !!myActiveCheckIn || !!myPreCheckIn;
  const fabBottom = hasBanner ? 36 + BANNER_LIFT : 36;
  const recenterBottom = hasBanner ? 104 + BANNER_LIFT : 104;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef} style={styles.map}
        initialRegion={COPENHAGEN} customMapStyle={DARK_MAP_STYLE}
        userInterfaceStyle="dark" showsUserLocation showsMyLocationButton={false}
      >
        {spots.map((spot) => {
          const spotCheckins = checkinsBySpot[spot.id] ?? [];
          return (
            <React.Fragment key={spot.id}>
              <Marker
                coordinate={{ latitude: spot.lat, longitude: spot.lng }}
                onPress={() => { setSelectedSpot(spot); setCheckInVisible(true); }}
                anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}
              >
                <View style={styles.markerContainer}>
                  <View style={styles.markerBubble}><Text style={styles.markerEmoji}>{spot.emoji}</Text></View>
                  <View style={styles.markerTail} />
                </View>
              </Marker>
              {spotCheckins.slice(0, 3).map((checkin, idx) => (
                <CheckInBubble
                  key={`ci-${checkin.id}-${checkin.photoBase64 ? 'photo' : 'none'}`}
                  checkin={checkin}
                  spotName={spot.name}
                  spotLat={spot.lat}
                  spotLng={spot.lng}
                  idx={idx}
                  isSelf={checkin.userId === user.id}
                  showCarBadge={myOnMyWayCheckinIds.has(checkin.id) || incomingUserIds.has(checkin.userId)}
                  incomingCount={incomingCountByCheckin.get(checkin.id) ?? 0}
                  colors={colors}
                  styles={styles}
                  onPress={() => { setDetailCheckin(checkin); setDetailSpot(spot); setDetailVisible(true); }}
                />
              ))}
            </React.Fragment>
          );
        })}
      </MapView>

      {/* Friends filter chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterBar} contentContainerStyle={{ paddingRight: 12 }}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={[styles.filterChip, filterMode === 'all' && styles.filterChipActive]}
          onPress={() => setFilterMode('all')} activeOpacity={0.8}
        >
          <Text style={[styles.filterChipText, filterMode === 'all' && styles.filterChipTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterMode === 'friends' && styles.filterChipActive]}
          onPress={() => setFilterMode('friends')} activeOpacity={0.8}
        >
          <Text style={[styles.filterChipText, filterMode === 'friends' && styles.filterChipTextActive]}>Friends</Text>
        </TouchableOpacity>
        {myGroups.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={[styles.filterChip, filterMode === g.id && styles.filterChipActive]}
            onPress={() => setFilterMode(g.id)} activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filterMode === g.id && styles.filterChipTextActive]}>{g.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pre-check-in banner */}
      {myPreCheckIn && (
        <View style={styles.banner}>
          <View style={styles.bannerLeft}>
            <Text style={styles.bannerEmoji}>{myPreSpot?.emoji ?? '🚶'}</Text>
            <View style={styles.bannerText}>
              <Text style={styles.bannerSpot} numberOfLines={1}>Heading to {myPreSpot?.name ?? '…'}</Text>
              {myPreCheckIn.status ? <Text style={styles.bannerStatus} numberOfLines={1}>{myPreCheckIn.status}</Text> : null}
            </View>
          </View>
          <View style={styles.bannerActions}>
            <TouchableOpacity
              style={[styles.bannerCancelBtn, checkingOut && styles.bannerCheckOutBtnDisabled]}
              onPress={handleCheckOut} disabled={checkingOut} activeOpacity={0.8}
            >
              {checkingOut ? <ActivityIndicator size="small" color={colors.textMuted} /> : <Text style={styles.bannerCancelText}>✕</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bannerArrivedBtn, arriving && styles.bannerCheckOutBtnDisabled]}
              onPress={handleArrived} disabled={arriving} activeOpacity={0.8}
            >
              {arriving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.bannerArrivedText}>I'm here!</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Active check-in banner */}
      {myActiveCheckIn && (
        <View style={styles.banner}>
          <View style={styles.bannerLeft}>
            <Text style={styles.bannerEmoji}>{myActiveSpot?.emoji ?? '📍'}</Text>
            <View style={styles.bannerText}>
              <Text style={styles.bannerSpot} numberOfLines={1}>{myActiveSpot?.name ?? '…'}</Text>
              {myActiveCheckIn.status ? <Text style={styles.bannerStatus} numberOfLines={1}>{myActiveCheckIn.status}</Text> : null}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.bannerCheckOutBtn, checkingOut && styles.bannerCheckOutBtnDisabled]}
            onPress={handleCheckOut} disabled={checkingOut} activeOpacity={0.8}
          >
            {checkingOut ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.bannerCheckOutText}>Check out</Text>}
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.recenterBtn, locating && styles.recenterBtnActive, { bottom: recenterBottom }]}
        onPress={handleLocateMe} activeOpacity={0.8}
      >
        <Text style={styles.recenterIcon}>{locating ? '…' : '◎'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.fab, { bottom: fabBottom }]}
        onPress={() => setAddSpotVisible(true)} activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <CheckInSheet visible={checkInVisible} spot={selectedSpot} user={user}
        activeCheckIn={myCheckIn} onCheckOut={handleCheckOut}
        onClose={() => setCheckInVisible(false)} />
      <AddSpotSheet visible={addSpotVisible} user={user} onClose={() => setAddSpotVisible(false)} />
      <CheckInDetailModal visible={detailVisible} checkin={detailCheckin} spot={detailSpot}
        currentUser={user} onClose={() => setDetailVisible(false)} />
    </View>
  );
}
