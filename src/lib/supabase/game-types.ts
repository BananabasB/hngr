export interface GameEvent {
  id: string;
  game_id: string;
  event_type: 'kill' | 'death' | 'alliance' | 'item_found' | 'winner' | 'game_start' | 'game_end';
  description: string;
  participant_ids: string[];
  district_ids: number[];
  event_data?: {
    killer_id?: string;
    victim_id?: string;
    weapon?: string;
    location?: string;
    cause?: string;
    alliance_members?: string[];
    item_name?: string;
    winning_district?: number;
    game_duration?: string;
  };
  timestamp: string;
  severity: 'minor' | 'normal' | 'major' | 'critical';
}

export interface CreateGameEventRequest {
  game_id: string;
  event_type: GameEvent['event_type'];
  description: string;
  participant_ids?: string[];
  district_ids?: number[];
  event_data?: GameEvent['event_data'];
  severity?: GameEvent['severity'];
}

export interface GameEventWithDetails extends GameEvent {
  participants?: Array<{
    id: string;
    name: string;
    district: number;
  }>;
}
