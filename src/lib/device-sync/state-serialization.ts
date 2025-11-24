/**
 * State serialization and deserialization for device synchronization
 * Handles HngrDB type with proper validation and integrity checks
 */

import type { HngrDB, Tribute, Event, Relationship } from '../setup';

export interface SerializedState {
  version: string;
  timestamp: number;
  checksum: string;
  data: HngrDB;
  metadata: {
    tributeCount: number;
    eventCount: number;
    referralName: string;
  };
}

export interface TransferChunk {
  id: string;
  index: number;
  total: number;
  data: string; // Base64 encoded chunk
}

export interface TransferManifest {
  stateId: string;
  totalChunks: number;
  totalSize: number;
  checksum: string;
  metadata: SerializedState['metadata'];
}

/**
 * Serialize HngrDB state for transfer
 */
export function serializeState(db: HngrDB): SerializedState {
  const timestamp = Date.now();
  const version = '1.0.0';

  // Deep clone to avoid mutations
  const data: HngrDB = {
    tributeReferralName: { ...db.tributeReferralName },
    tributes: {},
    events: {},
  };

  // Serialize tributes with relationships
  for (const [id, tribute] of Object.entries(db.tributes)) {
    data.tributes[id] = {
      ...tribute,
      relationships: { ...tribute.relationships },
    };
  }

  // Serialize events
  for (const [day, dayEvents] of Object.entries(db.events)) {
    data.events[parseInt(day)] = dayEvents.map(event => ({ ...event }));
  }

  // Calculate metadata
  const metadata = {
    tributeCount: Object.keys(data.tributes).length,
    eventCount: Object.values(data.events).reduce((sum, events) => sum + events.length, 0),
    referralName: data.tributeReferralName.plural,
  };

  // Create checksum for integrity verification
  const checksum = generateChecksum(data);

  return {
    version,
    timestamp,
    checksum,
    data,
    metadata,
  };
}

/**
 * Deserialize state with validation
 */
export function deserializeState(serialized: SerializedState): HngrDB {
  // Validate version compatibility
  if (!isVersionCompatible(serialized.version)) {
    throw new Error(`Incompatible state version: ${serialized.version}`);
  }

  // Verify checksum
  const calculatedChecksum = generateChecksum(serialized.data);
  if (calculatedChecksum !== serialized.checksum) {
    throw new Error('State integrity check failed - checksum mismatch');
  }

  // Validate structure
  validateHngrDB(serialized.data);

  // Return deep clone to prevent mutations
  return {
    tributeReferralName: { ...serialized.data.tributeReferralName },
    tributes: Object.fromEntries(
      Object.entries(serialized.data.tributes).map(([id, tribute]) => [
        id,
        {
          ...tribute,
          relationships: { ...tribute.relationships },
        },
      ])
    ),
    events: Object.fromEntries(
      Object.entries(serialized.data.events).map(([day, events]) => [
        parseInt(day),
        events.map(event => ({ ...event })),
      ])
    ),
  };
}

/**
 * Split large state into transferrable chunks
 */
export function chunkState(serialized: SerializedState, chunkSize: number = 64 * 1024): TransferChunk[] {
  const jsonString = JSON.stringify(serialized);
  const encodedData = btoa(jsonString); // Base64 encode for safe transfer
  const totalSize = encodedData.length;
  const chunks: TransferChunk[] = [];

  const stateId = crypto.randomUUID();
  const totalChunks = Math.ceil(totalSize / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, totalSize);
    const chunkData = encodedData.slice(start, end);

    chunks.push({
      id: stateId,
      index: i,
      total: totalChunks,
      data: chunkData,
    });
  }

  return chunks;
}

/**
 * Reassemble state from chunks
 */
export function reassembleState(chunks: TransferChunk[]): SerializedState {
  if (chunks.length === 0) {
    throw new Error('No chunks provided');
  }

  // Sort chunks by index
  chunks.sort((a, b) => a.index - b.index);

  // Verify all chunks belong to same transfer
  const stateId = chunks[0].id;
  if (!chunks.every(chunk => chunk.id === stateId)) {
    throw new Error('Chunks from different transfers detected');
  }

  // Verify we have all chunks
  const expectedChunks = chunks[0].total;
  if (chunks.length !== expectedChunks) {
    throw new Error(`Incomplete transfer: received ${chunks.length}/${expectedChunks} chunks`);
  }

  // Verify chunk indices are consecutive
  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i].index !== i) {
      throw new Error(`Missing chunk at index ${i}`);
    }
  }

  // Combine chunks
  const combinedData = chunks.map(chunk => chunk.data).join('');
  const jsonString = atob(combinedData); // Base64 decode

  try {
    const serialized: SerializedState = JSON.parse(jsonString);
    return serialized;
  } catch (error) {
    throw new Error(`Failed to parse reassembled data: ${error}`);
  }
}

/**
 * Create transfer manifest for chunked transfer
 */
export function createTransferManifest(serialized: SerializedState, chunks: TransferChunk[]): TransferManifest {
  return {
    stateId: chunks[0]?.id || crypto.randomUUID(),
    totalChunks: chunks.length,
    totalSize: chunks.reduce((sum, chunk) => sum + chunk.data.length, 0),
    checksum: serialized.checksum,
    metadata: serialized.metadata,
  };
}

/**
 * Validate HngrDB structure
 */
function validateHngrDB(db: HngrDB): void {
  if (!db.tributeReferralName || typeof db.tributeReferralName.singular !== 'string' || typeof db.tributeReferralName.plural !== 'string') {
    throw new Error('Invalid tribute referral name structure');
  }

  if (!db.tributes || typeof db.tributes !== 'object') {
    throw new Error('Invalid tributes structure');
  }

  if (!db.events || typeof db.events !== 'object') {
    throw new Error('Invalid events structure');
  }

  // Validate each tribute
  for (const [id, tribute] of Object.entries(db.tributes)) {
    validateTribute(id, tribute);
  }

  // Validate relationship reciprocity
  validateRelationships(db.tributes);
}

/**
 * Validate individual tribute
 */
function validateTribute(id: string, tribute: Tribute): void {
  if (!tribute.name || typeof tribute.name !== 'string') {
    throw new Error(`Tribute ${id}: invalid name`);
  }

  if (!tribute.pronouns || typeof tribute.pronouns !== 'object') {
    throw new Error(`Tribute ${id}: invalid pronouns`);
  }

  if (typeof tribute.district !== 'number' || tribute.district < 1 || tribute.district > 12) {
    throw new Error(`Tribute ${id}: invalid district`);
  }

  if (!tribute.health || typeof tribute.health.physical !== 'number' || typeof tribute.health.mental !== 'number') {
    throw new Error(`Tribute ${id}: invalid health`);
  }

  if (typeof tribute.foodLvl !== 'number') {
    throw new Error(`Tribute ${id}: invalid food level`);
  }

  if (!tribute.relationships || typeof tribute.relationships !== 'object') {
    throw new Error(`Tribute ${id}: invalid relationships`);
  }
}

/**
 * Validate relationship reciprocity and consistency
 */
function validateRelationships(tributes: Record<string, Tribute>): void {
  const tributeIds = new Set(Object.keys(tributes));

  for (const [tributeId, tribute] of Object.entries(tributes)) {
    for (const [targetId, relationship] of Object.entries(tribute.relationships)) {
      // Check if target tribute exists
      if (!tributeIds.has(targetId)) {
        throw new Error(`Relationship from ${tributeId} to non-existent tribute ${targetId}`);
      }

      // Validate relationship structure
      if (typeof relationship.trust !== 'number' || relationship.trust < -100 || relationship.trust > 100) {
        throw new Error(`Invalid trust value in relationship ${tributeId} -> ${targetId}`);
      }

      if (typeof relationship.alliance !== 'boolean') {
        throw new Error(`Invalid alliance value in relationship ${tributeId} -> ${targetId}`);
      }

      // Note: We don't enforce strict reciprocity as relationships can be one-way
      // But we could add warnings for asymmetric alliances if desired
    }
  }
}

/**
 * Generate checksum for state integrity
 */
function generateChecksum(data: HngrDB): string {
  const jsonString = JSON.stringify(data, Object.keys(data).sort());
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonString);

  return crypto.subtle.digest('SHA-256', dataBuffer)
    .then(hash => Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    );
}

/**
 * Check version compatibility
 */
function isVersionCompatible(version: string): boolean {
  const currentVersion = '1.0.0';
  const [currentMajor] = currentVersion.split('.').map(Number);
  const [targetMajor] = version.split('.').map(Number);

  // Only allow same major version for now
  return currentMajor === targetMajor;
}

/**
 * Calculate transfer progress
 */
export function calculateTransferProgress(receivedChunks: number, totalChunks: number): number {
  if (totalChunks === 0) return 100;
  return Math.round((receivedChunks / totalChunks) * 100);
}
