import { db } from '@/db';
import { friendships } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { IFriendshipRepository, Friendship, NewFriendship } from '../friendship.repository';

export class DrizzleFriendshipRepository implements IFriendshipRepository {
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const result = await db
      .select()
      .from(friendships)
      .where(
        and(
          or(
            and(eq(friendships.userId, userId1), eq(friendships.friendId, userId2)),
            and(eq(friendships.userId, userId2), eq(friendships.friendId, userId1))
          ),
          eq(friendships.status, 'accepted')
        )
      )
      .limit(1);
    return result.length > 0;
  }

  async getFriends(userId: string): Promise<Friendship[]> {
    return await db
      .select()
      .from(friendships)
      .where(
        and(
          or(eq(friendships.userId, userId), eq(friendships.friendId, userId)),
          eq(friendships.status, 'accepted')
        )
      );
  }

  async createFriendRequest(userId: string, friendId: string): Promise<Friendship> {
    const result = await db
      .insert(friendships)
      .values({
        userId,
        friendId,
        status: 'pending',
      })
      .returning();
    return result[0];
  }

  async acceptFriendRequest(id: string): Promise<Friendship> {
    const result = await db
      .update(friendships)
      .set({ status: 'accepted', acceptedAt: new Date() })
      .where(eq(friendships.id, id))
      .returning();
    return result[0];
  }
}

export const friendshipRepository = new DrizzleFriendshipRepository();
