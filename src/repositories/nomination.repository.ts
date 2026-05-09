import { nominations } from '@/db/schema';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type Nomination = InferSelectModel<typeof nominations>;
export type NewNomination = InferInsertModel<typeof nominations>;

export interface INominationRepository {
  getById(id: string): Promise<Nomination | null>;
  getByRecipientId(recipientId: string): Promise<Nomination[]>;
  getByNominatorId(nominatorId: string): Promise<Nomination[]>;
  create(nomination: NewNomination): Promise<Nomination>;
  updateStatus(id: string, status: Nomination['status']): Promise<Nomination>;
  delete(id: string): Promise<void>;
}
