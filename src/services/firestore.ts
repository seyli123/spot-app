import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Spot, Group, CheckIn, CheckInWithUser, Duration, FriendRequest, OnMyWay } from '../types';

// ── Users ──────────────────────────────────────────────────────────────────

export async function createUser(user: User): Promise<void> {
  await setDoc(doc(db, 'users', user.id), user);
}

export async function getUser(id: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', id));
  return snap.exists() ? (snap.data() as User) : null;
}

// setDoc with merge so it works even if the user doc was just created
export async function updatePushToken(userId: string, pushToken: string): Promise<void> {
  await setDoc(doc(db, 'users', userId), { pushToken }, { merge: true });
}

export async function updateUserDoc(userId: string, data: Partial<User>): Promise<void> {
  await setDoc(doc(db, 'users', userId), data, { merge: true });
}

export async function searchUsers(username: string): Promise<User[]> {
  const q = query(collection(db, 'users'), where('username', '==', username));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as User);
}

export async function addFriend(userId: string, friendId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { friendIds: arrayUnion(friendId) });
  await updateDoc(doc(db, 'users', friendId), { friendIds: arrayUnion(userId) });
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { friendIds: arrayRemove(friendId) });
  await updateDoc(doc(db, 'users', friendId), { friendIds: arrayRemove(userId) });
}

export async function getFriends(friendIds: string[]): Promise<User[]> {
  if (friendIds.length === 0) return [];
  const snaps = await Promise.all(friendIds.map((id) => getDoc(doc(db, 'users', id))));
  return snaps.filter((s) => s.exists()).map((s) => s.data() as User);
}

// ── Friend Requests ────────────────────────────────────────────────────────

export async function sendFriendRequest(
  from: string,
  to: string,
  fromUsername: string
): Promise<string> {
  // Idempotent: return existing pending request if already sent
  const existing = await getDocs(
    query(collection(db, 'friendRequests'),
      where('from', '==', from),
      where('to', '==', to),
      where('status', '==', 'pending'))
  );
  if (!existing.empty) return existing.docs[0].id;

  const ref = await addDoc(collection(db, 'friendRequests'), {
    from,
    to,
    fromUsername,
    status: 'pending',
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function acceptFriendRequest(
  requestId: string,
  fromId: string,
  toId: string
): Promise<void> {
  await updateDoc(doc(db, 'friendRequests', requestId), { status: 'accepted' });
  await addFriend(fromId, toId);
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'friendRequests', requestId), { status: 'declined' });
}

export function subscribePendingRequestsTo(
  userId: string,
  cb: (requests: FriendRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'friendRequests'),
    where('to', '==', userId),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FriendRequest)));
  });
}

export function subscribeOutgoingPendingRequests(
  userId: string,
  cb: (requests: FriendRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'friendRequests'),
    where('from', '==', userId),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FriendRequest)));
  });
}

export async function deleteCheckIn(checkInId: string): Promise<void> {
  await deleteDoc(doc(db, 'checkins', checkInId));
}

export async function updateCheckIn(id: string, data: Partial<Omit<CheckIn, 'id'>>): Promise<void> {
  await updateDoc(doc(db, 'checkins', id), data);
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null;
}

export async function getUserStats(userId: string): Promise<{ checkins: number; spots: number }> {
  const [ci, sp] = await Promise.all([
    getDocs(query(collection(db, 'checkins'), where('userId', '==', userId))),
    getDocs(query(collection(db, 'spots'), where('addedBy', '==', userId))),
  ]);
  return { checkins: ci.size, spots: sp.size };
}

// ── Spots ──────────────────────────────────────────────────────────────────

export async function createSpot(spot: Omit<Spot, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'spots'), spot);
  return ref.id;
}

export async function deleteSpot(spotId: string): Promise<void> {
  await deleteDoc(doc(db, 'spots', spotId));
}

export function subscribeSpots(cb: (spots: Spot[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'spots'), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Spot)));
  });
}

// ── Groups ─────────────────────────────────────────────────────────────────

export async function createGroup(group: Omit<Group, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'groups'), group);
  return ref.id;
}

export async function updateGroup(groupId: string, data: Partial<Group>): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), data);
}

export async function deleteGroup(groupId: string): Promise<void> {
  await deleteDoc(doc(db, 'groups', groupId));
}

export function subscribeGroups(userId: string, cb: (groups: Group[]) => void): Unsubscribe {
  const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', userId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group)));
  });
}

// ── Check-ins ──────────────────────────────────────────────────────────────

function durationToMs(duration: Duration): number {
  const map: Record<Duration, number> = {
    '30min': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '2h': 2 * 60 * 60 * 1000,
    'all-day': (() => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return end.getTime() - now.getTime();
    })(),
  };
  return map[duration];
}

export async function createCheckIn(params: {
  userId: string;
  spotId: string;
  status: string;
  duration: Duration;
  groupId: string;
  type?: import('../types').CheckInType;
}): Promise<string> {
  const now = Date.now();
  const checkin: Omit<CheckIn, 'id'> = {
    ...params,
    type: params.type ?? 'active',
    createdAt: now,
    expiresAt: now + durationToMs(params.duration),
  };
  const ref = await addDoc(collection(db, 'checkins'), checkin);
  return ref.id;
}

// ── On My Way ──────────────────────────────────────────────────────────────

export async function upsertOnMyWay(data: Omit<OnMyWay, 'id'>): Promise<string> {
  const q = query(
    collection(db, 'onmyway'),
    where('fromUserId', '==', data.fromUserId),
    where('checkinId', '==', data.checkinId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const id = snap.docs[0].id;
    await updateDoc(doc(db, 'onmyway', id), data);
    return id;
  }
  const ref = await addDoc(collection(db, 'onmyway'), data);
  return ref.id;
}

export async function getOnMyWay(fromUserId: string, checkinId: string): Promise<OnMyWay | null> {
  const q = query(
    collection(db, 'onmyway'),
    where('fromUserId', '==', fromUserId),
    where('checkinId', '==', checkinId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as OnMyWay;
}

export function subscribeMyOnMyWay(userId: string, cb: (docs: OnMyWay[]) => void): Unsubscribe {
  const q = query(collection(db, 'onmyway'), where('fromUserId', '==', userId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as OnMyWay)));
  });
}

export function subscribeIncomingOnMyWay(toUserId: string, cb: (docs: OnMyWay[]) => void): Unsubscribe {
  const q = query(collection(db, 'onmyway'), where('toUserId', '==', toUserId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as OnMyWay)));
  });
}

export function subscribeOnMyWayToCheckin(checkinId: string, cb: (docs: OnMyWay[]) => void): Unsubscribe {
  const q = query(collection(db, 'onmyway'), where('checkinId', '==', checkinId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as OnMyWay)));
  });
}

export function subscribeActiveCheckins(
  cb: (checkins: CheckIn[]) => void
): Unsubscribe {
  // Listen to the full collection and filter client-side so:
  // (a) no Firestore composite index is needed
  // (b) `now` is evaluated fresh on every snapshot, not once at setup time
  // (c) all users' check-ins are always included — no accidental userId scope
  return onSnapshot(collection(db, 'checkins'), (snap) => {
    const now = Date.now();
    cb(
      snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as CheckIn))
        .filter((c) => typeof c.expiresAt === 'number' && c.expiresAt > now)
    );
  });
}
