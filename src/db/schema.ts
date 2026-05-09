import { pgTable, pgEnum } from 'drizzle-orm/pg-core';
import { text, timestamp, boolean, integer, jsonb, uuid } from 'drizzle-orm/pg-core/columns';
import { unique } from 'drizzle-orm/pg-core/unique-constraint';
import { index } from 'drizzle-orm/pg-core/indexes';
import { relations, sql } from 'drizzle-orm';

// --- Tables ---

export const seasonStatusEnum = pgEnum('season_status', ['draft', 'active', 'completed', 'archived']);
export const gameEventTypeEnum = pgEnum('game_event_type', ['kill', 'death', 'alliance', 'item_found', 'winner', 'game_start', 'game_end']);
export const gameEventSeverityEnum = pgEnum('game_event_severity', ['minor', 'normal', 'major', 'critical']);
export const simulationEventStatusEnum = pgEnum('simulation_event_status', ['approved', 'pending', 'rejected']);
export const simulationEventTypeEnum = pgEnum('simulation_event_type', ['kill', 'kill2', 'alliance', 'find', 'feast', 'generic', 'training', 'combat']);
export const chatThreadStatusEnum = pgEnum('chat_thread_status', ['regular', 'archived']);

export const seasons = pgTable('seasons', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: seasonStatusEnum('status').default('draft').notNull(),
  currentGameId: uuid('current_game_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  ownerIdIdx: index('idx_seasons_owner_id').on(table.ownerId),
  statusIdx: index('idx_seasons_status').on(table.status),
}));

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk ID
  email: text('email').unique().notNull(),
  username: text('username').unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  isPlus: boolean('is_plus').default(false).notNull(),
  plusExpiresAt: timestamp('plus_expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const friendships = pgTable('friendships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  friendId: text('friend_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['pending', 'accepted', 'blocked'] }).notNull(),
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
}, (table) => ({
  userFriendUnique: unique().on(table.userId, table.friendId),
  userIdIdx: index('idx_friendships_user_id').on(table.userId),
  friendIdIdx: index('idx_friendships_friend_id').on(table.friendId),
  statusIdx: index('idx_friendships_status').on(table.status),
}));

export const tributes = pgTable('tributes', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  pronouns: jsonb('pronouns').notNull().default({
    subject: "they",
    object: "them",
    possessive: "their",
    reflexive: "themselves"
  }),
  imageUrl: text('image_url'),
  bio: text('bio'),
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  ownerIdIdx: index('idx_tributes_owner_id').on(table.ownerId),
  isPublicIdx: index('idx_tributes_is_public').on(table.isPublic),
}));

export const nominations = pgTable('nominations', {
  id: uuid('id').primaryKey().defaultRandom(),
  nominatorId: text('nominator_id').references(() => users.id, { onDelete: 'cascade' }),
  recipientId: text('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tributeName: text('tribute_name').notNull(),
  tributePronouns: jsonb('tribute_pronouns').notNull().default({
    subject: "they",
    object: "them",
    possessive: "their",
    reflexive: "themselves"
  }),
  tributeImageUrl: text('tribute_image_url'),
  tributeBio: text('tribute_bio'),
  message: text('message'),
  income: integer('income'),
  status: text('status', { enum: ['pending', 'accepted', 'rejected', 'expired', 'hidden'] }).default('pending').notNull(),
  votes: integer('votes').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (table) => ({
  nominatorIdIdx: index('idx_nominations_nominator_id').on(table.nominatorId),
  recipientIdIdx: index('idx_nominations_recipient_id').on(table.recipientId),
  statusIdx: index('idx_nominations_status').on(table.status),
}));

export const nominationVotes = pgTable('nomination_votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  nominationId: uuid('nomination_id').notNull().references(() => nominations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  nominationUserUnique: unique().on(table.nominationId, table.userId),
  nominationIdIdx: index('idx_nomination_votes_nomination_id').on(table.nominationId),
  userIdIdx: index('idx_nomination_votes_user_id').on(table.userId),
}));

export const nominationReports = pgTable('nomination_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  nominationId: uuid('nomination_id').notNull().references(() => nominations.id, { onDelete: 'cascade' }),
  reporterId: text('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason', { enum: ['inappropriate_content', 'harassment', 'spam', 'offensive', 'other'] }).notNull(),
  details: text('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  nominationReporterUnique: unique().on(table.nominationId, table.reporterId),
  nominationIdIdx: index('idx_nomination_reports_nomination_id').on(table.nominationId),
  reporterIdIdx: index('idx_nomination_reports_reporter_id').on(table.reporterId),
}));

export const games = pgTable('games', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  seasonId: uuid('season_id').references(() => seasons.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  tributeData: jsonb('tribute_data').notNull(),
  gameNumber: integer('game_number').default(1).notNull(),
  isCurrent: boolean('is_current').default(false).notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  ownerIdIdx: index('idx_games_owner_id').on(table.ownerId),
  seasonIdIdx: index('idx_games_season_id').on(table.seasonId),
  currentIdx: index('idx_games_is_current').on(table.isCurrent),
  seasonGameNumberUnique: unique().on(table.seasonId, table.gameNumber),
}));

export const gameTributes = pgTable('game_tributes', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  tributeId: uuid('tribute_id').references(() => tributes.id, { onDelete: 'set null' }),
  district: integer('district').notNull(),
  position: integer('position').notNull(),
  customTributeData: jsonb('custom_tribute_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  gameDistrictPositionUnique: unique().on(table.gameId, table.district, table.position),
  gameIdIdx: index('idx_game_tributes_game_id').on(table.gameId),
  tributeIdIdx: index('idx_game_tributes_tribute_id').on(table.tributeId),
}));

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['friend_request', 'friend_accepted', 'nomination_received', 'nomination_accepted', 'nomination_rejected', 'nomination_vote'] }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  link: text('link'),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_notifications_user_id').on(table.userId),
  readIdx: index('idx_notifications_read').on(table.read),
  createdAtIdx: index('idx_notifications_created_at').on(table.createdAt),
}));

export const customEvents = pgTable('custom_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: text('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  eventDate: timestamp('event_date', { withTimezone: true }).notNull(),
  location: text('location'),
  maxAttendees: integer('max_attendees'),
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  creatorIdIdx: index('idx_custom_events_creator_id').on(table.creatorId),
  isPublicIdx: index('idx_custom_events_is_public').on(table.isPublic),
  eventDateIdx: index('idx_custom_events_event_date').on(table.eventDate),
}));

export const eventAttendees = pgTable('event_attendees', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => customEvents.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  eventUserUnique: unique().on(table.eventId, table.userId),
  eventIdIdx: index('idx_event_attendees_event_id').on(table.eventId),
  userIdIdx: index('idx_event_attendees_user_id').on(table.userId),
}));

export const gameEvents = pgTable('game_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  eventType: gameEventTypeEnum('event_type').notNull(),
  description: text('description').notNull(),
  participantIds: jsonb('participant_ids').notNull().default([]),
  districtIds: jsonb('district_ids').notNull().default([]),
  eventData: jsonb('event_data'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  severity: gameEventSeverityEnum('severity').default('normal').notNull(),
}, (table) => ({
  gameIdIdx: index('idx_game_events_game_id').on(table.gameId),
  eventTypeIdx: index('idx_game_events_event_type').on(table.eventType),
  timestampIdx: index('idx_game_events_timestamp').on(table.timestamp),
}));

export const simulationEventTemplates = pgTable('simulation_event_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: text('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  type: simulationEventTypeEnum('type').notNull(),
  roles: jsonb('roles').notNull(),
  textTemplate: text('text_template').notNull(),
  effectJson: jsonb('effect_json'),
  status: simulationEventStatusEnum('status').default('approved').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }, (table) => ({
  creatorIdIdx: index('idx_simulation_event_templates_creator_id').on(table.creatorId),
  statusIdx: index('idx_simulation_event_templates_status').on(table.status),
}));

export const chatThreads = pgTable('chat_threads', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title'),
  status: chatThreadStatusEnum('status').default('regular').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userUnique: unique().on(table.userId),
  userIdIdx: index('idx_chat_threads_user_id').on(table.userId),
  statusIdx: index('idx_chat_threads_status').on(table.status),
}));

export const chatMessages = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  threadId: text('thread_id').notNull().references(() => chatThreads.id, { onDelete: 'cascade' }),
  parentId: text('parent_id'),
  format: text('format').notNull(),
  content: jsonb('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  threadIdIdx: index('idx_chat_messages_thread_id').on(table.threadId),
}));

// --- Relations ---

export const usersRelations = relations(users, ({ many }) => ({
  seasons: many(seasons),
  friendships: many(friendships, { relationName: 'user_friendships' }),
  receivedFriendships: many(friendships, { relationName: 'friend_received_friendships' }),
  tributes: many(tributes),
  nominationsCreated: many(nominations, { relationName: 'nominator_nominations' }),
  nominationsReceived: many(nominations, { relationName: 'recipient_nominations' }),
  votes: many(nominationVotes),
  reports: many(nominationReports),
  games: many(games),
  notifications: many(notifications),
  customEvents: many(customEvents),
  eventAttendees: many(eventAttendees),
  gameEvents: many(gameEvents),
  simulationEventTemplates: many(simulationEventTemplates),
  chatThreads: many(chatThreads),
}));

export const seasonsRelations = relations(seasons, ({ one, many }) => ({
  owner: one(users, {
    fields: [seasons.ownerId],
    references: [users.id],
  }),
  games: many(games),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(users, {
    fields: [friendships.userId],
    references: [users.id],
    relationName: 'user_friendships',
  }),
  friend: one(users, {
    fields: [friendships.friendId],
    references: [users.id],
    relationName: 'friend_received_friendships',
  }),
}));

export const tributesRelations = relations(tributes, ({ one, many }) => ({
  owner: one(users, {
    fields: [tributes.ownerId],
    references: [users.id],
  }),
  gameTributes: many(gameTributes),
}));

export const nominationsRelations = relations(nominations, ({ one, many }) => ({
  nominator: one(users, {
    fields: [nominations.nominatorId],
    references: [users.id],
    relationName: 'nominator_nominations',
  }),
  recipient: one(users, {
    fields: [nominations.recipientId],
    references: [users.id],
    relationName: 'recipient_nominations',
  }),
  votes: many(nominationVotes),
  reports: many(nominationReports),
}));

export const nominationVotesRelations = relations(nominationVotes, ({ one }) => ({
  nomination: one(nominations, {
    fields: [nominationVotes.nominationId],
    references: [nominations.id],
  }),
  user: one(users, {
    fields: [nominationVotes.userId],
    references: [users.id],
  }),
}));

export const nominationReportsRelations = relations(nominationReports, ({ one }) => ({
  nomination: one(nominations, {
    fields: [nominationReports.nominationId],
    references: [nominations.id],
  }),
  reporter: one(users, {
    fields: [nominationReports.reporterId],
    references: [users.id],
  }),
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  owner: one(users, {
    fields: [games.ownerId],
    references: [users.id],
  }),
  season: one(seasons, {
    fields: [games.seasonId],
    references: [seasons.id],
  }),
  gameTributes: many(gameTributes),
  gameEvents: many(gameEvents),
}));

export const gameTributesRelations = relations(gameTributes, ({ one }) => ({
  game: one(games, {
    fields: [gameTributes.gameId],
    references: [games.id],
  }),
  tribute: one(tributes, {
    fields: [gameTributes.tributeId],
    references: [tributes.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const customEventsRelations = relations(customEvents, ({ one, many }) => ({
  creator: one(users, {
    fields: [customEvents.creatorId],
    references: [users.id],
  }),
  attendees: many(eventAttendees),
}));

export const eventAttendeesRelations = relations(eventAttendees, ({ one }) => ({
  event: one(customEvents, {
    fields: [eventAttendees.eventId],
    references: [customEvents.id],
  }),
  user: one(users, {
    fields: [eventAttendees.userId],
    references: [users.id],
  }),
}));

export const gameEventsRelations = relations(gameEvents, ({ one }) => ({
  game: one(games, {
    fields: [gameEvents.gameId],
    references: [games.id],
  }),
}));

export const simulationEventTemplatesRelations = relations(simulationEventTemplates, ({ one }) => ({
  creator: one(users, {
    fields: [simulationEventTemplates.creatorId],
    references: [users.id],
  }),
}));

export const chatThreadsRelations = relations(chatThreads, ({ one, many }) => ({
  user: one(users, {
    fields: [chatThreads.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  thread: one(chatThreads, {
    fields: [chatMessages.threadId],
    references: [chatThreads.id],
  }),
}));
