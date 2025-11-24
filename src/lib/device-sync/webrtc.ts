/**
 * WebRTC-powered device synchronization for HngrDB
 * Implements DS Suitcase-style state transfer between devices
 */

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'host' | 'secondary';
  userAgent: string;
}

export interface TransferState {
  status: 'idle' | 'discovering' | 'connecting' | 'transferring' | 'complete' | 'error';
  progress: number;
  error?: string;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'candidate' | 'ready' | 'transfer-request' | 'transfer-response';
  from: string;
  to: string;
  data?: any;
  timestamp: number;
}

export class DeviceSyncManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private signalingServer: WebSocket | null = null;
  private deviceId: string;
  private deviceInfo: DeviceInfo;
  private transferState: TransferState = { status: 'idle', progress: 0 };
  private onStateChange?: (state: TransferState) => void;
  private onDataReceived?: (data: any) => void;

  constructor(deviceInfo: Omit<DeviceInfo, 'id'>) {
    this.deviceId = crypto.randomUUID();
    this.deviceInfo = { ...deviceInfo, id: this.deviceId };
  }

  // Initialize WebRTC connection
  async initialize(signalingUrl?: string): Promise<void> {
    // Create peer connection with STUN servers
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    // Set up event handlers
    this.peerConnection.onicecandidate = this.handleIceCandidate.bind(this);
    this.peerConnection.onconnectionstatechange = this.handleConnectionStateChange.bind(this);
    this.peerConnection.ondatachannel = this.handleDataChannel.bind(this);

    // Create data channel for state transfer
    this.dataChannel = this.peerConnection.createDataChannel('hngr-sync', {
      ordered: true,
      maxPacketLifeTime: 3000,
    });

    this.setupDataChannel();

    // Connect to signaling server if provided
    if (signalingUrl) {
      this.connectToSignaling(signalingUrl);
    }
  }

  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
      this.updateTransferState({ status: 'connecting', progress: 25 });
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
      this.updateTransferState({ status: 'idle', progress: 0 });
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.onDataReceived) {
          this.onDataReceived(data);
        }
      } catch (error) {
        console.error('Failed to parse received data:', error);
      }
    };
  }

  private handleIceCandidate(event: RTCPeerConnectionIceEvent): void {
    if (event.candidate && this.signalingServer) {
      const message: SignalingMessage = {
        type: 'candidate',
        from: this.deviceId,
        to: '', // Will be set by signaling server
        data: event.candidate,
        timestamp: Date.now(),
      };
      this.signalingServer.send(JSON.stringify(message));
    }
  }

  private handleConnectionStateChange(): void {
    if (!this.peerConnection) return;

    console.log('Connection state:', this.peerConnection.connectionState);

    switch (this.peerConnection.connectionState) {
      case 'connected':
        this.updateTransferState({ status: 'transferring', progress: 50 });
        break;
      case 'disconnected':
      case 'failed':
      case 'closed':
        this.updateTransferState({ status: 'error', progress: 0, error: 'Connection lost' });
        break;
    }
  }

  private handleDataChannel(event: RTCDataChannelEvent): void {
    this.dataChannel = event.channel;
    this.setupDataChannel();
  }

  private connectToSignaling(url: string): void {
    this.signalingServer = new WebSocket(url);

    this.signalingServer.onopen = () => {
      console.log('Connected to signaling server');
      // Register this device
      const registerMessage: SignalingMessage = {
        type: 'ready',
        from: this.deviceId,
        to: '',
        data: this.deviceInfo,
        timestamp: Date.now(),
      };
      this.signalingServer!.send(JSON.stringify(registerMessage));
    };

    this.signalingServer.onmessage = this.handleSignalingMessage.bind(this);

    this.signalingServer.onclose = () => {
      console.log('Disconnected from signaling server');
    };

    this.signalingServer.onerror = (error) => {
      console.error('Signaling server error:', error);
      this.updateTransferState({ status: 'error', error: 'Signaling server connection failed' });
    };
  }

  private handleSignalingMessage(event: MessageEvent): void {
    try {
      const message: SignalingMessage = JSON.parse(event.data);
      this.processSignalingMessage(message);
    } catch (error) {
      console.error('Failed to parse signaling message:', error);
    }
  }

  private async processSignalingMessage(message: SignalingMessage): Promise<void> {
    if (message.to !== this.deviceId && message.to !== '') return;

    switch (message.type) {
      case 'offer':
        if (this.peerConnection) {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.data));
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);

          const response: SignalingMessage = {
            type: 'answer',
            from: this.deviceId,
            to: message.from,
            data: answer,
            timestamp: Date.now(),
          };
          this.signalingServer!.send(JSON.stringify(response));
        }
        break;

      case 'answer':
        if (this.peerConnection) {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.data));
        }
        break;

      case 'candidate':
        if (this.peerConnection && message.data) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(message.data));
        }
        break;
    }
  }

  // Send data through WebRTC data channel
  async sendData(data: any): Promise<void> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    const serializedData = JSON.stringify(data);
    this.dataChannel.send(serializedData);
  }

  // Initiate connection as host device
  async startHosting(): Promise<string> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    this.updateTransferState({ status: 'discovering', progress: 10 });

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Generate connection code for secondary device
    const connectionCode = this.generateConnectionCode();

    return connectionCode;
  }

  // Connect as secondary device using connection code
  async connectToHost(connectionCode: string): Promise<void> {
    if (!this.signalingServer) {
      throw new Error('Signaling server not connected');
    }

    this.updateTransferState({ status: 'connecting', progress: 20 });

    // Send connection request with code
    const request: SignalingMessage = {
      type: 'transfer-request',
      from: this.deviceId,
      to: '',
      data: { connectionCode, deviceInfo: this.deviceInfo },
      timestamp: Date.now(),
    };

    this.signalingServer.send(JSON.stringify(request));
  }

  private generateConnectionCode(): string {
    // Generate a 6-character code for easy sharing
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private updateTransferState(state: Partial<TransferState>): void {
    this.transferState = { ...this.transferState, ...state };
    if (this.onStateChange) {
      this.onStateChange(this.transferState);
    }
  }

  // Event handlers
  onTransferStateChange(callback: (state: TransferState) => void): void {
    this.onStateChange = callback;
  }

  onReceiveData(callback: (data: any) => void): void {
    this.onDataReceived = callback;
  }

  // Cleanup
  disconnect(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.signalingServer) {
      this.signalingServer.close();
      this.signalingServer = null;
    }

    this.updateTransferState({ status: 'idle', progress: 0 });
  }

  getTransferState(): TransferState {
    return this.transferState;
  }

  getDeviceInfo(): DeviceInfo {
    return this.deviceInfo;
  }
}
