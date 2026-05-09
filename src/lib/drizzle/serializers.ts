import type { DbUser } from './server';

export function serializeUser(user: any | null | undefined) {
  if (!user) return user;
  return {
    id: user.id,
    email: user.email,
    username: user.username ?? null,
    display_name: user.displayName ?? user.display_name ?? null,
    avatar_url: user.avatarUrl ?? user.avatar_url ?? null,
    is_plus: user.isPlus ?? user.is_plus ?? false,
    plus_expires_at: user.plusExpiresAt ?? user.plus_expires_at ?? null,
    created_at: user.createdAt ?? user.created_at,
    updated_at: user.updatedAt ?? user.updated_at,
  };
}

export function serializeSeason(season: any) {
  return {
    id: season.id,
    owner_id: season.ownerId ?? season.owner_id,
    name: season.name,
    description: season.description ?? null,
    status: season.status,
    current_game_id: season.currentGameId ?? season.current_game_id ?? null,
    created_at: season.createdAt ?? season.created_at,
    updated_at: season.updatedAt ?? season.updated_at,
  };
}

export function serializeGame(game: any) {
  return {
    id: game.id,
    owner_id: game.ownerId ?? game.owner_id,
    season_id: game.seasonId ?? game.season_id ?? null,
    name: game.name,
    tribute_data: game.tributeData ?? game.tribute_data,
    game_number: game.gameNumber ?? game.game_number ?? 1,
    is_current: game.isCurrent ?? game.is_current ?? false,
    is_public: game.isPublic ?? game.is_public ?? false,
    created_at: game.createdAt ?? game.created_at,
    updated_at: game.updatedAt ?? game.updated_at,
  };
}

export function serializeCustomEvent(event: any) {
  return {
    id: event.id,
    creator_id: event.creatorId ?? event.creator_id,
    title: event.title,
    description: event.description ?? null,
    event_date: event.eventDate ?? event.event_date,
    location: event.location ?? null,
    max_attendees: event.maxAttendees ?? event.max_attendees ?? null,
    is_public: event.isPublic ?? event.is_public ?? false,
    created_at: event.createdAt ?? event.created_at,
    updated_at: event.updatedAt ?? event.updated_at,
    creator: serializeUser(event.creator),
    attendees: (event.attendees ?? []).map((attendee: any) => serializeEventAttendee(attendee)),
    attendee_count: event.attendee_count ?? (event.attendees?.length ?? 0),
  };
}

export function serializeEventAttendee(attendee: any) {
  return {
    id: attendee.id,
    event_id: attendee.eventId ?? attendee.event_id,
    user_id: attendee.userId ?? attendee.user_id,
    joined_at: attendee.joinedAt ?? attendee.joined_at,
    user: serializeUser(attendee.user),
  };
}

export function serializeGameEvent(event: any) {
  return {
    id: event.id,
    game_id: event.gameId ?? event.game_id,
    event_type: event.eventType ?? event.event_type,
    description: event.description,
    participant_ids: event.participantIds ?? event.participant_ids ?? [],
    district_ids: event.districtIds ?? event.district_ids ?? [],
    event_data: event.eventData ?? event.event_data ?? null,
    timestamp: event.timestamp,
    severity: event.severity,
  };
}

export function serializeSimulationEventTemplate(template: any) {
  return {
    id: template.id,
    creator_id: template.creatorId ?? template.creator_id,
    title: template.title,
    type: template.type,
    roles: template.roles,
    text_template: template.textTemplate ?? template.text_template,
    effect_json: template.effectJson ?? template.effect_json ?? null,
    status: template.status,
    created_at: template.createdAt ?? template.created_at,
    updated_at: template.updatedAt ?? template.updated_at,
    creator: serializeUser(template.creator),
  };
}
