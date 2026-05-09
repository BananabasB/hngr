import { notifications } from '@/db/schema';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;

export interface INotificationRepository {
  create(notification: NewNotification): Promise<Notification>;
  getByUserId(userId: string): Promise<Notification[]>;
  markAsRead(id: string): Promise<Notification>;
}
