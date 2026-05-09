import { db } from '@/db';
import { nominations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { INominationRepository, Nomination, NewNomination } from '../nomination.repository';

export class DrizzleNominationRepository implements INominationRepository {
  async getById(id: string): Promise<Nomination | null> {
    const result = await db.select().from(nominations).where(eq(nominations.id, id)).limit(1);
    return result[0] || null;
  }

  async getByRecipientId(recipientId: string): Promise<Nomination[]> {
    return await db.select().from(nominations).where(eq(nominations.recipientId, recipientId));
  }

  async getByNominatorId(nominatorId: string): Promise<Nomination[]> {
    return await db.select().from(nominations).where(eq(nominations.nominatorId, nominatorId));
  }

  async create(nomination: NewNomination): Promise<Nomination> {
    const result = await db.insert(nominations).values(nomination).returning();
    return result[0];
  }

  async updateStatus(id: string, status: Nomination['status']): Promise<Nomination> {
    const result = await db
      .update(nominations)
      .set({ status, updatedAt: new Date() })
      .where(eq(nominations.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<void> {
    await db.delete(nominations).where(eq(nominations.id, id));
  }
}

export const nominationRepository = new DrizzleNominationRepository();
