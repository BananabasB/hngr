"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Wifi,
  WifiOff,
  Camera,
  Keyboard
} from "lucide-react";
import { DeviceSyncManager } from "@/lib/device-sync/webrtc";
import { validateConnectionCode, joinPairingSession } from "@/lib/device-sync/device-discovery";
import { TransferCoordinator } from "@/lib/device-sync/transfer-protocol";
import type { DeviceInfo } from "@/lib/device-sync/webrtc";
import type { PairingSession } from "@/lib/device-sync/device-discovery";

interface DeviceSyncSecondaryProps {
  deviceInfo: DeviceInfo;
  onStateReceived: (state: any) => void;
  onClose: () => void;
}

type InputMode = 'manual' | 'qr';

export function DeviceSyncSecondary({ deviceInfo, onStateReceived, onClose }: DeviceSyncSecondaryProps) {
  const [syncManager] = useState(() => new DeviceSyncManager({
    ...deviceInfo,
    type: 'secondary'
  }));
  const [transferCoordinator] = useState(() => new TransferCoordinator());

  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [connectionCode, setConnectionCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [pairingSession, setPairingSession] = useState<PairingSession | null>(null);
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferStatus, setTransferStatus] = useState('');
  const [error, setError] = useState<string>('');
  const [codeValid, setCodeValid] = useState<boolean | null>(null);

  useEffect(() => {
    // Set up message handler for receiving transfer data
    syncManager.onReceiveData((data) => {
      transferCoordinator.handleTransferMessage(data, syncManager).catch(console.error);
    });

    return () => {
      syncManager.disconnect();
    };
  }, []);

  // Validate connection code as user types
  useEffect(() => {
    if (connectionCode.length > 0) {
      const valid = validateConnectionCode(connectionCode, deviceInfo.id);
      setCodeValid(valid);
    } else {
      setCodeValid(null);
    }
  }, [connectionCode, deviceInfo.id]);

  const connectToHost = async () => {
    if (!codeValid || !connectionCode) {
      setError('Please enter a valid connection code');
      return;
    }

    try {
      setError('');
      setIsConnecting(true);

      // Initialize WebRTC
      await syncManager.initialize();

      // Create secondary transfer handler
      const transfer = transferCoordinator.createSecondaryTransfer(
        'unknown-host', // Will be updated when manifest is received
        deviceInfo.id,
        syncManager
      );

      // Set up progress tracking
      transfer.onProgressUpdate((progress, status) => {
        setTransferProgress(progress);
        setTransferStatus(status);
      });

      // Set up state received handler
      transfer.onStateReady((state) => {
        onStateReceived(state);
      });

      // Connect using the code
      await syncManager.connectToHost(connectionCode);

      // Note: In a real implementation, you'd have a signaling server
      // For now, we'll simulate the connection
      setTimeout(() => {
        setIsConnecting(false);
        // Simulate successful pairing
        const mockSession: PairingSession = {
          id: crypto.randomUUID(),
          hostDevice: {
            id: 'host-device-id',
            name: 'Host Device',
            type: 'host',
            userAgent: 'Unknown'
          },
          secondaryDevice: deviceInfo,
          connectionCode: {
            code: connectionCode,
            expiresAt: Date.now() + 300000,
            deviceInfo: {
              id: 'host-device-id',
              name: 'Host Device',
              type: 'host',
              userAgent: 'Unknown'
            },
            signature: 'mock-signature'
          },
          status: 'connected',
          createdAt: Date.now(),
          expiresAt: Date.now() + 300000,
        };
        setPairingSession(mockSession);
      }, 2000);

    } catch (err) {
      setIsConnecting(false);
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  };

  const handleQRScan = () => {
    // In a real implementation, this would open the camera
    // For now, we'll just switch to manual input
    setInputMode('manual');
    setError('QR scanning not implemented yet. Please enter the code manually.');
  };

  const resetConnection = () => {
    setConnectionCode('');
    setPairingSession(null);
    setTransferProgress(0);
    setTransferStatus('');
    setError('');
    setCodeValid(null);
    syncManager.disconnect();
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">secondary device</h3>
        <p className="text-sm text-muted-foreground">
          enter the connection code from your host device
        </p>
      </div>

      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!pairingSession && (
        <div className="space-y-4">
          {/* Input Mode Selection */}
          <div className="flex gap-2">
            <Button
              variant={inputMode === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInputMode('manual')}
              className="flex-1"
            >
              <Keyboard className="h-4 w-4 mr-2" />
              manual entry
            </Button>
            <Button
              variant={inputMode === 'qr' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInputMode('qr')}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              scan qr
            </Button>
          </div>

          {inputMode === 'manual' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">connection code</label>
              <Input
                value={connectionCode}
                onChange={(e) => setConnectionCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                className={`font-mono text-center ${codeValid === false ? 'border-destructive' : codeValid === true ? 'border-green-500' : ''}`}
                maxLength={9} // 4 + 1 + 4 characters
              />
              {codeValid === false && (
                <p className="text-xs text-destructive">invalid code format</p>
              )}
              {codeValid === true && (
                <p className="text-xs text-green-600 flex items-center justify-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  valid code format
                </p>
              )}
            </div>
          )}

          {inputMode === 'qr' && (
            <div className="text-center py-8">
              <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                qr scanning would open your camera here
              </p>
              <Button variant="outline" onClick={handleQRScan}>
                open camera (demo)
              </Button>
            </div>
          )}

          <Button
            onClick={connectToHost}
            disabled={!codeValid || isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                connecting...
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 mr-2" />
                connect to host
              </>
            )}
          </Button>
        </div>
      )}

      {pairingSession && (
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="p-3 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="font-medium">connected:</span>
              <span>{pairingSession.hostDevice.name}</span>
            </div>
          </div>

          {/* Transfer Progress */}
          {(transferProgress > 0 || transferStatus) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">receiving state</span>
                <span className="text-sm text-muted-foreground">{transferProgress}%</span>
              </div>
              <Progress value={transferProgress} className="w-full" />
              {transferStatus && (
                <p className="text-xs text-muted-foreground text-center">{transferStatus}</p>
              )}
            </div>
          )}

          {/* Waiting for Transfer */}
          {transferProgress === 0 && (
            <div className="text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                waiting for host to start transfer...
              </p>
            </div>
          )}

          {/* Transfer Complete */}
          {transferProgress === 100 && (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium text-green-600 mb-2">
                transfer complete!
              </p>
              <p className="text-xs text-muted-foreground">
                your device has successfully received the state.
              </p>
            </div>
          )}

          <Button variant="outline" onClick={resetConnection} className="w-full">
            connect to different host
          </Button>
        </div>
      )}
    </div>
  );
}
