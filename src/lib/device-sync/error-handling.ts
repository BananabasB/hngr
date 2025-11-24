/**
 * Comprehensive error handling and recovery for device synchronization
 */

export enum SyncErrorType {
  // WebRTC errors
  WEBRTC_NOT_SUPPORTED = 'webrtc_not_supported',
  WEBRTC_CONNECTION_FAILED = 'webrtc_connection_failed',
  WEBRTC_SIGNALING_FAILED = 'webrtc_signaling_failed',
  WEBRTC_DATA_CHANNEL_ERROR = 'webrtc_data_channel_error',

  // State serialization errors
  SERIALIZATION_FAILED = 'serialization_failed',
  DESERIALIZATION_FAILED = 'deserialization_failed',
  STATE_VALIDATION_FAILED = 'state_validation_failed',
  CHECKSUM_MISMATCH = 'checksum_mismatch',

  // Transfer protocol errors
  TRANSFER_TIMEOUT = 'transfer_timeout',
  TRANSFER_ABORTED = 'transfer_aborted',
  CHUNK_MISSING = 'chunk_missing',
  CHUNK_CORRUPTED = 'chunk_corrupted',

  // Device discovery errors
  DISCOVERY_TIMEOUT = 'discovery_timeout',
  PAIRING_EXPIRED = 'pairing_expired',
  INVALID_CODE = 'invalid_code',
  DEVICE_INCOMPATIBLE = 'device_incompatible',

  // Network errors
  NETWORK_UNAVAILABLE = 'network_unavailable',
  CONNECTION_LOST = 'connection_lost',
  BANDWIDTH_INSUFFICIENT = 'bandwidth_insufficient',

  // User errors
  USER_CANCELLED = 'user_cancelled',
  PERMISSION_DENIED = 'permission_denied',

  // Unknown errors
  UNKNOWN_ERROR = 'unknown_error',
}

export interface SyncError {
  type: SyncErrorType;
  message: string;
  details?: any;
  recoverable: boolean;
  timestamp: number;
  context?: {
    deviceId?: string;
    sessionId?: string;
    progress?: number;
  };
}

export interface ErrorRecoveryAction {
  type: 'retry' | 'reconnect' | 'restart' | 'fallback' | 'abort';
  description: string;
  automatic: boolean;
  delayMs?: number;
}

export interface ErrorHandlingResult {
  error: SyncError;
  recoveryActions: ErrorRecoveryAction[];
  userMessage: string;
  technicalDetails?: string;
}

/**
 * Create a standardized sync error
 */
export function createSyncError(
  type: SyncErrorType,
  message: string,
  options: {
    details?: any;
    recoverable?: boolean;
    context?: SyncError['context'];
  } = {}
): SyncError {
  return {
    type,
    message,
    details: options.details,
    recoverable: options.recoverable ?? true,
    timestamp: Date.now(),
    context: options.context,
  };
}

/**
 * Handle WebRTC-specific errors
 */
export function handleWebRTCError(error: any, context?: SyncError['context']): SyncError {
  if (error.name === 'NotSupportedError') {
    return createSyncError(
      SyncErrorType.WEBRTC_NOT_SUPPORTED,
      'WebRTC is not supported in this browser',
      { recoverable: false, context }
    );
  }

  if (error.name === 'NotAllowedError') {
    return createSyncError(
      SyncErrorType.PERMISSION_DENIED,
      'Camera or microphone permission denied',
      { recoverable: true, context }
    );
  }

  if (error.name === 'TimeoutError') {
    return createSyncError(
      SyncErrorType.TRANSFER_TIMEOUT,
      'Connection timed out',
      { recoverable: true, context }
    );
  }

  return createSyncError(
    SyncErrorType.WEBRTC_CONNECTION_FAILED,
    `WebRTC connection failed: ${error.message}`,
    { details: error, recoverable: true, context }
  );
}

/**
 * Handle state serialization errors
 */
export function handleSerializationError(error: any, context?: SyncError['context']): SyncError {
  if (error.message?.includes('checksum')) {
    return createSyncError(
      SyncErrorType.CHECKSUM_MISMATCH,
      'State integrity check failed - data may be corrupted',
      { details: error, recoverable: false, context }
    );
  }

  if (error.message?.includes('validation')) {
    return createSyncError(
      SyncErrorType.STATE_VALIDATION_FAILED,
      'State validation failed - data structure is invalid',
      { details: error, recoverable: false, context }
    );
  }

  return createSyncError(
    SyncErrorType.SERIALIZATION_FAILED,
    `Failed to process state data: ${error.message}`,
    { details: error, recoverable: false, context }
  );
}

/**
 * Handle transfer protocol errors
 */
export function handleTransferError(error: any, context?: SyncError['context']): SyncError {
  if (error.message?.includes('timeout')) {
    return createSyncError(
      SyncErrorType.TRANSFER_TIMEOUT,
      'Transfer timed out - connection may be unstable',
      { details: error, recoverable: true, context }
    );
  }

  if (error.message?.includes('chunk')) {
    return createSyncError(
      SyncErrorType.CHUNK_MISSING,
      'Transfer data incomplete - some chunks were lost',
      { details: error, recoverable: true, context }
    );
  }

  return createSyncError(
    SyncErrorType.TRANSFER_ABORTED,
    `Transfer failed: ${error.message}`,
    { details: error, recoverable: true, context }
  );
}

/**
 * Generate recovery actions for a given error
 */
export function generateRecoveryActions(error: SyncError): ErrorRecoveryAction[] {
  const actions: ErrorRecoveryAction[] = [];

  switch (error.type) {
    case SyncErrorType.WEBRTC_NOT_SUPPORTED:
      actions.push({
        type: 'fallback',
        description: 'Use manual connection code entry instead of WebRTC',
        automatic: false,
      });
      break;

    case SyncErrorType.WEBRTC_CONNECTION_FAILED:
    case SyncErrorType.CONNECTION_LOST:
      actions.push(
        {
          type: 'retry',
          description: 'Retry connection',
          automatic: true,
          delayMs: 2000,
        },
        {
          type: 'reconnect',
          description: 'Re-establish connection with new code',
          automatic: false,
        }
      );
      break;

    case SyncErrorType.TRANSFER_TIMEOUT:
    case SyncErrorType.TRANSFER_ABORTED:
      actions.push(
        {
          type: 'retry',
          description: 'Retry transfer from last checkpoint',
          automatic: true,
          delayMs: 1000,
        },
        {
          type: 'restart',
          description: 'Restart transfer from beginning',
          automatic: false,
        }
      );
      break;

    case SyncErrorType.CHECKSUM_MISMATCH:
    case SyncErrorType.STATE_VALIDATION_FAILED:
      actions.push({
        type: 'abort',
        description: 'Cannot recover corrupted data - transfer cancelled',
        automatic: true,
      });
      break;

    case SyncErrorType.PERMISSION_DENIED:
      actions.push({
        type: 'fallback',
        description: 'Grant permissions and try again',
        automatic: false,
      });
      break;

    default:
      actions.push({
        type: 'retry',
        description: 'Retry operation',
        automatic: true,
        delayMs: 3000,
      });
  }

  return actions;
}

/**
 * Process error and generate user-friendly response
 */
export function processError(error: any, context?: SyncError['context']): ErrorHandlingResult {
  let syncError: SyncError;

  // Determine error type and create appropriate SyncError
  if (error.name?.includes('RTC') || error.type === 'webrtc') {
    syncError = handleWebRTCError(error, context);
  } else if (error.type === 'serialization' || error.message?.includes('serializ')) {
    syncError = handleSerializationError(error, context);
  } else if (error.type === 'transfer' || error.message?.includes('transfer')) {
    syncError = handleTransferError(error, context);
  } else if (error instanceof Error) {
    syncError = createSyncError(
      SyncErrorType.UNKNOWN_ERROR,
      error.message,
      { details: error, recoverable: true, context }
    );
  } else {
    syncError = createSyncError(
      SyncErrorType.UNKNOWN_ERROR,
      'An unexpected error occurred',
      { details: error, recoverable: true, context }
    );
  }

  const recoveryActions = generateRecoveryActions(syncError);
  const userMessage = generateUserMessage(syncError);

  return {
    error: syncError,
    recoveryActions,
    userMessage,
    technicalDetails: JSON.stringify({
      type: syncError.type,
      timestamp: syncError.timestamp,
      context: syncError.context,
      details: syncError.details,
    }, null, 2),
  };
}

/**
 * Generate user-friendly error messages
 */
function generateUserMessage(error: SyncError): string {
  switch (error.type) {
    case SyncErrorType.WEBRTC_NOT_SUPPORTED:
      return 'Your browser doesn\'t support the required features for device sync. Try using a modern browser like Chrome or Firefox.';

    case SyncErrorType.WEBRTC_CONNECTION_FAILED:
      return 'Failed to connect to the other device. Check your internet connection and try again.';

    case SyncErrorType.TRANSFER_TIMEOUT:
      return 'The transfer took too long. Your connection might be slow or unstable.';

    case SyncErrorType.CHECKSUM_MISMATCH:
      return 'The transferred data appears to be corrupted. The transfer cannot continue safely.';

    case SyncErrorType.PERMISSION_DENIED:
      return 'Permission denied. Please allow camera/microphone access if prompted, or try manual code entry.';

    case SyncErrorType.NETWORK_UNAVAILABLE:
      return 'No internet connection available. Please check your network and try again.';

    case SyncErrorType.INVALID_CODE:
      return 'The connection code you entered is invalid or expired. Get a new code from the host device.';

    default:
      return error.message || 'An error occurred during device synchronization.';
  }
}

/**
 * Attempt automatic error recovery
 */
export async function attemptRecovery(
  errorResult: ErrorHandlingResult,
  retryCallback: () => Promise<void>
): Promise<boolean> {
  const automaticAction = errorResult.recoveryActions.find(action => action.automatic);

  if (!automaticAction) {
    return false;
  }

  // Wait for delay if specified
  if (automaticAction.delayMs) {
    await new Promise(resolve => setTimeout(resolve, automaticAction.delayMs));
  }

  try {
    await retryCallback();
    return true;
  } catch (retryError) {
    console.warn('Automatic recovery failed:', retryError);
    return false;
  }
}

/**
 * Log error for debugging and monitoring
 */
export function logSyncError(error: SyncError, additionalContext?: any): void {
  const logEntry = {
    ...error,
    additionalContext,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  console.error('Device Sync Error:', logEntry);

  // In a production app, you might send this to an error reporting service
  // Example: errorReportingService.captureException(logEntry);
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: SyncError): boolean {
  return error.recoverable && ![
    SyncErrorType.WEBRTC_NOT_SUPPORTED,
    SyncErrorType.CHECKSUM_MISMATCH,
    SyncErrorType.STATE_VALIDATION_FAILED,
  ].includes(error.type);
}
