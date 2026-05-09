/**
 * Transfer protocol for DS Suitcase-style device synchronization
 * Implements freeze → transfer → resume workflow with state management
 */

import type { HngrDB } from '../setup';
import type { DeviceSyncManager, TransferState } from './webrtc';
import {
  serializeState,
  deserializeState,
  chunkState,
  reassembleState,
  calculateTransferProgress,
  type SerializedState,
  type TransferChunk,
  type TransferManifest
} from './state-serialization';

export interface TransferSession {
  id: string;
  hostDeviceId: string;
  secondaryDeviceId: string;
  status: 'preparing' | 'freezing' | 'transferring' | 'resuming' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  manifest?: TransferManifest;
  progress: number;
  error?: string;
  frozenState?: HngrDB;
}

export interface TransferProtocolConfig {
  chunkSize: number;
  timeoutMs: number;
  maxRetries: number;
}

const DEFAULT_CONFIG: TransferProtocolConfig = {
  chunkSize: 64 * 1024, // 64KB chunks
  timeoutMs: 30000, // 30 seconds
  maxRetries: 3,
};

/**
 * Host-side transfer coordinator
 */
export class TransferHost {
  private session: TransferSession;
  private config: TransferProtocolConfig;
  private syncManager: DeviceSyncManager;
  private originalState: HngrDB;
  private serializedState?: SerializedState;
  private chunks?: TransferChunk[];
  private onProgress?: (progress: number, status: string) => void;

  constructor(
    hostDeviceId: string,
    secondaryDeviceId: string,
    originalState: HngrDB,
    syncManager: DeviceSyncManager,
    config: Partial<TransferProtocolConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.syncManager = syncManager;
    this.originalState = originalState;

    this.session = {
      id: crypto.randomUUID(),
      hostDeviceId,
      secondaryDeviceId,
      status: 'preparing',
      startTime: Date.now(),
      progress: 0,
    };
  }

  /**
   * Start the transfer process
   */
  async startTransfer(): Promise<void> {
    try {
      this.updateStatus('freezing');
      await this.freezeState();

      this.updateStatus('transferring');
      await this.transferState();

      this.updateStatus('completed');
      this.session.endTime = Date.now();

    } catch (error) {
      this.session.status = 'failed';
      this.session.error = error instanceof Error ? error.message : 'Unknown error';
      this.session.endTime = Date.now();
      throw error;
    }
  }

  /**
   * Freeze the current state for transfer
   */
  private async freezeState(): Promise<void> {
    this.updateProgress(10, 'Freezing state...');

    // Serialize the current state
    this.serializedState = await serializeState(this.originalState);
    this.session.frozenState = this.originalState;

    // Create chunks for transfer
    this.chunks = chunkState(this.serializedState, this.config.chunkSize);

    // Create transfer manifest
    this.session.manifest = {
      stateId: this.chunks[0]?.id || crypto.randomUUID(),
      totalChunks: this.chunks.length,
      totalSize: this.chunks.reduce((sum, chunk) => sum + chunk.data.length, 0),
      checksum: this.serializedState.checksum,
      metadata: this.serializedState.metadata,
    };

    this.updateProgress(25, 'State frozen and chunked');
  }

  /**
   * Transfer the state to secondary device
   */
  private async transferState(): Promise<void> {
    if (!this.chunks || !this.session.manifest) {
      throw new Error('State not prepared for transfer');
    }

    // Send manifest first
    this.updateProgress(30, 'Sending transfer manifest...');
    await this.syncManager.sendData({
      type: 'transfer-manifest',
      sessionId: this.session.id,
      manifest: this.session.manifest,
    });

    // Send chunks
    const totalChunks = this.chunks.length;
    for (let i = 0; i < totalChunks; i++) {
      const chunk = this.chunks[i];
      const progress = 30 + Math.round((i / totalChunks) * 60); // 30-90%

      this.updateProgress(progress, `Sending chunk ${i + 1}/${totalChunks}...`);

      await this.syncManager.sendData({
        type: 'transfer-chunk',
        sessionId: this.session.id,
        chunk,
      });

      // Small delay to prevent overwhelming the connection
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Send completion signal
    this.updateProgress(95, 'Finalizing transfer...');
    await this.syncManager.sendData({
      type: 'transfer-complete',
      sessionId: this.session.id,
    });

    this.updateProgress(100, 'Transfer completed');
  }

  /**
   * Handle incoming messages from secondary device
   */
  async handleMessage(data: any): Promise<void> {
    switch (data.type) {
      case 'transfer-acknowledged':
        if (data.sessionId === this.session.id) {
          this.updateProgress(35, 'Transfer acknowledged by secondary device');
        }
        break;

      case 'transfer-resumed':
        if (data.sessionId === this.session.id) {
          this.updateStatus('resuming');
          this.updateProgress(100, 'Secondary device resumed successfully');
        }
        break;
    }
  }

  private updateStatus(status: TransferSession['status']): void {
    this.session.status = status;
  }

  private updateProgress(progress: number, message?: string): void {
    this.session.progress = progress;
    if (this.onProgress && message) {
      this.onProgress(progress, message);
    }
  }

  onProgressUpdate(callback: (progress: number, status: string) => void): void {
    this.onProgress = callback;
  }

  getSession(): TransferSession {
    return this.session;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.serializedState = undefined;
    this.chunks = undefined;
  }
}

/**
 * Secondary device transfer receiver
 */
export class TransferSecondary {
  private session: TransferSession;
  private config: TransferProtocolConfig;
  private syncManager: DeviceSyncManager;
  private receivedChunks: Map<number, TransferChunk> = new Map();
  private manifest?: TransferManifest;
  private onProgress?: (progress: number, status: string) => void;
  private onStateReceived?: (state: HngrDB) => void;

  constructor(
    hostDeviceId: string,
    secondaryDeviceId: string,
    syncManager: DeviceSyncManager,
    config: Partial<TransferProtocolConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.syncManager = syncManager;

    this.session = {
      id: '', // Will be set when manifest is received
      hostDeviceId,
      secondaryDeviceId,
      status: 'preparing',
      startTime: Date.now(),
      progress: 0,
    };
  }

  /**
   * Handle incoming transfer data
   */
  async handleMessage(data: any): Promise<void> {
    try {
      switch (data.type) {
        case 'transfer-manifest':
          await this.handleManifest(data.manifest);
          break;

        case 'transfer-chunk':
          await this.handleChunk(data.chunk);
          break;

        case 'transfer-complete':
          await this.handleComplete();
          break;
      }
    } catch (error) {
      this.session.status = 'failed';
      this.session.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  private async handleManifest(manifest: TransferManifest): Promise<void> {
    this.manifest = manifest;
    this.session.id = crypto.randomUUID(); // Generate local session ID
    this.session.manifest = manifest;
    this.session.status = 'transferring';

    this.updateProgress(5, `Receiving ${manifest.totalChunks} chunks...`);

    // Acknowledge receipt
    await this.syncManager.sendData({
      type: 'transfer-acknowledged',
      sessionId: this.session.id,
    });
  }

  private async handleChunk(chunk: TransferChunk): Promise<void> {
    if (!this.manifest) {
      throw new Error('Manifest not received');
    }

    // Validate chunk
    if (chunk.id !== this.manifest.stateId) {
      throw new Error('Chunk from different transfer session');
    }

    if (chunk.index < 0 || chunk.index >= this.manifest.totalChunks) {
      throw new Error('Invalid chunk index');
    }

    // Store chunk
    this.receivedChunks.set(chunk.index, chunk);

    const progress = 5 + calculateTransferProgress(this.receivedChunks.size, this.manifest.totalChunks) * 0.9; // 5-95%
    this.updateProgress(progress, `Received chunk ${this.receivedChunks.size}/${this.manifest.totalChunks}`);

    // Check if we have all chunks
    if (this.receivedChunks.size === this.manifest.totalChunks) {
      await this.reassembleAndResume();
    }
  }

  private async handleComplete(): Promise<void> {
    // Transfer complete signal received
    if (this.receivedChunks.size === this.manifest?.totalChunks) {
      this.updateProgress(100, 'Transfer completed, reassembling state...');
    }
  }

  private async reassembleAndResume(): Promise<void> {
    if (!this.manifest) {
      throw new Error('Manifest not available for reassembly');
    }

    try {
      this.updateProgress(96, 'Reassembling state...');

      // Convert Map to Array and sort by index
      const chunks = Array.from(this.receivedChunks.values()).sort((a, b) => a.index - b.index);

      // Reassemble state
      const serializedState = reassembleState(chunks);

      // Validate checksum
      if (serializedState.checksum !== this.manifest.checksum) {
        throw new Error('State integrity check failed');
      }

      // Deserialize state
      const state = await deserializeState(serializedState);

      this.updateProgress(98, 'State validated, resuming...');

      // Notify that state is ready
      if (this.onStateReceived) {
        this.onStateReceived(state);
      }

      this.session.status = 'completed';
      this.session.frozenState = state;
      this.session.endTime = Date.now();

      // Signal successful resumption to host
      await this.syncManager.sendData({
        type: 'transfer-resumed',
        sessionId: this.session.id,
      });

      this.updateProgress(100, 'Successfully resumed on secondary device');

    } catch (error) {
      this.session.status = 'failed';
      this.session.error = error instanceof Error ? error.message : 'Reassembly failed';
      throw error;
    }
  }

  private updateProgress(progress: number, message?: string): void {
    this.session.progress = progress;
    if (this.onProgress && message) {
      this.onProgress(progress, message);
    }
  }

  onProgressUpdate(callback: (progress: number, status: string) => void): void {
    this.onProgress = callback;
  }

  onStateReady(callback: (state: HngrDB) => void): void {
    this.onStateReceived = callback;
  }

  getSession(): TransferSession {
    return this.session;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.receivedChunks.clear();
    this.manifest = undefined;
  }
}

/**
 * Transfer coordinator that manages both host and secondary sides
 */
export class TransferCoordinator {
  private config: TransferProtocolConfig;
  private activeTransfers: Map<string, TransferHost | TransferSecondary> = new Map();

  constructor(config: Partial<TransferProtocolConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create a new transfer session as host
   */
  createHostTransfer(
    hostDeviceId: string,
    secondaryDeviceId: string,
    state: HngrDB,
    syncManager: DeviceSyncManager
  ): TransferHost {
    const transfer = new TransferHost(
      hostDeviceId,
      secondaryDeviceId,
      state,
      syncManager,
      this.config
    );

    this.activeTransfers.set(transfer.getSession().id, transfer);
    return transfer;
  }

  /**
   * Create a new transfer session as secondary
   */
  createSecondaryTransfer(
    hostDeviceId: string,
    secondaryDeviceId: string,
    syncManager: DeviceSyncManager
  ): TransferSecondary {
    const transfer = new TransferSecondary(
      hostDeviceId,
      secondaryDeviceId,
      syncManager,
      this.config
    );

    // Use a temporary ID until manifest is received
    const tempId = `secondary-${Date.now()}`;
    this.activeTransfers.set(tempId, transfer);

    return transfer;
  }

  /**
   * Handle incoming transfer messages
   */
  async handleTransferMessage(data: any, syncManager: DeviceSyncManager): Promise<void> {
    // Find the appropriate transfer session
    let transfer: TransferHost | TransferSecondary | undefined;

    if (data.sessionId) {
      transfer = this.activeTransfers.get(data.sessionId);
    }

    // For secondary transfers, try to find by type
    if (!transfer) {
      for (const t of this.activeTransfers.values()) {
        if (t instanceof TransferSecondary && data.type?.startsWith('transfer-')) {
          transfer = t;
          break;
        }
      }
    }

    if (transfer) {
      await transfer.handleMessage(data);
    } else {
      console.warn('No active transfer session found for message:', data);
    }
  }

  /**
   * Clean up completed/failed transfers
   */
  cleanup(): void {
    for (const [id, transfer] of this.activeTransfers) {
      const session = transfer.getSession();
      if (session.status === 'completed' || session.status === 'failed') {
        transfer.cleanup();
        this.activeTransfers.delete(id);
      }
    }
  }

  getActiveTransfers(): TransferSession[] {
    return Array.from(this.activeTransfers.values()).map(t => t.getSession());
  }
}
