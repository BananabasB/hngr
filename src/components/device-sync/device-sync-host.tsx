"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff,
  QrCode,
  Clock
} from "lucide-react";
import { DeviceSyncManager } from "@/lib/device-sync/webrtc";
import { createPairingSession, generateConnectionCode, generateQRCode } from "@/lib/device-sync/device-discovery";
import { TransferCoordinator } from "@/lib/device-sync/transfer-protocol";
import type { DeviceInfo, TransferState } from "@/lib/device-sync/webrtc";
import type { PairingSession } from "@/lib/device-sync/device-discovery";

interface DeviceSyncHostProps {
  deviceInfo: DeviceInfo;
  currentState: any; // HngrDB
  onClose: () => void;
}

export function DeviceSyncHost({ deviceInfo, currentState, onClose }: DeviceSyncHostProps) {
  const [syncManager] = useState(() => new DeviceSyncManager({
    ...deviceInfo,
    type: 'host'
  }));
  const [transferCoordinator] = useState(() => new TransferCoordinator());

  const [pairingSession, setPairingSession] = useState<PairingSession | null>(null);
  const [transferState, setTransferState] = useState<TransferState>({ status: 'idle', progress: 0 });
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>('');
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferStatus, setTransferStatus] = useState('');

  useEffect(() => {
    initializeHost();
    return () => {
      syncManager.disconnect();
    };
  }, []);

  const initializeHost = async () => {
    try {
      setError('');

      // Initialize WebRTC
      await syncManager.initialize();

      // Create pairing session
      const session = createPairingSession(deviceInfo);
      setPairingSession(session);

      // Generate QR code
      const qrUrl = await generateQRCode(session.connectionCode.code);
      setQrCodeUrl(qrUrl);

      // Set up transfer state listener
      syncManager.onTransferStateChange(setTransferState);

      // Set up message handler
      syncManager.onReceiveData((data) => {
        transferCoordinator.handleTransferMessage(data, syncManager).catch(console.error);
      });

      // Start hosting
      const connectionCode = await syncManager.startHosting();
      console.log('Hosting with connection code:', connectionCode);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize host');
    }
  };

  const startTransfer = async () => {
    if (!pairingSession?.secondaryDevice) {
      setError('No secondary device connected');
      return;
    }

    try {
      setError('');

      // Create transfer session
      const transfer = transferCoordinator.createHostTransfer(
        deviceInfo.id,
        pairingSession.secondaryDevice.id,
        currentState,
        syncManager
      );

      // Set up progress tracking
      transfer.onProgressUpdate((progress, status) => {
        setTransferProgress(progress);
        setTransferStatus(status);
      });

      // Start transfer
      await transfer.startTransfer();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed');
    }
  };

  const copyConnectionCode = async () => {
    if (pairingSession) {
      try {
        await navigator.clipboard.writeText(pairingSession.connectionCode.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy code:', err);
      }
    }
  };

  const getStatusColor = (status: TransferState['status']) => {
    switch (status) {
      case 'idle': return 'secondary';
      case 'discovering': return 'default';
      case 'connecting': return 'default';
      case 'transferring': return 'default';
      case 'complete': return 'default';
      case 'error': return 'destructive';
      default: return 'secondary';
    }
  };

  const getTimeRemaining = () => {
    if (!pairingSession) return '';

    const remaining = pairingSession.expiresAt - Date.now();
    if (remaining <= 0) return 'expired';

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">host device setup</h3>
        <p className="text-sm text-muted-foreground">
          share the connection code below with your secondary device
        </p>
      </div>

      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {pairingSession && (
        <div className="space-y-4">
          {/* Connection Code */}
          <div className="space-y-2">
            <label className="text-sm font-medium">connection code</label>
            <div className="flex gap-2">
              <Input
                value={pairingSession.connectionCode.code}
                readOnly
                className="font-mono text-center"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyConnectionCode}
              >
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              expires in: {getTimeRemaining()}
            </div>
          </div>

          {/* QR Code */}
          {qrCodeUrl && (
            <div className="text-center space-y-2">
              <label className="text-sm font-medium">qr code</label>
              <div className="flex justify-center">
                <img
                  src={qrCodeUrl}
                  alt="Connection QR Code"
                  className="border rounded-lg"
                  style={{ maxWidth: '200px', maxHeight: '200px' }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                scan with secondary device camera
              </p>
            </div>
          )}

          {/* Connection Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">status</span>
              <Badge variant={getStatusColor(transferState.status)}>
                {transferState.status === 'idle' && 'waiting for connection'}
                {transferState.status === 'discovering' && 'discovering devices'}
                {transferState.status === 'connecting' && 'connecting...'}
                {transferState.status === 'transferring' && 'transferring...'}
                {transferState.status === 'complete' && 'complete'}
                {transferState.status === 'error' && 'error'}
              </Badge>
            </div>

            {transferState.status === 'connecting' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                waiting for secondary device to connect...
              </div>
            )}
          </div>

          {/* Secondary Device Info */}
          {pairingSession.secondaryDevice && (
            <div className="p-3 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm">
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="font-medium">connected:</span>
                <span>{pairingSession.secondaryDevice.name}</span>
              </div>
            </div>
          )}

          {/* Transfer Progress */}
          {(transferProgress > 0 || transferStatus) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">transfer progress</span>
                <span className="text-sm text-muted-foreground">{transferProgress}%</span>
              </div>
              <Progress value={transferProgress} className="w-full" />
              {transferStatus && (
                <p className="text-xs text-muted-foreground text-center">{transferStatus}</p>
              )}
            </div>
          )}

          {/* Transfer Button */}
          {pairingSession.secondaryDevice && transferState.status === 'connecting' && (
            <Button onClick={startTransfer} className="w-full">
              start transfer
            </Button>
          )}
        </div>
      )}

      {!pairingSession && !error && (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">initializing host...</p>
        </div>
      )}
    </div>
  );
}
