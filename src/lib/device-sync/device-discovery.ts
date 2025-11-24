/**
 * Device discovery and pairing system for DS Suitcase-style synchronization
 * Supports connection codes and QR code generation (when qrcode library is available)
 */

import type { DeviceInfo } from './webrtc';

export interface ConnectionCode {
  code: string;
  expiresAt: number;
  deviceInfo: DeviceInfo;
  signature: string;
}

export interface PairingSession {
  id: string;
  hostDevice: DeviceInfo;
  secondaryDevice?: DeviceInfo;
  connectionCode: ConnectionCode;
  status: 'waiting' | 'connected' | 'transferring' | 'completed' | 'expired';
  createdAt: number;
  expiresAt: number;
}

/**
 * Generate a secure connection code for device pairing
 */
export function generateConnectionCode(deviceInfo: DeviceInfo): ConnectionCode {
  // Generate a 8-character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar-looking chars
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Add hyphens for readability: XXXX-XXXX
  code = code.slice(0, 4) + '-' + code.slice(4);

  const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

  // Create signature for verification
  const signature = createSignature(code, deviceInfo.id);

  return {
    code,
    expiresAt,
    deviceInfo,
    signature,
  };
}

/**
 * Validate a connection code
 */
export function validateConnectionCode(code: string, deviceId: string): boolean {
  if (!code || typeof code !== 'string') return false;

  // Check format: XXXX-XXXX
  const codeRegex = /^[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$/;
  if (!codeRegex.test(code)) return false;

  // Check if expired (we can't check this without the full ConnectionCode object)
  // This would need to be handled at a higher level

  return true;
}

/**
 * Create a pairing session
 */
export function createPairingSession(hostDevice: DeviceInfo): PairingSession {
  const connectionCode = generateConnectionCode(hostDevice);
  const sessionId = crypto.randomUUID();

  return {
    id: sessionId,
    hostDevice,
    connectionCode,
    status: 'waiting',
    createdAt: Date.now(),
    expiresAt: connectionCode.expiresAt,
  };
}

/**
 * Join a pairing session using connection code
 */
export function joinPairingSession(
  connectionCode: string,
  secondaryDevice: DeviceInfo,
  activeSessions: Map<string, PairingSession>
): PairingSession | null {
  // Find the session with matching code
  for (const [sessionId, session] of activeSessions) {
    if (
      session.connectionCode.code === connectionCode &&
      session.status === 'waiting' &&
      Date.now() < session.expiresAt
    ) {
      // Verify signature
      const expectedSignature = createSignature(connectionCode, session.hostDevice.id);
      if (session.connectionCode.signature !== expectedSignature) {
        continue; // Invalid signature
      }

      // Update session with secondary device
      const updatedSession: PairingSession = {
        ...session,
        secondaryDevice,
        status: 'connected',
      };

      activeSessions.set(sessionId, updatedSession);
      return updatedSession;
    }
  }

  return null; // No valid session found
}

/**
 * Generate QR code data URL for connection code
 * Note: Currently disabled - requires 'qrcode' library to be installed
 */
export async function generateQRCode(connectionCode: string): Promise<string> {
  // QR code generation is currently disabled to avoid build dependencies
  // To enable: install 'qrcode' package and uncomment the code below
  console.log('QR code generation skipped (qrcode library not installed)');
  return '';

  /*
  try {
    const QRCode = (await import('qrcode')).default;

    const qrData = JSON.stringify({
      type: 'hngr-device-sync',
      version: '1.0',
      code: connectionCode,
      timestamp: Date.now(),
    });

    const dataUrl = await QRCode.toDataURL(qrData, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return dataUrl;
  } catch (error) {
    console.log('QR code generation failed:', error);
    return '';
  }
  */
}

/**
 * Parse QR code data from scanned code
 */
export function parseQRCodeData(qrData: string): { code: string; timestamp: number } | null {
  try {
    const parsed = JSON.parse(qrData);

    if (
      parsed.type === 'hngr-device-sync' &&
      typeof parsed.code === 'string' &&
      typeof parsed.timestamp === 'number'
    ) {
      // Check if QR code is not too old (5 minutes)
      if (Date.now() - parsed.timestamp > 5 * 60 * 1000) {
        return null; // QR code expired
      }

      return {
        code: parsed.code,
        timestamp: parsed.timestamp,
      };
    }
  } catch (error) {
    console.error('Failed to parse QR code data:', error);
  }

  return null;
}

/**
 * Create a cryptographic signature for verification
 */
function createSignature(code: string, deviceId: string): string {
  // Simple signature using device ID and code
  // In production, this could use proper cryptographic signing
  const data = `${code}:${deviceId}:${Math.floor(Date.now() / (60 * 1000))}`; // Include minute for time-based validation
  return btoa(data); // Base64 encode for simplicity
}

/**
 * Clean up expired pairing sessions
 */
export function cleanupExpiredSessions(sessions: Map<string, PairingSession>): void {
  const now = Date.now();
  for (const [sessionId, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(sessionId);
    }
  }
}

/**
 * Get user-friendly device name
 */
export function getDeviceDisplayName(deviceInfo: DeviceInfo): string {
  const { name, type, userAgent } = deviceInfo;

  // Try to extract browser/OS info from user agent
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  }

  if (userAgent.includes('Mac')) {
    os = 'macOS';
  } else if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  }

  const deviceType = type === 'host' ? 'Host' : 'Secondary';
  return `${deviceType}: ${name} (${browser} on ${os})`;
}

/**
 * Check if device is compatible with WebRTC
 */
export function checkWebRTCSupport(): { supported: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!window.RTCPeerConnection) {
    errors.push('WebRTC not supported');
  }

  if (!window.crypto || !window.crypto.subtle) {
    errors.push('Web Cryptography API not supported');
  }

  if (!window.TextEncoder || !window.TextDecoder) {
    errors.push('Text encoding APIs not supported');
  }

  return {
    supported: errors.length === 0,
    errors,
  };
}
