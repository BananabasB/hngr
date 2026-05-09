import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { INotificationRepository, Notification, NewNotification } from '../notification.repository';

export class DrizzleNotificationRepository implements INotificationRepository {
  async create(notification: NewNotification): Promise<Notification> {
    const result = await db.insert(notifications).values(notification).returning();
    return result[0];
  }

  async getByUserId(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId));
  }

  async markAsRead(id: string): Promise<Notification> {
    const result = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id))
      .returning();
    return result[0];
  }
}

export const notificationRepository = new DrizzleNotificationRepository();
