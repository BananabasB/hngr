# Device Synchronization (DS Suitcase-style)

This module implements WebRTC-powered device synchronization for the community simulation app, inspired by Nintendo DS Suitcase functionality. It allows users to seamlessly transfer their game state between devices.

## Features

- **WebRTC Peer-to-Peer**: Direct device-to-device communication without servers
- **State Freezing**: Host device freezes state during transfer (just like DS Suitcase)
- **Secure Connection Codes**: 8-character alphanumeric codes for easy pairing
- **QR Code Support**: Optional QR code generation for camera scanning
- **Progress Tracking**: Real-time transfer progress with detailed status updates
- **Error Recovery**: Comprehensive error handling with automatic retry mechanisms
- **Conflict Resolution**: Clean state replacement with backup and validation

## Architecture

```
lib/device-sync/
├── webrtc.ts              # Core WebRTC connection management
├── state-serialization.ts # State chunking, validation, and integrity
├── device-discovery.ts    # Pairing codes, QR generation, device info
├── transfer-protocol.ts   # Freeze → transfer → resume workflow
├── conflict-resolution.ts # State merging and backup strategies
├── error-handling.ts      # Comprehensive error management
├── index.ts              # Main exports
└── README.md             # This file

components/device-sync/
├── device-sync-dialog.tsx    # Main sync interface
├── device-sync-host.tsx      # Host device controls
└── device-sync-secondary.tsx # Secondary device controls
```

## Usage

### Basic Setup

1. **Host Device**: Click "Sync" in the sidebar → Select "Host Device"
2. **Secondary Device**: Click "Sync" in the sidebar → Select "Secondary Device"
3. **Pairing**: Share the connection code from host to secondary device
4. **Transfer**: Host initiates transfer, secondary device receives state
5. **Resume**: Secondary device continues with the transferred state

### Manual Connection Code

The system generates 8-character connection codes in format `XXXX-XXXX` (e.g., `ABCD-1234`).

**Host Device:**
- Displays connection code and optional QR code
- Shows countdown timer (codes expire in 5 minutes)
- Waits for secondary device to connect

**Secondary Device:**
- Enter the connection code manually
- Real-time validation shows code format correctness
- Connects automatically once code is accepted

### State Transfer Process

1. **Freeze**: Host device serializes current state
2. **Chunk**: Large states are split into 64KB chunks for reliable transfer
3. **Transfer**: Chunks sent via WebRTC data channel with progress tracking
4. **Validate**: Secondary device validates checksum and structure
5. **Resume**: State loaded and UI updated seamlessly

### Error Handling

The system includes comprehensive error handling:

- **WebRTC Issues**: Automatic fallback and retry mechanisms
- **Network Problems**: Connection recovery with exponential backoff
- **Data Corruption**: Checksum validation prevents corrupted transfers
- **Timeout Handling**: Configurable timeouts with user feedback
- **User Cancellation**: Clean abort and resource cleanup

### Browser Compatibility

- **Supported**: Chrome 72+, Firefox 69+, Safari 12+, Edge 79+
- **Required APIs**: WebRTC, Web Cryptography, Text Encoding
- **Fallback**: Graceful degradation with clear error messages

## API Reference

### DeviceSyncManager

```typescript
const syncManager = new DeviceSyncManager(deviceInfo);

// Initialize WebRTC connection
await syncManager.initialize(signalingUrl?);

// Events
syncManager.onTransferStateChange(callback);
syncManager.onReceiveData(callback);

// Connection management
await syncManager.startHosting(); // Returns connection code
await syncManager.connectToHost(connectionCode);
syncManager.disconnect();
```

### TransferCoordinator

```typescript
const coordinator = new TransferCoordinator();

// Create transfer sessions
const hostTransfer = coordinator.createHostTransfer(hostId, secondaryId, state, syncManager);
const secondaryTransfer = coordinator.createSecondaryTransfer(hostId, secondaryId, syncManager);

// Start transfer
await hostTransfer.startTransfer();

// Handle incoming messages
coordinator.handleTransferMessage(data, syncManager);
```

### State Serialization

```typescript
import { serializeState, deserializeState, chunkState, reassembleState } from './state-serialization';

// Serialize for transfer
const serialized = serializeState(hngrDb);

// Chunk large states
const chunks = chunkState(serialized);

// Reassemble on receiver
const receivedState = deserializeState(reassembled);
```

## Configuration

### TransferProtocolConfig

```typescript
const config = {
  chunkSize: 65536,    // 64KB chunks
  timeoutMs: 30000,    // 30 second timeout
  maxRetries: 3,       // Retry failed operations
};
```

### Environment Variables

```env
# Optional: Enable QR code generation (requires qrcode package)
ENABLE_QR_CODES=true

# Optional: Custom signaling server
SIGNALING_SERVER_URL=wss://your-signaling-server.com
```

## Security Considerations

- **Connection Codes**: 8-character codes provide ~2.8 trillion combinations
- **Checksum Validation**: SHA-256 checksums prevent data tampering
- **No Persistent Data**: Connection codes expire after 5 minutes
- **Local Network Only**: WebRTC connections are peer-to-peer
- **State Encryption**: Optional encryption can be added for sensitive data

## Troubleshooting

### Common Issues

**"WebRTC not supported"**
- Update to a modern browser
- Check if WebRTC is disabled in browser settings

**"Connection timeout"**
- Ensure both devices are on the same network
- Check firewall settings
- Try with manual code entry instead of QR scan

**"Transfer failed"**
- Check internet connection stability
- Reduce state size if possible
- Try transferring in a quieter network environment

**"Invalid connection code"**
- Verify code format: XXXX-XXXX
- Ensure code hasn't expired (5 minute limit)
- Check for typos in manual entry

### Debug Mode

Enable debug logging:

```typescript
localStorage.setItem('device-sync-debug', 'true');
```

This will log detailed connection and transfer information to the console.

## Future Enhancements

- **Signaling Server**: Replace mock signaling with real server for cross-network transfers
- **Cloud Backup**: Optional cloud storage for state recovery
- **Multiple Devices**: Support for transferring between more than 2 devices
- **Selective Sync**: Choose specific parts of state to transfer
- **Compression**: Reduce transfer size with data compression
- **Offline Mode**: Queue transfers for when network is available

## Dependencies

- **Required**: None (all core functionality uses browser APIs)
- **Optional**: `qrcode` package for QR code generation
- **Peer Dependencies**: React 18+, Next.js 14+

## Contributing

When adding new features:

1. Update error handling in `error-handling.ts`
2. Add comprehensive tests for new functionality
3. Update this README with new configuration options
4. Consider backward compatibility with existing state formats

## License

This module is part of the community simulation app and follows the same license terms.
