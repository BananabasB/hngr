/**
 * Device Synchronization Module - Main Exports
 * DS Suitcase-style WebRTC synchronization for community simulation
 */

// Core WebRTC functionality
export {
  DeviceSyncManager,
  type DeviceInfo,
  type TransferState,
  type SignalingMessage,
} from './webrtc';

// State serialization and validation
export {
  serializeState,
  deserializeState,
  chunkState,
  reassembleState,
  createTransferManifest,
  calculateTransferProgress,
  type SerializedState,
  type TransferChunk,
  type TransferManifest,
} from './state-serialization';

// Device discovery and pairing
export {
  generateConnectionCode,
  validateConnectionCode,
  createPairingSession,
  joinPairingSession,
  generateQRCode,
  parseQRCodeData,
  cleanupExpiredSessions,
  getDeviceDisplayName,
  checkWebRTCSupport,
  type ConnectionCode,
  type PairingSession,
} from './device-discovery';

// Transfer protocol
export {
  TransferHost,
  TransferSecondary,
  TransferCoordinator,
  type TransferSession,
  type TransferProtocolConfig,
} from './transfer-protocol';

// Conflict resolution
export {
  analyzeConflicts,
  resolveConflicts,
  createStateBackup,
  validateTransferredState,
  generateResolutionReport,
  type ConflictResolutionResult,
  type ConflictAnalysis,
} from './conflict-resolution';

// Error handling
export {
  createSyncError,
  handleWebRTCError,
  handleSerializationError,
  handleTransferError,
  generateRecoveryActions,
  processError,
  attemptRecovery,
  logSyncError,
  isRecoverableError,
  type SyncError,
  type SyncErrorType,
  type ErrorRecoveryAction,
  type ErrorHandlingResult,
} from './error-handling';

// Re-export types from setup for convenience
export type { HngrDB, Tribute, Event, Relationship, Health, Pronouns } from '../setup';
