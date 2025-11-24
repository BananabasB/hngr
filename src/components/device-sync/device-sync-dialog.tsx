"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Smartphone,
  Monitor,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy,
  QrCode
} from "lucide-react";
import { DeviceSyncHost } from "./device-sync-host";
import { DeviceSyncSecondary } from "./device-sync-secondary";
import { checkWebRTCSupport, getDeviceDisplayName } from "@/lib/device-sync/device-discovery";
import type { DeviceInfo, TransferState } from "@/lib/device-sync/webrtc";

interface DeviceSyncDialogProps {
  children: React.ReactNode;
  currentState: any; // HngrDB type
  onStateReceived?: (state: any) => void;
}

type SyncMode = 'host' | 'secondary' | 'select';

export function DeviceSyncDialog({ children, currentState, onStateReceived }: DeviceSyncDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SyncMode>('select');
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [webRTCSupported, setWebRTCSupported] = useState(true);
  const [compatibilityErrors, setCompatibilityErrors] = useState<string[]>([]);

  useEffect(() => {
    // Check WebRTC support when dialog opens
    const support = checkWebRTCSupport();
    setWebRTCSupported(support.supported);
    setCompatibilityErrors(support.errors);

    // Create device info
    if (typeof window !== 'undefined') {
      const info: DeviceInfo = {
        id: crypto.randomUUID(),
        name: navigator.platform || 'Unknown Device',
        type: 'host', // Will be updated based on mode
        userAgent: navigator.userAgent,
      };
      setDeviceInfo(info);
    }
  }, [open]);

  const handleModeSelect = (selectedMode: SyncMode) => {
    if (deviceInfo) {
      setDeviceInfo({
        ...deviceInfo,
        type: selectedMode === 'host' ? 'host' : 'secondary',
      });
    }
    setMode(selectedMode);
  };

  const handleClose = () => {
    setOpen(false);
    setMode('select');
  };

  const handleStateReceived = (state: any) => {
    if (onStateReceived) {
      onStateReceived(state);
    }
    // Auto-close after successful transfer
    setTimeout(() => handleClose(), 2000);
  };

  if (!webRTCSupported) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              device sync not supported
            </DialogTitle>
            <DialogDescription>
              your browser doesn't support the required features for device synchronization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {compatibilityErrors.map((error, index) => (
              <Alert key={index}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleClose}>close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            device synchronization
          </DialogTitle>
          <DialogDescription>
            transfer your community simulation state between devices, just like ds suitcase.
          </DialogDescription>
        </DialogHeader>

        {deviceInfo && (
          <div className="mb-4">
            <Badge variant="outline" className="text-xs">
              {getDeviceDisplayName(deviceInfo)}
            </Badge>
          </div>
        )}

        {mode === 'select' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => handleModeSelect('host')}
              >
                <Monitor className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-medium">host device</div>
                  <div className="text-xs text-muted-foreground">
                    freeze your current state and transfer to another device
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => handleModeSelect('secondary')}
              >
                <Smartphone className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-medium">secondary device</div>
                  <div className="text-xs text-muted-foreground">
                    receive state from a host device and continue playing
                  </div>
                </div>
              </Button>
            </div>
          </div>
        )}

        {mode === 'host' && deviceInfo && (
          <DeviceSyncHost
            deviceInfo={deviceInfo}
            currentState={currentState}
            onClose={handleClose}
          />
        )}

        {mode === 'secondary' && deviceInfo && (
          <DeviceSyncSecondary
            deviceInfo={deviceInfo}
            onStateReceived={handleStateReceived}
            onClose={handleClose}
          />
        )}

        {mode !== 'select' && (
          <div className="flex justify-start">
            <Button variant="ghost" onClick={() => setMode('select')}>
              ← back to selection
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
