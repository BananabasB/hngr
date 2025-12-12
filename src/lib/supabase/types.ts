// Supabase Database Types

import { Pronouns } from "../setup";

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';
export type NominationStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'hidden';
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
  is_plus: boolean;
  plus_expires_at: string | null;
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
  income: number | null; // Income level for district suggestion/AI context
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

export interface NominationReport {
  id: string;
  nomination_id: string;
  reporter_id: string;
  reason: 'inappropriate_content' | 'harassment' | 'spam' | 'offensive' | 'other';
  details?: string;
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
  report_count?: number;
  user_reported?: boolean;
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
  tribute_pronouns: Pronouns;
  tribute_image_url?: string;
  tribute_bio?: string;
  message?: string;
  income?: number;
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

export interface CustomEvent {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  max_attendees: number | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  joined_at: string;
}

export interface CustomEventWithDetails extends CustomEvent {
  creator?: User;
  attendee_count?: number;
  attendees?: (EventAttendee & { user?: User })[];
}

export interface CreateCustomEventRequest {
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  max_attendees?: number | null;
  is_public?: boolean;
}

export type SimulationEventType =
  | 'kill'
  | 'kill2'
  | 'alliance'
  | 'find'
  | 'feast'
  | 'generic'
  | 'training'
  | 'combat';

export type SimulationEventStatus = 'approved' | 'pending' | 'rejected';

export interface SimulationEventTemplate {
  id: string;
  creator_id: string;
  title: string;
  type: SimulationEventType;
  roles: string[];
  text_template: string;
  effect_json: Record<string, any> | null;
  status: SimulationEventStatus;
  created_at: string;
  updated_at: string;
  creator?: Pick<User, 'id' | 'display_name' | 'username' | 'avatar_url'>;
}

export interface CreateSimulationEventTemplateRequest {
  title: string;
  type: SimulationEventType;
  roles: string[];
  text_template: string;
  effect_json?: Record<string, any> | null;
}
