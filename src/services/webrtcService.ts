import { StreamMessage, StreamPeer, StreamQuality } from '../types/livestream.types';

export class WebRTCService {
  public peerConnections: Map<string, RTCPeerConnection> = new Map();
  public localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private myAddress: string = '';
  private currentStreamId: string = '';
  public myClientId: string = '';
  private serverClientId: string = ''; // Server-assigned client ID
  
  // Firefox detection
  private isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
  
  private iceServers: RTCIceServer[] = [
    // Primary STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Additional STUN servers for better connectivity
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.stunprotocol.org:3478' },
    // TURN server configuration
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ];
  
  // Firefox-specific ICE servers (more conservative configuration)
  private firefoxIceServers: RTCIceServer[] = [
    // Single STUN server for Firefox stability
    { urls: 'stun:stun.l.google.com:19302' },
    // TURN server with Firefox-optimized settings
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp', // TCP is more reliable in Firefox
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ];
  
  private onMessageCallback?: (message: StreamMessage) => void;
  private onStreamCallback?: (peerId: string, stream: MediaStream) => void;
  private onPeerStateCallback?: (peerId: string, state: RTCPeerConnectionState) => void;
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private queuedIceCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private processedCandidates: Map<string, Set<string>> = new Map(); // Track processed candidates per peer
  private viewerAudioTracks: Map<string, MediaStreamTrack> = new Map(); // Store viewer audio tracks
  private viewerAudioElements: Map<string, HTMLAudioElement> = new Map(); // Audio elements for viewer streams

  constructor() {
    this.initialize();
    
    // Log Firefox detection and optimizations
    if (this.isFirefox) {
      // console.log('[WebRTC] Firefox detected - applying compatibility optimizations');
      // console.log('[WebRTC] Firefox ICE servers:', this.firefoxIceServers);
      // console.log('[WebRTC] Firefox user agent:', navigator.userAgent);
    }
  }
  
  private initialize() {
    // Any initialization logic
  }
  
  public setCallbacks(callbacks: {
    onMessage?: (message: StreamMessage) => void;
    onStream?: (peerId: string, stream: MediaStream) => void;
    onPeerState?: (peerId: string, state: RTCPeerConnectionState) => void;
  }) {
    this.onMessageCallback = callbacks.onMessage;
    this.onStreamCallback = callbacks.onStream;
    this.onPeerStateCallback = callbacks.onPeerState;
  }

  public setClientInfo(address: string, streamId: string, clientId?: string) {
    this.myAddress = address;
    this.currentStreamId = streamId;
    if (clientId) {
      this.serverClientId = clientId;
      this.myClientId = clientId;
    } else {
      // Generate a unique client ID for this session if server hasn't provided one
      this.myClientId = `client-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
    // console.log(`[WebRTC] Client info set - Address: ${address}, StreamId: ${streamId}, ClientId: ${this.myClientId}, ServerClientId: ${this.serverClientId}`);
  }
  
  public async initializeLocalStream(constraints: MediaStreamConstraints): Promise<MediaStream> {
    try {
      // console.log('[WebRTC] Getting user media with constraints:', constraints);
      // console.log('[WebRTC] Browser detected:', this.isFirefox ? 'Firefox' : 'Other');
      
      // Firefox-specific constraints adjustments
      let firefoxConstraints = constraints;
      if (this.isFirefox) {
        // console.log('[WebRTC] Applying Firefox-specific constraints...');
        firefoxConstraints = {
          ...constraints,
          video: constraints.video ? {
            // Firefox prefers explicit dimensions over ranges/ideals
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 },
            // Firefox-specific video constraints
            facingMode: 'user'
            // Remove mediaSource as it's not standard and can cause issues
          } : false,
          audio: constraints.audio ? {
            // Firefox-specific audio constraints (simplified)
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
            // Remove sampleRate and channelCount as they can be restrictive
          } : false
        };
        // console.log('[WebRTC] Firefox constraints:', firefoxConstraints);
      }
      
      // Firefox-specific getUserMedia handling
      if (this.isFirefox) {
        // Try with Firefox-optimized constraints first
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia(firefoxConstraints);
        } catch (firefoxError: any) {
          console.warn('[WebRTC] Firefox-specific constraints failed, trying fallback:', firefoxError);
          
          if (firefoxError.name === 'OverconstrainedError') {
            // Firefox fallback: try with minimal constraints
            // console.log('[WebRTC] Firefox fallback: trying minimal constraints');
            try {
              this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
              });
            } catch (fallbackError) {
              console.error('[WebRTC] Firefox fallback also failed:', fallbackError);
              // Final fallback to original constraints
              this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            }
          } else {
            // For other errors, fallback to standard constraints
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
          }
        }
      } else {
        this.localStream = await navigator.mediaDevices.getUserMedia(firefoxConstraints);
      }
      
      // Log track states and force enable
      this.localStream.getTracks().forEach(track => {
        // console.log(`[WebRTC] Local ${track.kind} track:`, {
          // id: track.id,
          // enabled: track.enabled,
          // muted: track.muted,
          // readyState: track.readyState,
          // label: track.label
        // });
        
        // Force enable the track
        track.enabled = true;
        
        // Listen for mute events
        track.onmute = () => {
          console.warn(`[WebRTC] Local ${track.kind} track was muted!`);
          
          if (track.kind === 'video') {
            // console.log(`[WebRTC] Attempting to handle video mute...`);
            
            // Check if track is ended
            if (track.readyState === 'ended') {
              console.error(`[WebRTC] Video track ended - camera may have been disconnected`);
              return;
            }
            
            // Log why track might be muted
            const settings = track.getSettings();
            // console.log(`[WebRTC] Muted video track settings:`, settings);
            
            // Try to get constraints
            const constraints = track.getConstraints();
            // console.log(`[WebRTC] Muted video track constraints:`, constraints);
          }
        };
        
        track.onunmute = () => {
          // console.log(`[WebRTC] Local ${track.kind} track was unmuted`);
        };
        
        track.onended = () => {
          console.error(`[WebRTC] Local ${track.kind} track ENDED`);
        };
        
        // For video tracks, check settings
        if (track.kind === 'video') {
          const settings = track.getSettings();
          // console.log(`[WebRTC] Video track settings:`, settings);
          
          // Check if track has actual video data
          const capabilities = track.getCapabilities ? track.getCapabilities() : null;
          // console.log(`[WebRTC] Video track capabilities:`, capabilities);
        }
      });
      
      return this.localStream;
    } catch (error: any) {
      console.error('Failed to get user media:', error);
      
      // Provide Firefox-specific error handling
      if (this.isFirefox) {
        if (error.name === 'AbortError') {
          throw new Error('Firefox camera initialization interrupted. Please try again.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Camera is in use by another Firefox tab or application. Please close other tabs using the camera.');
        } else if (error.message?.includes('Requested device not found')) {
          throw new Error('Camera not found. Please check that your camera is connected and not in use by other applications.');
        }
      }
      
      // Standard error handling
      if (error.name === 'NotAllowedError') {
        throw new Error('Camera access was denied. Please allow camera permissions and refresh the page.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No camera found. Please connect a camera and try again.');
      } else if (error.name === 'NotReadableError') {
        throw new Error('Camera is already in use by another application.');
      } else if (error.name === 'OverconstrainedError') {
        throw new Error('Camera does not support the requested settings. Please try again.');
      }
      
      throw error;
    }
  }
  
  public async initializeScreenShare(): Promise<MediaStream> {
    try {
      // console.log('Initializing screen share...');
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      // console.log('Screen stream obtained:', this.screenStream);
      const screenTrack = this.screenStream.getVideoTracks()[0];
      if (screenTrack) {
        // console.log('Screen track:', screenTrack);
        // console.log('Track settings:', screenTrack.getSettings());
        
        // Replace video track in all peer connections
        this.replaceVideoTrack(screenTrack);
        
        // Listen for screen share end
        screenTrack.onended = () => {
          // console.log('Screen share ended by user');
          this.stopScreenShare();
        };
      }
      
      return this.screenStream;
    } catch (error) {
      console.error('Failed to get display media:', error);
      throw error;
    }
  }
  
  public createPeerConnection(peerId: string, isInitiator: boolean): RTCPeerConnection {
    // console.log(`[WebRTC] Creating peer connection for ${peerId}, isInitiator: ${isInitiator}`);
    // console.log(`[WebRTC] My client ID: ${this.myClientId}, My address: ${this.myAddress}`);
    
    // Note: Duplicate connection checking should be handled upstream in handleViewerJoin
    
    // Firefox-optimized configuration
    const firefoxConfig = {
      iceServers: this.isFirefox ? this.firefoxIceServers : this.iceServers,
      iceCandidatePoolSize: this.isFirefox ? 4 : 10, // Firefox performs better with smaller pool
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceTransportPolicy: 'all',
      sdpSemantics: 'unified-plan',
    };
    
    // Firefox-specific additional config
    if (this.isFirefox) {
      Object.assign(firefoxConfig, {
        // Firefox-specific optimizations
        certificates: undefined, // Let Firefox choose certificates
        // Firefox prefers more conservative ICE settings
        iceTransportPolicy: 'all', // Allow both STUN and TURN
      });
      // console.log('[WebRTC] Using Firefox-optimized ICE servers:', this.firefoxIceServers);
    }
    
    const pc = new RTCPeerConnection(firefoxConfig);
    
    // Add local stream tracks
    if (this.localStream) {
      // console.log(`[WebRTC] Adding local stream tracks to peer ${peerId}:`);

      // Determine which video track to use (screen share takes priority)
      const activeVideoTrack = this.screenStream
        ? this.screenStream.getVideoTracks()[0]
        : this.localStream.getVideoTracks()[0];

      if (this.screenStream) {
        // console.log(`[WebRTC] 🖥️ Screen sharing is active - using screen share track for new peer ${peerId}`);
      }

      // Add audio track from local stream (if exists)
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        // console.log(`[WebRTC] Adding audio track: enabled: ${audioTrack.enabled}, muted: ${audioTrack.muted}, id: ${audioTrack.id}`);
        audioTrack.enabled = true;
        pc.addTrack(audioTrack, this.localStream);
      }

      // Add active video track (screen share or camera)
      if (activeVideoTrack) {
        // console.log(`[WebRTC] Adding video track: ${this.screenStream ? 'screen' : 'camera'}, enabled: ${activeVideoTrack.enabled}, muted: ${activeVideoTrack.muted}, id: ${activeVideoTrack.id}`);
        activeVideoTrack.enabled = true;

        const sender = pc.addTrack(activeVideoTrack, this.screenStream || this.localStream);

        // Monitor the sender's track
        // console.log(`[WebRTC] Video sender created for peer ${peerId}`, sender);

        // Check if the track gets replaced
        const checkTrack = () => {
          if (sender.track) {
            // console.log(`[WebRTC] Sender track state for ${peerId}:`, {
              // enabled: sender.track.enabled,
              // muted: sender.track.muted,
              // readyState: sender.track.readyState
            // });
          }
        };

        // Check periodically
        const interval = setInterval(checkTrack, 1000);
        setTimeout(() => clearInterval(interval), 10000); // Stop after 10 seconds
      }
    } else {
      // console.log(`[WebRTC] No local stream available for peer ${peerId}`);
      
      // For viewer connections, add transceivers (audio: sendrecv for bi-directional, video: recvonly)
      if (!isInitiator) {
        // console.log(`[WebRTC] Adding transceivers for viewer (audio: sendrecv, video: recvonly)`);
        const audioTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });
        const videoTransceiver = pc.addTransceiver('video', { direction: 'recvonly' });
        
        // console.log(`[WebRTC] Transceivers added:`, {
          // audio: { mid: audioTransceiver.mid, direction: audioTransceiver.direction },
          // video: { mid: videoTransceiver.mid, direction: videoTransceiver.direction }
        // });
        
        // Monitor transceiver state changes for debugging bytesReceived=0 issues
        setTimeout(() => {
          // console.log(`[WebRTC] Checking transceiver states after setup for ${peerId}:`);
          pc.getTransceivers().forEach((transceiver, index) => {
            // console.log(`[WebRTC] Transceiver ${index}:`, {
              // mid: transceiver.mid,
              // direction: transceiver.direction,
              // currentDirection: transceiver.currentDirection,
              // stopped: transceiver.stopped,
              // receiverTrack: transceiver.receiver.track ? {
                // kind: transceiver.receiver.track.kind,
                // enabled: transceiver.receiver.track.enabled,
                // muted: transceiver.receiver.track.muted,
                // readyState: transceiver.receiver.track.readyState
              // } : null
            // });
          });
        }, 3000);
      }
    }
    
    // Handle incoming stream
    pc.ontrack = (event) => {
      // console.log(`[WebRTC] ontrack event for peer ${peerId}:`, {
        // streams: event.streams.length,
        // track: event.track.kind,
        // trackEnabled: event.track.enabled,
        // trackMuted: event.track.muted,
        // streamId: event.streams[0]?.id
      // });
      
      // Monitor track mute events
      const track = event.track;
      // console.log(`[WebRTC] Setting up mute monitoring for ${track.kind} track from peer ${peerId}`);
      
      track.onmute = () => {
        console.warn(`[WebRTC] ⚠️ ${track.kind} track MUTED for peer ${peerId}! ReadyState: ${track.readyState}`);
        
        // Log current peer connection state when mute happens
        // console.log(`[WebRTC] PC state when muted:`, {
          // connectionState: pc.connectionState,
          // iceConnectionState: pc.iceConnectionState,
          // iceGatheringState: pc.iceGatheringState,
          // signalingState: pc.signalingState
        // });
        
        // Check if this is happening during renegotiation
        const transceivers = pc.getTransceivers();
        transceivers.forEach((t, i) => {
          if (t.receiver.track === track) {
            // console.log(`[WebRTC] Transceiver ${i} for muted track:`, {
              // direction: t.direction,
              // currentDirection: t.currentDirection,
              // stopped: t.stopped
            // });
          }
        });
        
        // Try to recover from mute by checking track state after a delay
        setTimeout(() => {
          if (!track.muted && track.readyState === 'live') {
            // console.log(`[WebRTC] ✅ ${track.kind} track recovered from mute for peer ${peerId}`);
          }
        }, 1000);
      };
      
      track.onunmute = () => {
        // console.log(`[WebRTC] ✅ ${track.kind} track UNMUTED for peer ${peerId}!`);
        
        // When video track unmutes, trigger stream callback to update UI
        if (track.kind === 'video' && this.onStreamCallback && event.streams[0]) {
          // console.log(`[WebRTC] Re-triggering stream callback after video unmute for ${peerId}`);
          this.onStreamCallback(peerId, event.streams[0]);
        }
      };
      
      // Workaround: If track starts muted, try to handle it
      if (track.muted && track.kind === 'video') {
        console.warn(`[WebRTC] ⚠️ Video track started MUTED! Attempting workaround...`);
        
        // Sometimes the track unmutes shortly after being added
        const checkUnmute = setInterval(() => {
          if (!track.muted) {
            // console.log(`[WebRTC] ✅ Video track naturally unmuted!`);
            clearInterval(checkUnmute);
          }
        }, 100);
        
        // Stop checking after 5 seconds
        setTimeout(() => clearInterval(checkUnmute), 5000);
      }
      
      // Force track to be active and check connection stats
      if (track.kind === 'video') {
        setTimeout(async () => {
          // Force enable track if it's not already
          if (!track.enabled && track.readyState === 'live') {
            // console.log(`[WebRTC] Force enabling video track for peer ${peerId}`);
            track.enabled = true;
          }
          
          // Check connection stats to diagnose bytesReceived=0 issue
          try {
            const stats = await pc.getStats();
            let hasInboundRtp = false;
            let hasOutboundRtp = false;
            
            stats.forEach(report => {
              if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
                hasInboundRtp = true;
                // console.log(`[WebRTC] Video inbound RTP stats for ${peerId}:`, {
                  // packetsReceived: report.packetsReceived,
                  // bytesReceived: report.bytesReceived,
                  // framesDecoded: report.framesDecoded,
                  // lastPacketReceivedTimestamp: report.lastPacketReceivedTimestamp
                // });
                
                if (report.bytesReceived === 0) {
                  console.error(`[WebRTC] ❌ No video data received for peer ${peerId} - checking transceivers`);
                  pc.getTransceivers().forEach((transceiver, index) => {
                    if (transceiver.receiver.track?.kind === 'video') {
                      // console.log(`[WebRTC] Video transceiver ${index}:`, {
                        // direction: transceiver.direction,
                        // currentDirection: transceiver.currentDirection,
                        // trackMuted: transceiver.receiver.track.muted,
                        // trackEnabled: transceiver.receiver.track.enabled,
                        // trackReadyState: transceiver.receiver.track.readyState
                      // });
                    }
                  });
                  
                  // Check if local stream is available and broadcasting
                  if (this.localStream) {
                    // console.log(`[WebRTC] Local stream status:`, {
                      // active: this.localStream.active,
                      // videoTracks: this.localStream.getVideoTracks().map(track => ({
                        // id: track.id,
                        // enabled: track.enabled,
                        // muted: track.muted,
                        // readyState: track.readyState,
                        // kind: track.kind
                      // }))
                    // });
                  } else {
                    console.error(`[WebRTC] No local stream available for broadcasting`);
                  }
                }
              }
              
              if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
                hasOutboundRtp = true;
                // console.log(`[WebRTC] Video outbound RTP stats for ${peerId}:`, {
                  // packetsSent: report.packetsSent,
                  // bytesSent: report.bytesSent,
                  // framesEncoded: report.framesEncoded,
                  // timestamp: report.timestamp
                // });
                
                if (report.bytesSent === 0) {
                  console.error(`[WebRTC] ❌ No video data being sent to peer ${peerId}`);
                }
              }
            });
            
            if (!hasInboundRtp) {
              console.warn(`[WebRTC] No inbound RTP stats found for peer ${peerId} - media may not be flowing`);
            }
            
            if (!hasOutboundRtp && this.localStream) {
              console.warn(`[WebRTC] No outbound RTP stats found for peer ${peerId} - not sending media`);
            }
          } catch (error) {
            console.error(`[WebRTC] Failed to get stats for peer ${peerId}:`, error);
          }
        }, 2000); // Check after 2 seconds to allow connection to establish
      }
      
      track.onended = () => {
        console.warn(`[WebRTC] ${track.kind} track ENDED for peer ${peerId}!`);
      };
      
      // Check if track is muted and try to unmute
      if (event.track.kind === 'video' && event.track.muted) {
        console.warn(`[WebRTC] Video track is muted for peer ${peerId}, this will show black video`);
      }

      // Handle viewer audio tracks - auto-play for broadcaster
      if (event.track.kind === 'audio') {
        // console.log(`[WebRTC] 🎤 Audio track received from ${peerId}:`, {
          // muted: event.track.muted,
          // enabled: event.track.enabled,
          // readyState: event.track.readyState,
          // hasLocalStream: !!this.localStream,
          // streamId: event.streams[0]?.id,
          // trackId: event.track.id
        // });

        // Check if this is viewer audio (we're broadcaster with localStream, receiving from viewer)
        if (this.localStream) {
          const existingAudioEl = this.viewerAudioElements.get(peerId);

          if (!existingAudioEl && event.streams[0]) {
            // console.log(`[WebRTC] 🎤 Creating audio element for viewer ${peerId}`);

            // Create audio element for viewer's audio
            const audio = new Audio();

            // Set properties before setting srcObject
            audio.autoplay = true;
            audio.volume = 1.0;
            audio.muted = false; // CRITICAL: Ensure not muted

            // Append to DOM BEFORE setting srcObject (some browsers require this)
            audio.style.display = 'none';
            audio.id = `viewer-audio-${peerId}`;
            document.body.appendChild(audio);
            // console.log(`[WebRTC] 📎 Audio element appended to DOM for ${peerId}`);

            // Set srcObject after appending to DOM
            audio.srcObject = event.streams[0];

            // Log stream tracks
            const stream = event.streams[0];
            // console.log(`[WebRTC] Stream for audio element:`, {
              // streamId: stream.id,
              // active: stream.active,
              // audioTracks: stream.getAudioTracks().map(t => ({
                // id: t.id,
                // enabled: t.enabled,
                // muted: t.muted,
                // readyState: t.readyState
              // }))
            // });

            // Monitor audio element
            audio.onplay = () => {
              // console.log(`[WebRTC] 🔊 Audio element playing for viewer ${peerId}`);
            };

            audio.onpause = () => {
              console.warn(`[WebRTC] ⏸️ Audio element paused for viewer ${peerId}`);
            };

            audio.onerror = (e) => {
              console.error(`[WebRTC] ❌ Audio element error for viewer ${peerId}:`, e);
            };

            audio.onloadedmetadata = () => {
              // console.log(`[WebRTC] 📊 Audio metadata loaded for ${peerId}:`, {
                // duration: audio.duration,
                // paused: audio.paused,
                // readyState: audio.readyState
              // });
            };

            // Play the audio with retry logic
            const attemptPlay = async () => {
              try {
                await audio.play();
                // console.log(`[WebRTC] ✅ Successfully started playing audio from viewer ${peerId}`);
                // console.log(`[WebRTC] Audio element state:`, {
                  // paused: audio.paused,
                  // volume: audio.volume,
                  // muted: audio.muted,
                  // readyState: audio.readyState,
                  // currentTime: audio.currentTime
                // });
              } catch (err: any) {
                console.error(`[WebRTC] ❌ Failed to play viewer audio from ${peerId}:`, err);

                // Retry after user interaction if autoplay was blocked
                if (err.name === 'NotAllowedError') {
                  // console.log(`[WebRTC] 🔄 Autoplay blocked - will retry on next user interaction`);
                  const retryPlay = () => {
                    audio.play().then(() => {
                      // console.log(`[WebRTC] ✅ Audio playback started after user interaction for ${peerId}`);
                      document.removeEventListener('click', retryPlay);
                    }).catch(console.error);
                  };
                  document.addEventListener('click', retryPlay, { once: true });
                }
              }
            };

            attemptPlay();

            this.viewerAudioElements.set(peerId, audio);
          } else if (existingAudioEl && event.streams[0]) {
            // Update existing audio element with new stream (in case of renegotiation)
            // console.log(`[WebRTC] 🔄 Updating audio stream for viewer ${peerId}`);
            existingAudioEl.srcObject = event.streams[0];
            existingAudioEl.muted = false;
            existingAudioEl.volume = 1.0;
            existingAudioEl.play().then(() => {
              // console.log(`[WebRTC] ✅ Resumed audio from viewer ${peerId} after renegotiation`);
            }).catch(err => {
              console.error(`[WebRTC] ❌ Failed to resume viewer audio from ${peerId}:`, err);
            });
          }
        }
      }

      if (this.onStreamCallback && event.streams[0]) {
        this.onStreamCallback(peerId, event.streams[0]);
      }
    };
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.onMessageCallback) {
        // console.log(`[WebRTC] Sending ICE candidate to ${peerId}:`, {
          // type: event.candidate.type,
          // protocol: event.candidate.protocol,
          // address: event.candidate.address
        // });
        this.onMessageCallback({
          type: 'webrtc-ice',
          streamId: this.currentStreamId,
          from: this.serverClientId || this.myClientId || this.myAddress, // Prefer server-assigned ID
          to: peerId,
          candidate: event.candidate
        } as any);
      }
    };
    
    // Monitor ICE connection state
    pc.oniceconnectionstatechange = () => {
      // console.log(`[WebRTC] ICE connection state changed for ${peerId}: ${pc.iceConnectionState}`);
      
      if (pc.iceConnectionState === 'connected' && pc.connectionState === 'connecting') {
        console.warn(`[WebRTC] ⚠️ ICE connected but peer connection still connecting for ${peerId}`);
        // console.log(`[WebRTC] This usually indicates DTLS handshake issues`);
        
        // Firefox-specific ICE connection handling
        if (this.isFirefox) {
          // console.log(`[WebRTC] Firefox detected - applying connection stability fixes`);
          // Firefox sometimes needs a nudge to complete the connection
          setTimeout(() => {
            if (pc.connectionState === 'connecting') {
              // console.log(`[WebRTC] Firefox connection still stuck - attempting stats read to trigger completion`);
              pc.getStats().then(() => {
                // console.log(`[WebRTC] Firefox stats read completed`);
              }).catch(e => {
                console.warn(`[WebRTC] Firefox stats read failed:`, e);
              });
            }
          }, 2000);
        }
      }
      
      // Firefox-specific ICE state handling
      if (this.isFirefox && pc.iceConnectionState === 'checking') {
        // console.log(`[WebRTC] Firefox ICE checking - monitoring for timeout`);
        // Firefox sometimes gets stuck in checking state
        setTimeout(() => {
          if (pc.iceConnectionState === 'checking') {
            console.warn(`[WebRTC] Firefox ICE checking timeout - connection may be stuck`);
          }
        }, 10000); // 10 second timeout
      }
    };
    
    // Add connection timeout handling
    const connectionTimeout = setTimeout(() => {
      if (pc.connectionState === 'connecting' || pc.iceConnectionState === 'checking') {
        console.warn(`[WebRTC] ⏰ Connection timeout for ${peerId} - state: ${pc.connectionState}, ICE: ${pc.iceConnectionState}`);
        
        if (this.isFirefox) {
          // console.log(`[WebRTC] Firefox connection timeout - attempting restart`);
          // For Firefox, try to restart the connection
          try {
            pc.restartIce();
            // console.log(`[WebRTC] Firefox ICE restart initiated for ${peerId}`);
          } catch (error) {
            console.error(`[WebRTC] Firefox ICE restart failed:`, error);
          }
        }
      }
    }, this.isFirefox ? 15000 : 10000); // Longer timeout for Firefox
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      // console.log(`[WebRTC] Connection state changed for ${peerId}: ${pc.connectionState}`);
      
      // Clear timeout on successful connection
      if (pc.connectionState === 'connected') {
        clearTimeout(connectionTimeout);
        // console.log(`[WebRTC] ✅ Connection established for ${peerId}`);
      } else if (pc.connectionState === 'failed') {
        clearTimeout(connectionTimeout);
        console.error(`[WebRTC] ❌ Connection failed for ${peerId}`);
      }
      // console.log(`[WebRTC] Detailed connection state:`, {
        // connectionState: pc.connectionState,
        // iceConnectionState: pc.iceConnectionState,
        // iceGatheringState: pc.iceGatheringState,
        // signalingState: pc.signalingState
      // });
      
      if (pc.connectionState === 'connected') {
        // console.log(`[WebRTC] ✅ Peer ${peerId} fully connected!`);
        
        // Log transceiver states when connected
        const transceivers = pc.getTransceivers();
        transceivers.forEach((transceiver, index) => {
          // console.log(`[WebRTC] Transceiver ${index} state:`, {
            // mid: transceiver.mid,
            // direction: transceiver.direction,
            // currentDirection: transceiver.currentDirection,
            // receiverTrack: transceiver.receiver.track ? {
              // kind: transceiver.receiver.track.kind,
              // muted: transceiver.receiver.track.muted,
              // enabled: transceiver.receiver.track.enabled,
              // readyState: transceiver.receiver.track.readyState
            // } : null
          // });
        });
      } else if (pc.connectionState === 'failed') {
        console.error(`[WebRTC] ❌ Connection failed for ${peerId}`);
      } else if (pc.connectionState === 'connecting') {
        // Additional debugging for stuck connections
        setTimeout(async () => {
          if (pc.connectionState === 'connecting') {
            console.warn(`[WebRTC] ⚠️ Connection still in 'connecting' state after 5s for ${peerId}`);
            const stats = await pc.getStats();
            let icePairFound = false;
            stats.forEach(report => {
              if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                icePairFound = true;
                // console.log(`[WebRTC] Active ICE pair found but connection stuck:`, {
                  // localCandidate: report.localCandidateId,
                  // remoteCandidate: report.remoteCandidateId,
                  // bytesReceived: report.bytesReceived,
                  // bytesSent: report.bytesSent
                // });
              }
            });
            if (!icePairFound) {
              console.error(`[WebRTC] ❌ No successful ICE candidate pair for ${peerId}`);
            }
          }
        }, 5000);
      }
      
      // Set up periodic connection health monitoring for debugging
      const healthCheckInterval = setInterval(async () => {
        if (pc.connectionState === 'connected') {
          try {
            const stats = await pc.getStats();
            let totalBytesReceived = 0;
            let videoBytes = 0;
            let audioBytes = 0;
            
            stats.forEach(report => {
              if (report.type === 'inbound-rtp') {
                totalBytesReceived += report.bytesReceived || 0;
                if (report.mediaType === 'video') {
                  videoBytes = report.bytesReceived || 0;
                } else if (report.mediaType === 'audio') {
                  audioBytes = report.bytesReceived || 0;
                }
              }
            });
            
            // Only log if we have connection issues
            if (totalBytesReceived === 0) {
              console.warn(`[WebRTC] ⚠️ Health check: No data received for peer ${peerId} (video: ${videoBytes}, audio: ${audioBytes})`);
              
              // Check transceiver states when no data is flowing
              pc.getTransceivers().forEach((transceiver, index) => {
                if (transceiver.receiver.track) {
                  const track = transceiver.receiver.track;
                  // console.log(`[WebRTC] Transceiver ${index} track state:`, {
                    // kind: track.kind,
                    // enabled: track.enabled,
                    // muted: track.muted,
                    // readyState: track.readyState,
                    // direction: transceiver.direction,
                    // currentDirection: transceiver.currentDirection
                  // });
                }
              });
            }
          } catch (error) {
            console.error(`[WebRTC] Health check failed for peer ${peerId}:`, error);
          }
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          clearInterval(healthCheckInterval);
        }
      }, 10000); // Check every 10 seconds
      
      // Store interval for cleanup
      this.healthCheckIntervals.set(peerId, healthCheckInterval);
      
      if (this.onPeerStateCallback) {
        this.onPeerStateCallback(peerId, pc.connectionState);
      }
      
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.removePeer(peerId);
      }
    };
    
    // Create data channel for low-latency communication
    if (isInitiator) {
      const dataChannel = pc.createDataChannel('stream-data', {
        ordered: true,
        maxRetransmits: 3
      });
      this.setupDataChannel(peerId, dataChannel);
    } else {
      pc.ondatachannel = (event) => {
        this.setupDataChannel(peerId, event.channel);
      };
    }
    
    // CRITICAL: Store the peer connection with the exact peerId
    this.peerConnections.set(peerId, pc);
    // console.log(`[WebRTC] ✅ Peer connection stored for peerId: ${peerId}`);
    // console.log(`[WebRTC] Total peer connections: ${this.peerConnections.size}`);
    // console.log(`[WebRTC] All peer IDs:`, Array.from(this.peerConnections.keys()));
    
    return pc;
  }
  
  private setupDataChannel(peerId: string, channel: RTCDataChannel) {
    channel.onopen = () => {
      this.dataChannels.set(peerId, channel);
    };
    
    channel.onclose = () => {
      this.dataChannels.delete(peerId);
    };
    
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // console.log('Data channel message:', data);
      } catch (error) {
        console.error('Failed to parse data channel message:', error);
      }
    };
  }
  
  public async createOffer(peerId: string): Promise<RTCSessionDescriptionInit> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) throw new Error('Peer connection not found');
    
    // console.log(`[WebRTC] Creating offer for peer ${peerId}`);
    
    // Check transceivers before creating offer
    const transceivers = pc.getTransceivers();
    transceivers.forEach((transceiver, idx) => {
      // console.log(`[WebRTC] Transceiver ${idx}:`, {
        // mid: transceiver.mid,
        // direction: transceiver.direction,
        // currentDirection: transceiver.currentDirection,
        // senderTrack: transceiver.sender.track?.kind,
        // senderTrackEnabled: transceiver.sender.track?.enabled,
        // senderTrackMuted: transceiver.sender.track?.muted
      // });
    });
    
    // Firefox-specific offer options
    const offerOptions: RTCOfferOptions = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    };
    
    if (this.isFirefox) {
      // Firefox-specific options for better compatibility
      Object.assign(offerOptions, {
        voiceActivityDetection: false, // Disable VAD for Firefox stability
      });
    }
    
    try {
      const offer = await pc.createOffer(offerOptions);
      
      // console.log(`[WebRTC] Offer created for ${peerId}, setting local description`);
      
      // Log SDP for debugging
      // console.log(`[WebRTC] Offer SDP (first 500 chars):`, offer.sdp?.substring(0, 500));
      
      await pc.setLocalDescription(offer);
      
      // Firefox-specific post-offer handling
      if (this.isFirefox && offer.sdp) {
        // Firefox sometimes benefits from SDP modification
        const modifiedSdp = this.optimizeSDPForFirefox(offer.sdp);
        if (modifiedSdp !== offer.sdp) {
          // console.log(`[WebRTC] Applied Firefox SDP optimizations`);
          const modifiedOffer = { ...offer, sdp: modifiedSdp };
          await pc.setLocalDescription(modifiedOffer);
          return modifiedOffer;
        }
      }
      
      return offer;
    } catch (error) {
      console.error(`[WebRTC] Failed to create offer for ${peerId}:`, error);
      if (this.isFirefox && error instanceof Error) {
        throw new Error(`Firefox offer creation failed: ${error.message}`);
      }
      throw error;
    }
  }
  
  private optimizeSDPForFirefox(sdp: string): string {
    // Firefox-specific SDP optimizations
    let optimizedSdp = sdp;
    
    // Firefox prefers specific codec orders
    // Prioritize VP8 over VP9 for better compatibility
    optimizedSdp = optimizedSdp.replace(
      /m=video [0-9]+ UDP\/TLS\/RTP\/SAVPF (.+)/g,
      (match, codecs) => {
        const codecList = codecs.split(' ');
        // Move VP8 to front if present
        const vp8Index = codecList.findIndex(c => c === '96'); // VP8 is typically 96
        if (vp8Index > 0) {
          const vp8 = codecList.splice(vp8Index, 1)[0];
          codecList.unshift(vp8);
          return match.replace(codecs, codecList.join(' '));
        }
        return match;
      }
    );
    
    return optimizedSdp;
  }
  
  public async createAnswer(peerId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) throw new Error('Peer connection not found');
    
    // console.log('[WebRTC] Creating answer for', peerId);
    // console.log(`[WebRTC] Current signaling state: ${pc.signalingState}`);
    // console.log('[WebRTC] Offer SDP preview:', offer.sdp?.substring(0, 500));
    
    // Check signaling state before setting remote description
    if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
      console.warn(`[WebRTC] ⚠️ Unexpected signaling state for offer: ${pc.signalingState}`);

      if (pc.signalingState === 'have-remote-offer') {
        // console.log(`[WebRTC] 🔄 Already have remote offer for ${peerId} - will replace with new offer`);
        // Continue - we'll set the new remote description
      } else if (pc.signalingState === 'closed') {
        throw new Error(`Cannot create answer - peer connection is closed`);
      }
    }

    // Check if offer contains video media
    if (offer.sdp) {
      const hasVideo = offer.sdp.includes('m=video');
      const hasAudio = offer.sdp.includes('m=audio');
      // console.log(`[WebRTC] Offer contains: video=${hasVideo}, audio=${hasAudio}`);
    }

    // For renegotiation, we need to set the remote description even if one exists
    // The signaling state 'stable' means we can safely set a new remote offer
    if (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer') {
      // console.log('[WebRTC] Setting remote description (offer) for', peerId, 'signalingState:', pc.signalingState);

      try {
        await pc.setRemoteDescription(offer);
        // console.log(`[WebRTC] ✅ Remote description (offer) set for ${peerId}`);

        // Process any queued ICE candidates now that remote description is set
        await this.processQueuedIceCandidates(peerId);
      } catch (error: any) {
        console.error(`[WebRTC] ❌ Failed to set remote description for ${peerId}:`, error);

        // If it's a signaling state error, log more details
        if (error.message?.includes('signaling state')) {
          console.error(`[WebRTC] Signaling state error. Current state:`, {
            signalingState: pc.signalingState,
            connectionState: pc.connectionState,
            iceConnectionState: pc.iceConnectionState
          });
        }
        throw error;
      }
    } else {
      console.warn(`[WebRTC] ⚠️ Cannot set remote description - wrong signaling state: ${pc.signalingState}`);
    }
    
    // Log transceivers after setting remote description
    const transceivers = pc.getTransceivers();
    // console.log('[WebRTC] Transceivers after remote description:');
    transceivers.forEach((t, i) => {
      // console.log(`  Transceiver ${i}:`, {
        // mid: t.mid,
        // direction: t.direction,
        // currentDirection: t.currentDirection,
        // receiver: {
          // track: t.receiver.track ? {
            // kind: t.receiver.track.kind,
            // id: t.receiver.track.id,
            // muted: t.receiver.track.muted,
            // enabled: t.receiver.track.enabled
          // } : 'no track'
        // }
      // });
    });
    
    const answer = await pc.createAnswer();
    // console.log('[WebRTC] Answer SDP preview:', answer.sdp?.substring(0, 500));
    
    await pc.setLocalDescription(answer);
    
    return answer;
  }
  
  public async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
    // console.log(`[WebRTC] 🔍 Looking for peer connection with ID: ${peerId}`);
    // console.log(`[WebRTC] 📋 Available peer connections:`, Array.from(this.peerConnections.keys()));
    
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      console.error(`[WebRTC] ❌ Cannot handle answer - no peer connection found for peerId: ${peerId}`);
      console.error(`[WebRTC] 📊 Peer connection management state:`, {
        totalConnections: this.peerConnections.size,
        availableIds: Array.from(this.peerConnections.keys()),
        requestedId: peerId,
        myClientId: this.myClientId,
        myAddress: this.myAddress,
        serverClientId: this.serverClientId
      });
      throw new Error(`Peer connection not found for peerId: ${peerId}`);
    }
    
    // console.log(`[WebRTC] ✅ Found peer connection for ${peerId}`);
    
    // CRITICAL: Check signaling state before setting remote description
    // console.log(`[WebRTC] Checking signaling state for ${peerId}:`, {
      // signalingState: pc.signalingState,
      // connectionState: pc.connectionState,
      // iceConnectionState: pc.iceConnectionState,
      // hasLocalDescription: !!pc.localDescription,
      // hasRemoteDescription: !!pc.remoteDescription
    // });
    
    // Validate signaling state - answer can only be set in "have-local-offer" state
    if (pc.signalingState !== 'have-local-offer') {
      console.warn(`[WebRTC] ⚠️ Cannot set answer for ${peerId} - wrong signaling state: ${pc.signalingState}`);
      
      if (pc.signalingState === 'stable') {
        // console.log(`[WebRTC] 🔄 Connection already in stable state for ${peerId} - ignoring duplicate answer`);
        return; // Don't throw error, just ignore duplicate answer
      }
      
      if (pc.signalingState === 'closed') {
        // console.log(`[WebRTC] 🚫 Connection is closed for ${peerId} - ignoring answer`);
        return;
      }
      
      // For other unexpected states, log and return
      console.error(`[WebRTC] ❌ Unexpected signaling state for answer: ${pc.signalingState}`);
      throw new Error(`Cannot set answer - peer connection in ${pc.signalingState} state`);
    }
    
    try {
      // console.log(`[WebRTC] Setting remote description (answer) for ${peerId}`);
      await pc.setRemoteDescription(answer);
      // console.log(`[WebRTC] ✅ Answer set successfully for ${peerId} - state now: ${pc.signalingState}`);
      
      // Process any queued ICE candidates now that remote description is set
      await this.processQueuedIceCandidates(peerId);
    } catch (error) {
      console.error(`[WebRTC] ❌ Failed to set answer for ${peerId}:`, error);
      console.error(`[WebRTC] 📊 Connection state during error:`, {
        signalingState: pc.signalingState,
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        answerSdp: answer.sdp?.substring(0, 100) + '...'
      });
      throw error;
    }
  }
  
  public async addIceCandidate(peerId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      console.warn(`[WebRTC] Peer connection not found for ${peerId}, ICE candidate will be dropped`);
      // console.log(`[WebRTC] Available connections:`, Array.from(this.peerConnections.keys()));
      return;
    }
    
    // Create candidate fingerprint to avoid duplicates
    const candidateFingerprint = candidate.candidate ? 
      `${candidate.candidate}:${candidate.sdpMLineIndex}:${candidate.sdpMid}` : 
      'null-candidate';
    
    // Initialize processed candidates set for this peer
    if (!this.processedCandidates.has(peerId)) {
      this.processedCandidates.set(peerId, new Set());
    }
    
    // Check if we've already processed this candidate
    const processedSet = this.processedCandidates.get(peerId)!;
    if (processedSet.has(candidateFingerprint)) {
      // console.log(`[WebRTC] Skipping duplicate ICE candidate for ${peerId}`);
      return;
    }
    
    // Mark candidate as processed
    processedSet.add(candidateFingerprint);
    
    // Check if remote description is set
    if (!pc.remoteDescription) {
      // console.log(`[WebRTC] Remote description not set for ${peerId}, queuing ICE candidate`);
      
      // Initialize queue for this peer if it doesn't exist
      if (!this.queuedIceCandidates.has(peerId)) {
        this.queuedIceCandidates.set(peerId, []);
      }
      
      // Add candidate to queue
      this.queuedIceCandidates.get(peerId)!.push(candidate);
      // console.log(`[WebRTC] ICE candidate queued for ${peerId} (queue size: ${this.queuedIceCandidates.get(peerId)!.length})`);
      return;
    }
    
    try {
      // console.log(`[WebRTC] Adding ICE candidate for ${peerId}:`, {
        // type: candidate.candidate?.split(' ')[7], // candidate type
        // protocol: candidate.candidate?.split(' ')[2], // protocol
        // signalingState: pc.signalingState,
        // remoteDescriptionSet: !!pc.remoteDescription,
        // isFirefox: this.isFirefox
      // });
      
      // Firefox-specific candidate handling
      if (this.isFirefox) {
        // Firefox sometimes needs a small delay before adding candidates
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Validate candidate format for Firefox
        if (candidate.candidate && !this.isValidFirefoxCandidate(candidate.candidate)) {
          console.warn(`[WebRTC] Skipping invalid Firefox candidate: ${candidate.candidate}`);
          return;
        }
      }
      
      await pc.addIceCandidate(candidate);
      // console.log(`[WebRTC] ✅ ICE candidate added for peer ${peerId}`);
    } catch (error: any) {
      console.error(`[WebRTC] ❌ Failed to add ICE candidate for peer ${peerId}:`, error);
      
      // Firefox-specific error handling
      if (this.isFirefox) {
        if (error.message?.includes('InvalidStateError')) {
          console.warn(`[WebRTC] Firefox InvalidStateError - peer connection may be in transition`);
          // Retry after a short delay for Firefox
          setTimeout(async () => {
            try {
              await pc.addIceCandidate(candidate);
              // console.log(`[WebRTC] ✅ Firefox ICE candidate retry successful for ${peerId}`);
            } catch (retryError) {
              console.error(`[WebRTC] Firefox ICE candidate retry failed:`, retryError);
            }
          }, 200);
        }
      }
      
      // console.log(`[WebRTC] Peer connection state:`, {
        // signalingState: pc.signalingState,
        // iceConnectionState: pc.iceConnectionState,
        // connectionState: pc.connectionState,
        // hasRemoteDescription: !!pc.remoteDescription,
        // hasLocalDescription: !!pc.localDescription
      // });
    }
  }
  
  private isValidFirefoxCandidate(candidate: string): boolean {
    // Firefox has strict candidate format requirements
    // Check for basic candidate structure
    const parts = candidate.split(' ');
    if (parts.length < 8) {
      return false;
    }
    
    // Check for required fields
    const hasFoundation = parts[0] && parts[0] !== '';
    const hasComponent = parts[1] && !isNaN(parseInt(parts[1]));
    const hasProtocol = parts[2] && (parts[2] === 'UDP' || parts[2] === 'TCP');
    const hasPriority = parts[3] && !isNaN(parseInt(parts[3]));
    const hasAddress = parts[4] && parts[4] !== '';
    const hasPort = parts[5] && !isNaN(parseInt(parts[5]));
    const hasType = parts[6] === 'typ';
    const hasCandidateType = parts[7] && ['host', 'srflx', 'prflx', 'relay'].includes(parts[7]);
    
    return hasFoundation && hasComponent && hasProtocol && hasPriority && hasAddress && hasPort && hasType && hasCandidateType;
  }

  private async processQueuedIceCandidates(peerId: string) {
    const queuedCandidates = this.queuedIceCandidates.get(peerId);
    if (!queuedCandidates || queuedCandidates.length === 0) {
      return;
    }
    
    // console.log(`[WebRTC] Processing ${queuedCandidates.length} queued ICE candidates for ${peerId}`);
    
    const pc = this.peerConnections.get(peerId);
    if (!pc || !pc.remoteDescription) {
      console.warn(`[WebRTC] Cannot process queued candidates - no remote description for ${peerId}`);
      return;
    }
    
    // Process all queued candidates
    for (const candidate of queuedCandidates) {
      try {
        await pc.addIceCandidate(candidate);
        // console.log(`[WebRTC] ✅ Queued ICE candidate processed for ${peerId}`);
      } catch (error) {
        console.error(`[WebRTC] ❌ Failed to add queued ICE candidate for ${peerId}:`, error);
      }
    }
    
    // Clear the queue
    this.queuedIceCandidates.delete(peerId);
    // console.log(`[WebRTC] Cleared ICE candidate queue for ${peerId}`);
  }

  public setServerClientId(clientId: string) {
    this.serverClientId = clientId;
    this.myClientId = clientId;
    // console.log(`[WebRTC] Server client ID set: ${clientId}`);
  }
  
  public replaceVideoTrack(newTrack: MediaStreamTrack) {
    // console.log('Replacing video track in all peer connections:', newTrack);
    this.peerConnections.forEach((pc, peerId) => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        // console.log(`Replacing track for peer ${peerId}:`, sender);
        sender.replaceTrack(newTrack).then(() => {
          // console.log(`Track replaced successfully for peer ${peerId}`);
        }).catch(error => {
          console.error(`Failed to replace track for peer ${peerId}:`, error);
        });
      } else {
        // console.log(`No video sender found for peer ${peerId}`);
      }
    });
  }
  
  public stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
      
      // Replace with camera video if available
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          this.replaceVideoTrack(videoTrack);
        }
      }
    }
  }
  
  public updateStreamQuality(quality: StreamQuality) {
    this.peerConnections.forEach((pc) => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender && sender.track) {
        const params = sender.getParameters();
        if (params.encodings && params.encodings[0]) {
          params.encodings[0].maxBitrate = quality.bitrate;
          params.encodings[0].maxFramerate = quality.framerate;
          sender.setParameters(params);
        }
      }
    });
  }
  
  public toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }
  
  public toggleVideo(enabled: boolean) {
    if (this.localStream && !this.screenStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  // Initialize viewer's microphone
  public async initializeViewerMic(): Promise<MediaStream> {
    try {
      // console.log('[WebRTC] 🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false
      });

      // console.log('[WebRTC] ✅ Viewer microphone initialized');

      // Log stream details
      const audioTracks = stream.getAudioTracks();
      // console.log('[WebRTC] Microphone stream details:', {
        // streamId: stream.id,
        // active: stream.active,
        // audioTracksCount: audioTracks.length
      // });

      audioTracks.forEach((track, index) => {
        // console.log(`[WebRTC] Audio track ${index}:`, {
          // id: track.id,
          // label: track.label,
          // enabled: track.enabled,
          // muted: track.muted,
          // readyState: track.readyState,
          // settings: track.getSettings()
        // });

        // Monitor for mute/unmute events
        track.onmute = () => {
          console.warn(`[WebRTC] ⚠️ Viewer mic track ${index} MUTED!`);
        };

        track.onunmute = () => {
          // console.log(`[WebRTC] ✅ Viewer mic track ${index} UNMUTED`);
        };

        track.onended = () => {
          console.error(`[WebRTC] ❌ Viewer mic track ${index} ENDED!`);
        };
      });

      return stream;
    } catch (error) {
      console.error('[WebRTC] Failed to get viewer mic:', error);
      throw error;
    }
  }

  // Add viewer audio track to broadcaster connection
  public async enableViewerAudio(peerId: string, audioTrack: MediaStreamTrack, stream: MediaStream): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      console.error('[WebRTC] No peer connection for:', peerId);
      return;
    }

    // console.log('[WebRTC] Adding viewer audio track to connection:', peerId, {
      // trackId: audioTrack.id,
      // trackEnabled: audioTrack.enabled,
      // trackMuted: audioTrack.muted,
      // trackReadyState: audioTrack.readyState,
      // streamId: stream.id
    // });

    // Store the track
    this.viewerAudioTracks.set(peerId, audioTrack);

    // Check existing transceivers first
    const transceivers = pc.getTransceivers();
    // console.log('[WebRTC] Current transceivers before adding audio:', transceivers.map((t, i) => ({
      // index: i,
      // mid: t.mid,
      // direction: t.direction,
      // currentDirection: t.currentDirection,
      // kind: t.receiver.track?.kind,
      // hasSenderTrack: !!t.sender.track
    // })));

    // Look for existing audio transceiver with sendrecv direction
    let audioTransceiver = transceivers.find(t =>
      t.receiver.track?.kind === 'audio' &&
      (t.direction === 'sendrecv' || t.direction === 'sendonly')
    );

    let sender: RTCRtpSender;

    if (audioTransceiver && !audioTransceiver.sender.track) {
      // Reuse existing audio transceiver by replacing its track
      // console.log('[WebRTC] Found existing audio transceiver without track, replacing...');
      await audioTransceiver.sender.replaceTrack(audioTrack);
      sender = audioTransceiver.sender;
      // console.log('[WebRTC] ✅ Audio track replaced in existing transceiver');
    } else {
      // Add new track (will create new transceiver or reuse existing one)
      // console.log('[WebRTC] Adding audio track to peer connection...');
      sender = pc.addTrack(audioTrack, stream);
      // console.log('[WebRTC] ✅ Audio track added');
    }

    // console.log('[WebRTC] Audio track sender state:', {
      // track: sender.track?.id,
      // trackEnabled: sender.track?.enabled,
      // trackMuted: sender.track?.muted,
      // trackReadyState: sender.track?.readyState
    // });

    // Log updated transceivers
    const updatedTransceivers = pc.getTransceivers();
    // console.log('[WebRTC] Transceivers after adding audio:');
    updatedTransceivers.forEach((t, i) => {
      // console.log(`  Transceiver ${i}:`, {
        // mid: t.mid,
        // direction: t.direction,
        // currentDirection: t.currentDirection,
        // kind: t.receiver.track?.kind,
        // senderTrack: t.sender.track ? {
          // kind: t.sender.track.kind,
          // id: t.sender.track.id,
          // enabled: t.sender.track.enabled,
          // muted: t.sender.track.muted,
          // readyState: t.sender.track.readyState
        // } : null
      // });
    });

    // Trigger renegotiation
    // console.log('[WebRTC] Starting renegotiation for viewer audio...');
    await this.renegotiate(peerId);
  }

  // Remove viewer audio track
  public async disableViewerAudio(peerId: string): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) return;

    const audioTrack = this.viewerAudioTracks.get(peerId);
    if (!audioTrack) return;

    // console.log('[WebRTC] Removing viewer audio track:', peerId);

    // Find and remove the sender
    const senders = pc.getSenders();
    const audioSender = senders.find(s => s.track === audioTrack);
    if (audioSender) {
      pc.removeTrack(audioSender);
    }

    // Stop the track
    audioTrack.stop();
    this.viewerAudioTracks.delete(peerId);

    // Trigger renegotiation
    await this.renegotiate(peerId);
  }

  // Clean up viewer audio element (called when viewer disables their audio)
  public cleanupViewerAudioElement(peerId: string): void {
    const audioEl = this.viewerAudioElements.get(peerId);
    if (audioEl) {
      // console.log('[WebRTC] Cleaning up audio element for viewer:', peerId);
      audioEl.pause();
      audioEl.srcObject = null;
      if (audioEl.parentNode) {
        audioEl.parentNode.removeChild(audioEl);
      }
      this.viewerAudioElements.delete(peerId);
    }
  }

  // Renegotiate connection (create new offer/answer)
  private async renegotiate(peerId: string): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) return;

    // console.log('[WebRTC] Renegotiating connection:', peerId);

    // Create new offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Send via signaling
    if (this.onMessageCallback) {
      this.onMessageCallback({
        type: 'webrtc-offer',
        from: this.myClientId,
        to: peerId,
        offer: offer,
        streamId: this.currentStreamId,
        isRenegotiation: true
      } as any);
    }
  }

  public sendDataChannelMessage(peerId: string, data: any) {
    const channel = this.dataChannels.get(peerId);
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify(data));
    }
  }
  
  public broadcastDataChannelMessage(data: any) {
    this.dataChannels.forEach((channel, peerId) => {
      if (channel.readyState === 'open') {
        channel.send(JSON.stringify(data));
      }
    });
  }
  
  public removePeer(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    
    const channel = this.dataChannels.get(peerId);
    if (channel) {
      channel.close();
      this.dataChannels.delete(peerId);
    }
    
    // Clean up health check interval
    const healthCheckInterval = this.healthCheckIntervals.get(peerId);
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      this.healthCheckIntervals.delete(peerId);
    }
    
    // Clean up queued ICE candidates
    if (this.queuedIceCandidates.has(peerId)) {
      const queueSize = this.queuedIceCandidates.get(peerId)!.length;
      this.queuedIceCandidates.delete(peerId);
      // console.log(`[WebRTC] Cleared ${queueSize} queued ICE candidates for removed peer ${peerId}`);
    }
    
    // Clean up processed candidates tracking
    if (this.processedCandidates.has(peerId)) {
      const processedCount = this.processedCandidates.get(peerId)!.size;
      this.processedCandidates.delete(peerId);
      // console.log(`[WebRTC] Cleared ${processedCount} processed candidate records for removed peer ${peerId}`);
    }

    // Clean up viewer audio elements
    const audioEl = this.viewerAudioElements.get(peerId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      // Remove from DOM if it was appended
      if (audioEl.parentNode) {
        audioEl.parentNode.removeChild(audioEl);
      }
      this.viewerAudioElements.delete(peerId);
      // console.log(`[WebRTC] 🎤 Cleaned up audio element for viewer ${peerId}`);
    }

    // Clean up viewer audio tracks
    if (this.viewerAudioTracks.has(peerId)) {
      this.viewerAudioTracks.delete(peerId);
      // console.log(`[WebRTC] 🎤 Cleaned up audio track for viewer ${peerId}`);
    }
  }
  
  public async getStreamStats(peerId: string): Promise<RTCStatsReport | null> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) return null;
    
    return await pc.getStats();
  }
  
  public cleanup() {
    // console.log('[WebRTC] Starting cleanup...');
    
    // Stop all streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
    
    // Close all peer connections
    this.peerConnections.forEach((pc, peerId) => {
      // console.log(`[WebRTC] Closing peer connection for ${peerId}`);
      pc.close();
    });
    this.peerConnections.clear();
    
    // Close all data channels
    this.dataChannels.forEach((channel) => {
      channel.close();
    });
    this.dataChannels.clear();
    
    // Clear all health check intervals
    this.healthCheckIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.healthCheckIntervals.clear();
    
    // Clear all queued ICE candidates
    this.queuedIceCandidates.clear();
    
    // Clear all processed candidates tracking
    this.processedCandidates.clear();

    // Clean up all viewer audio elements
    this.viewerAudioElements.forEach((audio, peerId) => {
      audio.pause();
      audio.srcObject = null;
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio);
      }
      // console.log(`[WebRTC] 🎤 Cleaned up audio element for ${peerId}`);
    });
    this.viewerAudioElements.clear();

    // Clear viewer audio tracks
    this.viewerAudioTracks.forEach((track, peerId) => {
      track.stop();
      // console.log(`[WebRTC] 🎤 Stopped audio track for ${peerId}`);
    });
    this.viewerAudioTracks.clear();

    // Reset client identifiers (important for reopening streams)
    this.currentStreamId = '';
    this.serverClientId = '';

    // Generate a new client ID for the next session to avoid conflicts
    this.myClientId = `client-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    // console.log(`[WebRTC] Generated new client ID for next session: ${this.myClientId}`);

    // console.log('[WebRTC] ✅ Cleanup completed - all resources cleared and ready for next stream');
  }
}

export const webrtcService = new WebRTCService();