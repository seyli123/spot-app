import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  Alert, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Colors } from '../theme';
import { User, Group } from '../types';
import { subscribeGroups, createGroup, updateGroup, deleteGroup, getFriends } from '../services/firestore';

interface Props { user: User }

const createStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  newBtn: { backgroundColor: colors.accent, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  newBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  createBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  groupCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  groupName: { color: colors.text, fontSize: 17, fontWeight: '600', flex: 1 },
  groupActions: { flexDirection: 'row', gap: 8 },
  editBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.surfaceElevated },
  editBtnText: { color: colors.textSecondary, fontSize: 13 },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.surfaceElevated },
  deleteBtnText: { color: colors.accent, fontSize: 13 },
  membersLabel: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  memberChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { color: colors.textSecondary, fontSize: 12 },
  moreText: { color: colors.textMuted, fontSize: 12, alignSelf: 'center' },
  // Modal
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  cancelText: { color: colors.textSecondary, fontSize: 16 },
  saveText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  modalBody: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  fieldLabel: {
    color: colors.textSecondary, fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: colors.surface, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  noFriendsText: { color: colors.textMuted, fontSize: 14, fontStyle: 'italic', marginBottom: 12 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border,
    marginRight: 12, alignItems: 'center', justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  memberAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  memberAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  memberName: { color: colors.text, fontSize: 15 },
});

export default function GroupsScreen({ user }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { return subscribeGroups(user.id, setGroups); }, [user.id]);
  useEffect(() => {
    if (user.friendIds.length === 0) return;
    getFriends(user.friendIds).then(setFriends);
  }, [user.friendIds]);

  function openCreate() { setEditingGroup(null); setGroupName(''); setSelectedMemberIds([user.id]); setModalVisible(true); }
  function openEdit(group: Group) { setEditingGroup(group); setGroupName(group.name); setSelectedMemberIds(group.memberIds); setModalVisible(true); }

  function toggleMember(id: string) {
    if (id === user.id) return;
    setSelectedMemberIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleSave() {
    if (!groupName.trim()) { Alert.alert('Name required', 'Give your group a name.'); return; }
    setSaving(true);
    try {
      const memberIds = Array.from(new Set([user.id, ...selectedMemberIds]));
      if (editingGroup) await updateGroup(editingGroup.id, { name: groupName.trim(), memberIds });
      else await createGroup({ name: groupName.trim(), ownerId: user.id, memberIds });
      setModalVisible(false);
    } catch { Alert.alert('Error', 'Failed to save group.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(group: Group) {
    Alert.alert('Delete group', `Delete "${group.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteGroup(group.id); }
        catch { Alert.alert('Error', 'Failed to delete group.'); }
      }},
    ]);
  }

  function friendName(id: string) {
    if (id === user.id) return user.username;
    return friends.find((f) => f.id === id)?.username ?? id;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Groups</Text>
        <TouchableOpacity style={styles.newBtn} onPress={openCreate} activeOpacity={0.8}>
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>👥</Text>
          <Text style={styles.emptyTitle}>No groups yet</Text>
          <Text style={styles.emptyText}>Create a group to notify friends when you check in.</Text>
          <TouchableOpacity style={styles.createBtn} onPress={openCreate} activeOpacity={0.8}>
            <Text style={styles.createBtnText}>Create your first group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groups} keyExtractor={(g) => g.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupName}>{item.name}</Text>
                {item.ownerId === user.id && (
                  <View style={styles.groupActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <Text style={styles.membersLabel}>{item.memberIds.length} member{item.memberIds.length !== 1 ? 's' : ''}</Text>
              <View style={styles.memberChips}>
                {item.memberIds.slice(0, 6).map((id) => (
                  <View key={id} style={styles.chip}><Text style={styles.chipText}>@{friendName(id)}</Text></View>
                ))}
                {item.memberIds.length > 6 && <Text style={styles.moreText}>+{item.memberIds.length - 6} more</Text>}
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingGroup ? 'Edit group' : 'New group'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Group name</Text>
            <TextInput
              style={styles.fieldInput} value={groupName} onChangeText={setGroupName}
              placeholder="e.g. CPH crew" placeholderTextColor={colors.textMuted}
              maxLength={40} returnKeyType="done"
            />
            <Text style={[styles.fieldLabel, { marginTop: 24 }]}>Members</Text>
            {friends.length === 0
              ? <Text style={styles.noFriendsText}>Add friends first to include them in groups.</Text>
              : friends.map((friend) => {
                  const selected = selectedMemberIds.includes(friend.id);
                  return (
                    <TouchableOpacity key={friend.id} style={styles.memberRow} onPress={() => toggleMember(friend.id)} activeOpacity={0.7}>
                      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                        {selected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>{friend.username.slice(0, 2).toUpperCase()}</Text>
                      </View>
                      <Text style={styles.memberName}>@{friend.username}</Text>
                    </TouchableOpacity>
                  );
                })}
            <View style={[styles.memberRow, { opacity: 0.5 }]}>
              <View style={[styles.checkbox, styles.checkboxSelected]}><Text style={styles.checkmark}>✓</Text></View>
              <View style={[styles.memberAvatar, { backgroundColor: colors.success }]}>
                <Text style={styles.memberAvatarText}>{user.username.slice(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={styles.memberName}>@{user.username} (you)</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
