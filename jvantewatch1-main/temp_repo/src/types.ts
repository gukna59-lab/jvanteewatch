export interface User {
  id: string;
  uid?: string; // Firebase UID
  username: string;
  avatar?: string;
  color: string;
  currentTimestamp: number;
  isCreator?: boolean;
}

export interface Message {
  id: string;
  userId: string;
  userUid?: string;
  username: string;
  avatar?: string;
  color: string;
  text: string;
  type?: 'text' | 'image' | 'voice' | 'file';
  mediaUrl?: string; // For images or voice
  createdAt: number;
  isCreator?: boolean;
}

export interface RoomState {
  creatorId: string;
  adminId: string;
  videoUrl: string | null;
  videoTitle?: string | null;
  isPlaying: boolean;
  timestamp: number;
  lastUpdateAt: number;
  name?: string;
  queue?: { url: string; title: string }[];
}
