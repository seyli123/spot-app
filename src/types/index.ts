export interface User {
  id: string;
  username: string;
  nickname?: string;
  pushToken?: string;
  friendIds: string[];
  photoBase64?: string;
  createdAt?: number;
}

export interface Spot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  emoji: string;
  addedBy: string;
  createdAt: number;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
}

export type Duration = '30min' | '1h' | '2h' | 'all-day' | 'custom';

export type CheckInType = 'active' | 'pre';

export interface CheckIn {
  id: string;
  userId: string;
  spotId: string;
  status: string;
  duration: Duration;
  groupId: string;
  createdAt: number;
  expiresAt: number;
  type?: CheckInType;
}

export interface CheckInWithUser extends CheckIn {
  username?: string;
  photoBase64?: string;
}

export interface OnMyWay {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  checkinId: string;
  spotId: string;
  etaMinutes: number;
  createdAt: number;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export interface FriendRequest {
  id: string;
  from: string;
  to: string;
  fromUsername: string;
  status: FriendRequestStatus;
  createdAt: number;
}
