import { friendships } from '@/db/schema';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type Friendship = InferSelectModel<typeof friendships>;
export type NewFriendship = InferInsertModel<typeof friendships>;

export interface IFriendshipRepository {
  areFriends(userId1: string, userId2: string): Promise<boolean>;
  getFriends(userId: string): Promise<Friendship[]>;
  createFriendRequest(userId: string, friendId: string): Promise<Friendship>;
  acceptFriendRequest(id: string): Promise<Friendship>;
}
