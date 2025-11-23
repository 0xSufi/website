export interface LiveStream {
  id: string;
  roomId: string;
  broadcasterId: string;
  broadcasterAddress: string;
  broadcasterUsername: string;
  title: string;
  description?: string;
  thumbnail?: string;
  isLive: boolean;
  viewerCount: number;
  startedAt?: Date;
  endedAt?: Date;
  streamKey?: string;
}

export interface StreamPeer {
  peerId: string;
  address: string;
  username: string;
  role: 'broadcaster' | 'viewer';
  connectionState: RTCPeerConnectionState;
  stream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
}

export interface StreamQuality {
  width: number;
  height: number;
  bitrate: number;
  framerate: number;
  label: string;
}

export interface StreamControls {
  audio: boolean;
  video: boolean;
  screenShare: boolean;
  quality: StreamQuality;
}

export interface StreamStats {
  bitrate: number;
  packetLoss: number;
  latency: number;
  jitter: number;
  fps: number;
  resolution: {
    width: number;
    height: number;
  };
}

export interface StreamMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'stream-start' | 'stream-end' | 'viewer-join' | 'viewer-leave' | 'quality-change' | 'screen-share-start' | 'screen-share-end';
  roomId: string;
  from: string;
  to?: string;
  data: any;
}

export interface LiveStreamContextType {
  // State
  currentStream: LiveStream | null;
  activeStreams: LiveStream[];
  peers: Map<string, StreamPeer>;
  localStream: MediaStream | null;
  isBroadcasting: boolean;
  isViewing: boolean;
  streamControls: StreamControls;
  streamStats: StreamStats | null;
  viewerAudioEnabled: Map<string, boolean>;
  isMicEnabled: boolean;

  // Actions
  startBroadcast: (title: string, description?: string) => Promise<void>;
  stopBroadcast: () => Promise<void>;
  joinStream: (roomId: string) => Promise<void>;
  leaveStream: () => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  changeQuality: (quality: StreamQuality) => void;
  sendStreamMessage: (message: StreamMessage) => void;
  enableMyMic: () => Promise<void>;
  disableMyMic: () => Promise<void>;
  requestViewerAudio: (viewerId: string, enable: boolean) => void;
}

export const STREAM_QUALITIES: StreamQuality[] = [
  { width: 1920, height: 1080, bitrate: 4000000, framerate: 30, label: '1080p' },
  { width: 1280, height: 720, bitrate: 2500000, framerate: 30, label: '720p' },
  { width: 854, height: 480, bitrate: 1000000, framerate: 30, label: '480p' },
  { width: 640, height: 360, bitrate: 600000, framerate: 30, label: '360p' },
];

export const DEFAULT_STREAM_CONTROLS: StreamControls = {
  audio: true,
  video: true,
  screenShare: false,
  quality: STREAM_QUALITIES[1], // Default to 720p
};