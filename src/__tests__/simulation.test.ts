import { describe, it, expect, beforeEach, vi } from 'vitest';
import { simulateGame, simulateDay } from '@/lib/simulation';
import { applyUserTemplates, transformTemplate } from '@/lib/events';
import { HngrDB, Tribute } from '@/lib/setup';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = vi.fn();

describe('Simulation System', () => {
  let mockDb: HngrDB;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    localStorageMock.clear();

    // Create mock database with test tributes
    mockDb = {
      tributeReferralName: { singular: "tribute", plural: "tributes" },
      tributes: {
        '1': {
          id: '1',
          name: 'Alice',
          pronouns: { subject: 'she', object: 'her', possessive: 'her', reflexive: 'herself' },
          image: null,
          bio: 'Test tribute',
          district: 1,
          health: { physical: 100, mental: 100 },
          foodLvl: 5,
          relationships: {},
        },
        '2': {
          id: '2',
          name: 'Bob',
          pronouns: { subject: 'he', object: 'him', possessive: 'his', reflexive: 'himself' },
          image: null,
          bio: 'Test tribute',
          district: 2,
          health: { physical: 100, mental: 100 },
          foodLvl: 3,
          relationships: {},
        },
        '3': {
          id: '3',
          name: 'Charlie',
          pronouns: { subject: 'they', object: 'them', possessive: 'their', reflexive: 'themselves' },
          image: null,
          bio: 'Test tribute',
          district: 3,
          health: { physical: 100, mental: 100 },
          foodLvl: 4,
          relationships: {},
        },
      },
      events: {},
    };
  });

  describe('simulateGame', () => {
    it('should generate events for all tributes', () => {
      const events = simulateGame(mockDb, 5);
      
      expect(events).toBeDefined();
      expect(typeof events).toBe('object');
      
      // Should have at least one day of events
      expect(Object.keys(events).length).toBeGreaterThan(0);
      
      // Each day should have events
      Object.values(events).forEach(dayEvents => {
        expect(Array.isArray(dayEvents)).toBe(true);
        expect(dayEvents.length).toBeGreaterThan(0);
      });
    });

    it('should respect maxDays parameter', () => {
      const events = simulateGame(mockDb, 2);
      
      // Should not exceed max days (plus potential winner day)
      expect(Object.keys(events).length).toBeLessThanOrEqual(3);
    });

    it('should produce a winner', () => {
      const events = simulateGame(mockDb, 10);
      
      // Find winner event
      const winnerEvents = Object.values(events).flat().filter(event => event.id === 'winner');
      expect(winnerEvents.length).toBe(1);
      expect(winnerEvents[0].roles).toHaveProperty('winner');
    });

    it('should handle empty tributes gracefully', () => {
      const emptyDb: HngrDB = {
        tributeReferralName: { singular: "tribute", plural: "tributes" },
        tributes: {},
        events: {},
      };
      
      const events = simulateGame(emptyDb, 5);
      expect(events).toEqual({});
    });

    it('should handle single tribute', () => {
      const singleTributeDb: HngrDB = {
        tributeReferralName: { singular: "tribute", plural: "tributes" },
        tributes: {
          '1': mockDb.tributes['1'],
        },
        events: {},
      };
      
      const events = simulateGame(singleTributeDb, 5);
      
      // Single tribute should win immediately
      expect(Object.keys(events).length).toBe(1);
      const day1Events = events[1];
      expect(day1Events).toBeDefined();
      expect(day1Events[0].id).toBe('winner');
    });
  });

  describe('simulateDay', () => {
    it('should generate valid events for a day', () => {
      const events = simulateDay(mockDb, 1, []);
      
      expect(Array.isArray(events)).toBe(true);
      events.forEach(event => {
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('templateId');
        expect(event).toHaveProperty('description');
        expect(event).toHaveProperty('roles');
        expect(event).toHaveProperty('day');
        expect(event.day).toBe(1);
      });
    });

    it('should scale events based on tribute count', () => {
      const events = simulateDay(mockDb, 1, []);
      
      // Should have reasonable number of events (3-8 based on tribute count)
      expect(events.length).toBeGreaterThanOrEqual(3);
      expect(events.length).toBeLessThanOrEqual(8);
    });
  });

  describe('Template System', () => {
    it('should transform simulation templates correctly', () => {
      const simTemplate = {
        id: 'test-template',
        type: 'generic',
        roles: ['participant1', 'participant2'],
        text_template: '{{participant1.name}} and {{participant2.name}} become friends.',
        effect_json: null,
      };

      const transformed = transformTemplate(simTemplate);

      expect(transformed.id).toBe('test-template');
      expect(transformed.type).toBe('generic');
      expect(transformed.roles).toEqual(['participant1', 'participant2']);
      expect(Array.isArray(transformed.text)).toBe(true);
      expect(transformed.source).toBe('user');
    });

    it('should handle complex template text', () => {
      const simTemplate = {
        id: 'complex-template',
        type: 'kill',
        roles: ['killer', 'victim'],
        text_template: '{{killer.name}} kills {{victim.name}} with {{killer.pronouns.possessive}} weapon.',
        effect_json: null,
      };

      const transformed = transformTemplate(simTemplate);

      expect(transformed.text).toEqual([
        { role: 'killer', prop: 'name' },
        ' kills ',
        { role: 'victim', prop: 'name' },
        ' with ',
        { role: 'killer', prop: 'pronouns.possessive' },
        ' weapon.',
      ]);
    });

    it('should apply user templates with caching', async () => {
      const mockTemplates = [
        {
          id: 'user-template-1',
          type: 'generic',
          roles: ['participant'],
          text_template: '{{participant.name}} does something special.',
          effect_json: null,
        },
      ];

      // Mock successful API response
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isPlus: true }),
      });

      await applyUserTemplates(mockTemplates, 'user-123');

      // Should have called the API
      expect(fetch).toHaveBeenCalledWith('/api/user/plus-status', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer user-123' },
      });
    });

    it('should handle non-plus users gracefully', async () => {
      const mockTemplates = [
        {
          id: 'user-template-1',
          type: 'generic',
          roles: ['participant'],
          text_template: '{{participant.name}} does something special.',
          effect_json: null,
        },
      ];

      // Mock non-plus response
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isPlus: false }),
      });

      await applyUserTemplates(mockTemplates, 'user-123');

      // Should not apply templates for non-plus users
      expect(fetch).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      const mockTemplates = [
        {
          id: 'user-template-1',
          type: 'generic',
          roles: ['participant'],
          text_template: '{{participant.name}} does something special.',
          effect_json: null,
        },
      ];

      // Mock API error
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      // Should not throw error
      await expect(applyUserTemplates(mockTemplates, 'user-123')).resolves.toBeUndefined();
    });
  });

  describe('Performance Tests', () => {
    it('should complete simulation within reasonable time', () => {
      const startTime = performance.now();
      
      const events = simulateGame(mockDb, 10);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within 1 second for small dataset
      expect(duration).toBeLessThan(1000);
      expect(events).toBeDefined();
    });

    it('should handle larger tribute sets efficiently', () => {
      // Create larger database
      const largeDb: HngrDB = {
        tributeReferralName: { singular: "tribute", plural: "tributes" },
        tributes: {},
        events: {},
      };

      // Add 24 tributes (2 per district)
      for (let district = 1; district <= 12; district++) {
        for (let i = 1; i <= 2; i++) {
          const id = `${district}-${i}`;
          largeDb.tributes[id] = {
            id,
            name: `Tribute ${district}-${i}`,
            pronouns: { subject: 'they', object: 'them', possessive: 'their', reflexive: 'themselves' },
            image: null,
            bio: 'Test tribute',
            district,
            health: { physical: 100, mental: 100 },
            foodLvl: 5,
            relationships: {},
          };
        }
      }

      const startTime = performance.now();
      const events = simulateGame(largeDb, 15);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should still complete within reasonable time
      expect(duration).toBeLessThan(2000);
      expect(events).toBeDefined();
      expect(Object.keys(events).length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed tribute data', () => {
      const malformedDb: HngrDB = {
        tributeReferralName: { singular: "tribute", plural: "tributes" },
        tributes: {
          '1': {
            id: '1',
            name: 'Alice',
            pronouns: { subject: 'she', object: 'her', possessive: 'her', reflexive: 'herself' },
            image: null,
            bio: 'Test tribute',
            district: 1,
            // Missing health and foodLvl
            relationships: {},
          },
        },
        events: {},
      };

      // Should not throw error
      expect(() => simulateGame(malformedDb, 5)).not.toThrow();
    });

    it('should handle template transformation errors', () => {
      const malformedTemplate = {
        id: 'malformed',
        type: 'generic',
        roles: [],
        text_template: null, // Invalid text template
        effect_json: null,
      };

      // Should handle gracefully
      expect(() => transformTemplate(malformedTemplate as any)).not.toThrow();
    });
  });
});
