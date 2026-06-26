import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Colors } from '../theme';
import { User, FriendRequest } from '../types';
import {
  searchUsers, removeFriend, getFriends,
  sendFriendRequest, acceptFriendRequest, declineFriendRequest,
  subscribePendingRequestsTo, subscribeOutgoingPendingRequests,
} from '../services/firestore';
import { sendPushNotifications } from '../services/notifications';
import Avatar from '../components/Avatar';

interface Props {
  user: User;
  onUserUpdate: (updates: Partial<User>) => void;
}

const createStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 16 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  searchInput: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  searchBtn: {
    backgroundColor: colors.accent, borderRadius: 10,
    paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', minWidth: 70,
  },
  searchBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  section: { marginTop: 20 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionLabel: {
    color: colors.textSecondary, fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  badge: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1, marginBottom: 10 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  emptyText: { color: colors.textMuted, fontSize: 14, fontStyle: 'italic' },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  requestRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: `${colors.accent}33`,
  },
  requestInfo: { flex: 1 },
  requestSub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  avatar: { marginRight: 12 },
  username: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' },
  actionBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, minWidth: 52, alignItems: 'center' },
  addBtn: { backgroundColor: colors.accent },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  acceptBtn: { backgroundColor: colors.accent, marginRight: 6 },
  acceptText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  declineBtn: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, minWidth: 36 },
  declineText: { color: colors.textMuted, fontSize: 13 },
  removeBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  removeBtnText: { color: colors.textMuted, fontSize: 13 },
  alreadyText: { color: colors.success, fontSize: 13, fontWeight: '500' },
  pendingText: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
});

export default function FriendsScreen({ user, onUserUpdate }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [queryText, setQueryText] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [pendingOutgoingTo, setPendingOutgoingTo] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const loadFriends = useCallback(async () => {
    if (user.friendIds.length === 0) { setFriends([]); return; }
    setFriends(await getFriends(user.friendIds));
  }, [user.friendIds]);

  useEffect(() => { loadFriends(); }, [loadFriends]);
  useEffect(() => { return subscribePendingRequestsTo(user.id, setIncomingRequests); }, [user.id]);
  useEffect(() => {
    return subscribeOutgoingPendingRequests(user.id, (reqs) => {
      setPendingOutgoingTo(new Set(reqs.map((r) => r.to)));
    });
  }, [user.id]);

  function setLoading(id: string, on: boolean) {
    setLoadingIds((s) => { const n = new Set(s); on ? n.add(id) : n.delete(id); return n; });
  }

  async function handleSearch() {
    const q = queryText.trim(); if (!q) return;
    setSearching(true);
    try { setSearchResults((await searchUsers(q)).filter((u) => u.id !== user.id)); }
    catch { Alert.alert('Error', 'Search failed. Try again.'); }
    finally { setSearching(false); }
  }

  async function handleSendRequest(friend: User) {
    setLoading(friend.id, true);
    try {
      await sendFriendRequest(user.id, friend.id, user.username);
      if (friend.pushToken) await sendPushNotifications([friend.pushToken], `${user.username} sent you a friend request`);
    } catch { Alert.alert('Error', 'Could not send friend request.'); }
    finally { setLoading(friend.id, false); }
  }

  async function handleAccept(req: FriendRequest) {
    setLoading(req.id, true);
    try {
      await acceptFriendRequest(req.id, req.from, user.id);
      onUserUpdate({ friendIds: [...user.friendIds, req.from] });
    } catch { Alert.alert('Error', 'Could not accept request.'); }
    finally { setLoading(req.id, false); }
  }

  async function handleDecline(req: FriendRequest) {
    setLoading(req.id, true);
    try { await declineFriendRequest(req.id); }
    catch { Alert.alert('Error', 'Could not decline request.'); }
    finally { setLoading(req.id, false); }
  }

  async function handleRemove(friend: User) {
    Alert.alert('Remove friend', `Remove @${friend.username}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setLoading(friend.id, true);
          try {
            await removeFriend(user.id, friend.id);
            onUserUpdate({ friendIds: user.friendIds.filter((id) => id !== friend.id) });
          } catch { Alert.alert('Error', 'Could not remove friend.'); }
          finally { setLoading(friend.id, false); }
        },
      },
    ]);
  }

  function renderAvatar(u: User | { username: string; photoBase64?: string }, color = colors.accent) {
    return (
      <Avatar username={u.username} photoBase64={'photoBase64' in u ? u.photoBase64 : undefined}
        size={38} color={color} style={styles.avatar} />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Friends</Text>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput} value={queryText} onChangeText={setQueryText}
            placeholder="Search by username" placeholderTextColor={colors.textMuted}
            autoCapitalize="none" autoCorrect={false}
            returnKeyType="search" onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}
            disabled={searching || !queryText.trim()} activeOpacity={0.8}>
            {searching ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.searchBtnText}>Search</Text>}
          </TouchableOpacity>
        </View>

        {searchResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Results</Text>
            {searchResults.map((item) => {
              const isFriend = user.friendIds.includes(item.id);
              const isPending = pendingOutgoingTo.has(item.id);
              const busy = loadingIds.has(item.id);
              return (
                <View key={item.id} style={styles.row}>
                  {renderAvatar(item)}
                  <Text style={styles.username}>@{item.username}</Text>
                  {isFriend && <Text style={styles.alreadyText}>Friends</Text>}
                  {!isFriend && isPending && <Text style={styles.pendingText}>Pending</Text>}
                  {!isFriend && !isPending && (
                    <TouchableOpacity style={[styles.actionBtn, styles.addBtn]} onPress={() => handleSendRequest(item)} disabled={busy}>
                      {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addBtnText}>Add</Text>}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {incomingRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionLabel}>Friend requests</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{incomingRequests.length}</Text></View>
            </View>
            {incomingRequests.map((req) => {
              const busy = loadingIds.has(req.id);
              return (
                <View key={req.id} style={styles.requestRow}>
                  {renderAvatar({ username: req.fromUsername }, '#7C6AF6')}
                  <View style={styles.requestInfo}>
                    <Text style={styles.username}>@{req.fromUsername}</Text>
                    <Text style={styles.requestSub}>wants to be friends</Text>
                  </View>
                  <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => handleAccept(req)} disabled={busy}>
                    {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.acceptText}>Accept</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.declineBtn]} onPress={() => handleDecline(req)} disabled={busy}>
                    <Text style={styles.declineText}>✕</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{friends.length > 0 ? `Your friends (${friends.length})` : 'No friends yet'}</Text>
          {friends.length === 0
            ? <Text style={styles.emptyText}>Search for a username and send a friend request.</Text>
            : friends.map((item) => {
                const busy = loadingIds.has(item.id);
                return (
                  <View key={item.id} style={styles.row}>
                    {renderAvatar(item)}
                    <Text style={styles.username}>@{item.username}</Text>
                    <TouchableOpacity style={[styles.actionBtn, styles.removeBtn]} onPress={() => handleRemove(item)} disabled={busy}>
                      {busy ? <ActivityIndicator size="small" color={colors.textMuted} /> : <Text style={styles.removeBtnText}>Remove</Text>}
                    </TouchableOpacity>
                  </View>
                );
              })}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
