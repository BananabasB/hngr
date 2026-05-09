import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, or, ilike } from 'drizzle-orm';
import { IUserRepository, User, NewUser } from '../user.repository';

export class DrizzleUserRepository implements IUserRepository {
  async getById(id: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] || null;
  }

  async getByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || null;
  }

  async getByUsername(username: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0] || null;
  }

  async search(query: string, limit: number = 10): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.username, `%${query}%`),
          ilike(users.displayName, `%${query}%`)
        )
      )
      .limit(limit);
  }

  async create(user: NewUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async update(id: string, user: Partial<NewUser>): Promise<User> {
    const result = await db
      .update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async syncUser(userData: NewUser): Promise<User> {
    try {
      const result = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: userData.email,
            username: userData.username,
            displayName: userData.displayName,
            avatarUrl: userData.avatarUrl,
            updatedAt: new Date(),
          },
        })
        .returning();
      return result[0];
    } catch (error: any) {
      if (error?.code === '23505' && error?.detail?.includes?.('Key (email)')) {
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.email, userData.email))
          .limit(1)
          .then(r => r[0]);
        if (existing) {
          const [result] = await db
            .update(users)
            .set({
              email: userData.email,
              username: userData.username,
              displayName: userData.displayName,
              avatarUrl: userData.avatarUrl,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existing.id))
            .returning();
          return result;
        }
      }
      throw error;
    }
  }
}

export const userRepository = new DrizzleUserRepository();
