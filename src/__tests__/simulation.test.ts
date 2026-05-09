import { describe, it, expect } from 'vitest';
import { simulateGame, simulateDay } from '../lib/simulation';
import { templates } from '../lib/events';
import { HngrDB, Tribute, normalizeDatabase } from '../lib/setup';
import { canUseItem, consumeItemForTribute } from '../lib/social';
import { getDepotPreset, listInventoryItems } from '../lib/inventory';

function createTribute(id: string, name: string): Tribute {
  return {
    id,
    name,
    pronouns: { subject: 'they', object: 'them', possessive: 'their', reflexive: 'themselves' },
    image: null,
    bio: 'Test tribute',
    district: Number(id),
    health: { physical: 100, mental: 100 },
    foodLvl: 5,
    inventory: {},
    relationships: { [id]: { trust: 0, alliance: false } },
  };
}

function createDb(): HngrDB {
  return {
    tributeReferralName: { singular: 'tribute', plural: 'tributes' },
    tributes: {
      '1': createTribute('1', 'Alice'),
      '2': createTribute('2', 'Bob'),
      '3': createTribute('3', 'Charlie'),
    },
    events: {},
    depot: { presetId: 'balanced' },
    alliances: {},
  };
}

describe('simulation', () => {
  it('keeps the shared template registry intact', () => {
    const before = templates.length;
    simulateGame(createDb(), 5);
    expect(templates.length).toBe(before);
  });

  it('adds a depot opening on day 1', () => {
    const events = simulateGame(createDb(), 5);
    expect(events[1]?.some((event) => event.templateId === 'depot')).toBe(true);
  });

  it('returns a winner', () => {
    const events = simulateGame(createDb(), 10);
    const winnerEvents = Object.values(events).flat().filter((event) => event.id === 'winner');

    expect(winnerEvents).toHaveLength(1);
    expect(winnerEvents[0].roles).toHaveProperty('winner');
  });

  it('supports the new inventory helpers', () => {
    const db = createDb();
    db.tributes['1'].inventory = { bow: 1, arrows: 2 };

    expect(canUseItem(db, '1', 'bow')).toBe(true);
    expect(consumeItemForTribute(db, '1', 'arrows', 1)).toBe(true);
    expect(db.tributes['1'].inventory.arrows).toBe(1);
    expect(listInventoryItems(db.tributes['1'].inventory).length).toBe(2);
    expect(getDepotPreset('cornucopia').stock.bow).toBeGreaterThan(0);
  });

  it('normalizes missing inventory and depot state', () => {
    const normalized = normalizeDatabase({
      tributeReferralName: { singular: 'tribute', plural: 'tributes' },
      tributes: {
        '1': {
          ...createTribute('1', 'Legacy'),
          inventory: undefined as any,
        },
      },
      events: [] as any,
    });

    expect(normalized.depot.presetId).toBe('balanced');
    expect(normalized.tributes['1'].inventory).toEqual({});
    expect(normalized.events).toEqual({});
  });

  it('generates day events', () => {
    const events = simulateDay(createDb());
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
  });
});
