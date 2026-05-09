import { users } from '@/db/schema';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export interface IUserRepository {
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  getByUsername(username: string): Promise<User | null>;
  search(query: string, limit?: number): Promise<User[]>;
  create(user: NewUser): Promise<User>;
  update(id: string, user: Partial<NewUser>): Promise<User>;
  syncUser(user: NewUser): Promise<User>;
}
