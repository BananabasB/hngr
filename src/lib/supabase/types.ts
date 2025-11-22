// Supabase Database Types

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';
export type NominationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';
export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'nomination_received'
  | 'nomination_accepted'
  | 'nomination_rejected'
  | 'nomination_vote';

export interface User {
  id: string; // Clerk user ID
  email: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendshipStatus;
  requested_at: string;
  accepted_at: string | null;
}

export interface Tribute {
  id: string;
  owner_id: string;
  name: string;
  pronouns: {
    subject: string;
    object: string;
    possessive: string;
    reflexive: string;
  };
  image_url: string | null;
  bio: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Nomination {
  id: string;
  nominator_id: string;
  recipient_id: string;
  tribute_name: string;
  tribute_pronouns: {
    subject: string;
    object: string;
    possessive: string;
    reflexive: string;
  };
  tribute_image_url: string | null;
  tribute_bio: string | null;
  message: string | null;
  status: NominationStatus;
  votes: number;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface NominationVote {
  id: string;
  nomination_id: string;
  user_id: string;
  created_at: string;
}

export interface Game {
  id: string;
  owner_id: string;
  name: string;
  tribute_data: any; // JSON data from localStorage
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface GameTribute {
  id: string;
  game_id: string;
  tribute_id: string | null;
  district: number;
  position: number;
  custom_tribute_data: any | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

// Extended types with joined data for convenience
export interface NominationWithDetails extends Nomination {
  nominator?: User;
  recipient?: User;
  // Tribute data is now embedded in Nomination, no need for separate tribute field
}

export interface FriendshipWithUser extends Friendship {
  friend?: User;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Request types
export interface CreateNominationRequest {
  recipient_id: string;
  tribute_name: string;
  tribute_pronouns: {
    subject: string;
    object: string;
    possessive: string;
    reflexive: string;
  };
  tribute_image_url?: string;
  tribute_bio?: string;
  message?: string;
}

export interface CreateFriendRequestRequest {
  friend_identifier: string; // email or username
}

export interface UpdateNominationStatusRequest {
  status: 'accepted' | 'rejected';
}

export interface CreateTributeRequest {
  name: string;
  pronouns: Tribute['pronouns'];
  image_url?: string;
  bio?: string;
  is_public?: boolean;
}
