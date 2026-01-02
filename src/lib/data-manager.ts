// Unified data management system that combines storage, database, and simulation

import { GameDatabase, Tribute, GameEvent, DatabaseValidator, DatabaseFactory, UUID, EventTemplate } from './database';
import { SimulationEventTemplate } from './supabase/types';
import { storage } from './storage';

// Data manager configuration
export interface DataManagerConfig {
  autoSave: boolean;
  cacheEnabled: boolean;
  validationEnabled: boolean;
  backupEnabled: boolean;
  maxBackups: number;
}

// Simulation configuration
export interface SimulationConfig {
  maxDays: number;
  seed?: string;
  eventVariety: 'low' | 'medium' | 'high';
  difficulty: 'easy' | 'normal' | 'hard';
  enableUserEvents: boolean;
  cacheEnabled: boolean;
}

// Data manager state
export interface DataManagerState {
  isLoading: boolean;
  isDirty: boolean;
  lastSaved: number | null;
  lastError: string | null;
  version: string;
}

// Cache interface
interface CacheData {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

// Main data manager class
export class DataManager {
  private config: DataManagerConfig;
  private state: DataManagerState;
  private database: GameDatabase | null = null;
  private simulationEngine: any = null;
  private eventTemplates: SimulationEventTemplate[] = [];
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<DataManagerConfig> = {}) {
    this.config = {
      autoSave: true,
      cacheEnabled: true,
      validationEnabled: true,
      backupEnabled: true,
      maxBackups: 5,
      ...config,
    };

    this.state = {
      isLoading: false,
      isDirty: false,
      lastSaved: null,
      lastError: null,
      version: '2.0.0',
    };
  }

  // Initialize the data manager
  async initialize(): Promise<void> {
    console.log('DataManager: initialize() called');
    this.state.isLoading = true;
    
    try {
      // Load database from storage
      await this.loadDatabase();
      
      // Load event templates
      await this.loadEventTemplates();
      
      // Validate database if enabled
      if (this.config.validationEnabled && this.database) {
        const validation = DatabaseValidator.validateDatabase(this.database);
        if (!validation.valid) {
          console.warn('Database validation failed:', validation.errors);
          this.state.lastError = validation.errors.join(', ');
        }
      }
      
      console.log('DataManager: Initialization completed', {
        database: !!this.database,
        gameStatus: this.database?.config?.gameStatus,
        tributesCount: this.database ? Object.keys(this.database.tributes).length : 0,
        templatesCount: this.eventTemplates.length
      });
      
      this.state.isLoading = false;
    } catch (error) {
      console.error('DataManager: Initialization failed', error);
      this.state.isLoading = false;
      this.state.lastError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  // Load database from storage
  private async loadDatabase(): Promise<void> {
    const storedDatabase = storage.game.get();
    
    if (storedDatabase) {
      this.database = storedDatabase;
    } else {
      // Create new database
      this.database = DatabaseFactory.createDefaultGame();
      await this.saveDatabase();
    }
  }

  // Load event templates
  private async loadEventTemplates(): Promise<void> {
    try {
      // Load core templates
      const coreTemplates = await this.loadCoreTemplates();
      
      // Load user templates if enabled
      let userTemplates: SimulationEventTemplate[] = [];
      if (this.database?.config.gameStatus !== 'setup') {
        userTemplates = await this.loadUserTemplates();
      }
      
      this.eventTemplates = [...coreTemplates, ...userTemplates];
    } catch (error) {
      console.error('Failed to load event templates:', error);
      this.eventTemplates = [];
    }
  }

  // Load core event templates
  private async loadCoreTemplates(): Promise<SimulationEventTemplate[]> {
    // Create default templates inline
    return [
      {
        id: 'default-1',
        creator_id: 'system',
        title: 'Death',
        type: 'kill',
        roles: ['victim', 'attacker'],
        text_template: '{victim} was killed by {attacker}',
        effect_json: null,
        status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'default-2', 
        creator_id: 'system',
        title: 'Alliance',
        type: 'alliance',
        roles: ['tribute1', 'tribute2'],
        text_template: '{tribute1} and {tribute2} formed an alliance',
        effect_json: null,
        status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'default-3',
        creator_id: 'system',
        title: 'Food Found',
        type: 'training',
        roles: ['tribute'],
        text_template: '{tribute} found some food',
        effect_json: null,
        status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'default-4',
        creator_id: 'system',
        title: 'Natural Death',
        type: 'kill',
        roles: ['victim'],
        text_template: '{victim} died from natural causes',
        effect_json: null,
        status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'default-5',
        creator_id: 'system',
        title: 'Sharing',
        type: 'training',
        roles: ['tribute1', 'tribute2'],
        text_template: '{tribute1} and {tribute2} shared supplies',
        effect_json: null,
        status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ];
  }

  // Load user event templates
  private async loadUserTemplates(): Promise<SimulationEventTemplate[]> {
    try {
      const cached = storage.cache.get() as CacheData;
      const cacheKey = 'user-templates';
      const cachedTemplates = cached[cacheKey];
      
      if (cachedTemplates && Date.now() - cachedTemplates.timestamp < 10 * 60 * 1000) {
        return cachedTemplates.data;
      }
      
      // Fetch from API
      const response = await fetch('/api/simulation-events?includeMine=true');
      if (!response.ok) return [];
      
      const data = await response.json();
      const templates = data.data || [];
      
      // Cache the templates
      if (this.config.cacheEnabled) {
        storage.cache.set({
          ...cached,
          [cacheKey]: {
            data: templates,
            timestamp: Date.now(),
          },
        });
      }
      
      return templates;
    } catch (error) {
      console.warn('Failed to load user templates:', error);
      return [];
    }
  }

  // Save database to storage
  private async saveDatabase(): Promise<void> {
    if (!this.database) return;
    
    try {
      // Update timestamps
      this.database.updatedAt = Date.now();
      
      // Create backup if enabled
      if (this.config.backupEnabled) {
        await this.createBackup();
      }
      
      // Save to storage
      const success = storage.game.set(this.database as any);
      
      if (success) {
        this.state.lastSaved = Date.now();
        this.state.isDirty = false;
        this.state.lastError = null;
      } else {
        throw new Error('Failed to save to storage');
      }
    } catch (error) {
      this.state.lastError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  // Create backup
  private async createBackup(): Promise<void> {
    if (!this.database) return;
    
    const backups = storage.cache.get() as CacheData;
    const backupKey = `backup-${Date.now()}`;
    
    backups[backupKey] = {
      data: JSON.parse(JSON.stringify(this.database)),
      timestamp: Date.now(),
    };
    
    // Remove old backups
    const backupKeys = Object.keys(backups).filter(key => key.startsWith('backup-'));
    if (backupKeys.length > this.config.maxBackups) {
      const sortedKeys = backupKeys.sort((a, b) => {
        const timeA = parseInt(a.split('-')[1]);
        const timeB = parseInt(b.split('-')[1]);
        return timeA - timeB;
      });
      
      // Remove oldest backups
      while (sortedKeys.length > this.config.maxBackups) {
        const oldestKey = sortedKeys.shift()!;
        delete backups[oldestKey];
      }
    }
    
    storage.cache.set(backups);
  }

  // Mark database as dirty (needs saving)
  private markDirty(): void {
    this.state.isDirty = true;
    
    if (this.config.autoSave) {
      this.scheduleAutoSave();
    }
  }

  // Schedule auto-save
  private scheduleAutoSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    this.saveTimer = setTimeout(() => {
      this.saveDatabase().catch(error => {
        console.error('Auto-save failed:', error);
      });
    }, 1000); // Save after 1 second of inactivity
  }

  // Public API methods

  // Get current database
  getDatabase(): GameDatabase | null {
    return this.database;
  }

  // Get current state
  getState(): DataManagerState {
    return { ...this.state };
  }

  // Update tribute
  updateTribute(tributeId: string, updates: Partial<Tribute>): boolean {
    if (!this.database || !this.database.tributes[tributeId]) return false;
    
    const tribute = this.database.tributes[tributeId];
    const updatedTribute = DatabaseValidator.sanitizeTribute({ ...tribute, ...updates });
    
    this.database.tributes[tributeId] = updatedTribute;
    this.database.updatedAt = Date.now();
    
    this.markDirty();
    return true;
  }

  // Add new tribute
  addTribute(tributeData: Partial<Tribute>): UUID | null {
    if (!this.database) return null;
    
    const tribute = DatabaseValidator.sanitizeTribute(tributeData);
    this.database.tributes[tribute.id] = tribute;
    this.database.updatedAt = Date.now();
    
    this.markDirty();
    return tribute.id;
  }

  // Remove tribute
  removeTribute(tributeId: string): boolean {
    if (!this.database || !this.database.tributes[tributeId]) return false;
    
    delete this.database.tributes[tributeId];
    this.database.updatedAt = Date.now();
    
    this.markDirty();
    return true;
  }

  // Run simulation
  async runSimulation(config?: Partial<SimulationConfig>): Promise<GameDatabase> {
    if (!this.database) throw new Error('No database available');
    
    console.log('DataManager: Running simple simulation');
    
    // Create simple events directly
    const simpleEvents: Record<number, GameEvent[]> = {
      1: [
        {
          id: 'event-1-1',
          templateId: 'default-1',
          day: 1,
          description: [{ role: 'victim', prop: 'name' }, ' was killed by ', { role: 'attacker', prop: 'name' }],
          roles: { victim: 'tribute-1', attacker: 'tribute-2' },
          outcomes: {
            deaths: ['tribute-1'],
            injuries: [],
            alliances: [],
            trustChanges: {},
          },
          metadata: {
            generatedAt: Date.now(),
            seed: 'simple-sim',
          },
        },
        {
          id: 'event-1-2',
          templateId: 'default-2',
          day: 1,
          description: [{ role: 'tribute1', prop: 'name' }, ' and ', { role: 'tribute2', prop: 'name' }, ' formed an alliance'],
          roles: { tribute1: 'tribute-3', tribute2: 'tribute-4' },
          outcomes: {
            deaths: [],
            injuries: [],
            alliances: [['tribute-3', 'tribute-4']],
            trustChanges: {},
          },
          metadata: {
            generatedAt: Date.now(),
            seed: 'simple-sim',
          },
        }
      ],
      2: [
        {
          id: 'event-2-1',
          templateId: 'default-3',
          day: 2,
          description: [{ role: 'tribute', prop: 'name' }, ' found some food'],
          roles: { tribute: 'tribute-5' },
          outcomes: {
            deaths: [],
            injuries: [],
            alliances: [],
            trustChanges: {},
          },
          metadata: {
            generatedAt: Date.now(),
            seed: 'simple-sim',
          },
        }
      ]
    };
    
    // Update database with events
    this.database.events = simpleEvents;
    this.database.metadata.totalEvents = Object.values(simpleEvents).reduce((sum, events) => sum + events.length, 0);
    this.database.config.currentDay = 2;
    this.database.config.gameStatus = 'finished';
    
    console.log('DataManager: Simple simulation completed', {
      eventsCount: Object.keys(simpleEvents).length,
      totalEvents: this.database.metadata.totalEvents
    });
    
    this.markDirty();
    return this.database;
  }

  // Regenerate events
  async regenerateEvents(): Promise<GameDatabase> {
    if (!this.database) throw new Error('No database available');
    
    // Clear existing events
    this.database.events = {};
    this.database.state.deaths = {};
    this.database.metadata.totalEvents = 0;
    this.database.metadata.totalDeaths = 0;
    
    // Reset game status
    this.database.config.gameStatus = 'setup';
    this.database.config.currentDay = 0;
    
    // Reset tribute stats
    Object.values(this.database.tributes).forEach(tribute => {
      tribute.stats = {
        kills: 0,
        daysSurvived: 0,
        eventsParticipated: 0,
      };
      tribute.alive = true;
      tribute.health = { physical: 100, mental: 100 };
    });
    
    // Run new simulation
    return this.runSimulation();
  }

  // Force save
  async forceSave(): Promise<boolean> {
    try {
      await this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Force save failed:', error);
      return false;
    }
  }

  // Reset database
  async resetDatabase(): Promise<void> {
    this.database = DatabaseFactory.createDefaultGame();
    await this.saveDatabase();
  }

  // Export database
  exportDatabase(): string {
    if (!this.database) throw new Error('No database available');
    return JSON.stringify(this.database, null, 2);
  }

  // Import database
  async importDatabase(jsonData: string): Promise<void> {
    try {
      const database = JSON.parse(jsonData) as GameDatabase;
      
      // Validate imported database
      const validation = DatabaseValidator.validateDatabase(database);
      if (!validation.valid) {
        throw new Error(`Invalid database: ${validation.errors.join(', ')}`);
      }
      
      this.database = database;
      await this.saveDatabase();
    } catch (error) {
      throw new Error(`Failed to import database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get statistics
  getStatistics(): any {
    if (!this.database) return null;
    
    const tributes = Object.values(this.database.tributes);
    const aliveTributes = tributes.filter(t => t.alive);
    const deadTributes = tributes.filter(t => !t.alive);
    
    return {
      totalTributes: tributes.length,
      aliveTributes: aliveTributes.length,
      deadTributes: deadTributes.length,
      totalEvents: this.database.metadata.totalEvents,
      totalDeaths: this.database.metadata.totalDeaths,
      averageLifespan: this.database.metadata.averageLifespan,
      mostDangerousDay: this.database.metadata.mostDangerousDay,
      currentDay: this.database.config.currentDay,
      gameStatus: this.database.config.gameStatus,
      winner: this.database.config.winner,
    };
  }

  // Cleanup
  cleanup(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }
}

// Singleton instance
let dataManagerInstance: DataManager | null = null;

export function getDataManager(): DataManager {
  if (!dataManagerInstance) {
    dataManagerInstance = new DataManager();
  }
  return dataManagerInstance;
}

// React hook for data manager (to be used in components)
// This should be imported in React components, not here
export function createDataManagerHook() {
  // This function returns a hook that can be used in React components
  // The actual implementation should be in a separate file that imports React
  return () => {
    // This is a placeholder - the actual hook should be implemented in a React component file
    throw new Error('This hook should be imported from a React component file');
  };
}
