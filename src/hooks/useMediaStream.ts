import { useState, useEffect, useCallback, useRef } from 'react';
import { webrtcService } from '../services/webrtcService';

interface UseMediaStreamOptions {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
  autoStart?: boolean;
}

interface UseMediaStreamReturn {
  localStream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  startStream: () => Promise<void>;
  stopStream: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  switchCamera: () => Promise<void>;
  getDevices: () => Promise<MediaDeviceInfo[]>;
}

export const useMediaStream = (options: UseMediaStreamOptions = {}): UseMediaStreamReturn => {
  const {
    video = true,
    audio = true,
    autoStart = false
  } = options;
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentCamera, setCurrentCamera] = useState<'user' | 'environment'>('user');
  
  const streamRef = useRef<MediaStream | null>(null);
  
  const getMediaConstraints = useCallback((): MediaStreamConstraints => {
    return {
      video: video ? (typeof video === 'object' ? video : {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: currentCamera,
        frameRate: { ideal: 30 }
      }) : false,
      audio: audio ? (typeof audio === 'object' ? audio : {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }) : false
    };
  }, [video, audio, currentCamera]);
  
  const startStream = useCallback(async () => {
    if (streamRef.current) {
      console.warn('Stream already active');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const constraints = getMediaConstraints();
      const stream = await webrtcService.initializeLocalStream(constraints);
      
      streamRef.current = stream;
      setLocalStream(stream);
      
      // Set initial states based on tracks
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];
      
      if (audioTrack) {
        setAudioEnabled(audioTrack.enabled);
      }
      if (videoTrack) {
        setVideoEnabled(videoTrack.enabled);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access media devices';
      setError(errorMessage);
      console.error('Failed to start media stream:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getMediaConstraints]);
  
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setLocalStream(null);
      setIsScreenSharing(false);
    }
  }, []);
  
  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
        webrtcService.toggleAudio(audioTrack.enabled);
      }
    }
  }, []);
  
  const toggleVideo = useCallback(() => {
    if (streamRef.current && !isScreenSharing) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
        webrtcService.toggleVideo(videoTrack.enabled);
      }
    }
  }, [isScreenSharing]);
  
  const startScreenShare = useCallback(async () => {
    if (isScreenSharing) return;
    
    try {
      const screenStream = await webrtcService.initializeScreenShare();
      const screenTrack = screenStream.getVideoTracks()[0];
      
      if (streamRef.current && screenTrack) {
        // Replace video track with screen share
        const oldVideoTrack = streamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) {
          streamRef.current.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        
        streamRef.current.addTrack(screenTrack);
        webrtcService.replaceVideoTrack(screenTrack);
        
        setIsScreenSharing(true);
        setVideoEnabled(true);
        
        // Listen for screen share end
        screenTrack.onended = () => {
          stopScreenShare();
        };
      }
    } catch (err) {
      console.error('Failed to start screen share:', err);
      setError('Failed to start screen sharing');
    }
  }, [isScreenSharing]);
  
  const stopScreenShare = useCallback(async () => {
    if (!isScreenSharing || !streamRef.current) return;
    
    try {
      webrtcService.stopScreenShare();
      
      // Replace screen share with camera
      const constraints = getMediaConstraints();
      if (constraints.video) {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: constraints.video });
        const newVideoTrack = newStream.getVideoTracks()[0];
        
        if (newVideoTrack) {
          const oldScreenTrack = streamRef.current.getVideoTracks()[0];
          if (oldScreenTrack) {
            streamRef.current.removeTrack(oldScreenTrack);
            oldScreenTrack.stop();
          }
          
          streamRef.current.addTrack(newVideoTrack);
          webrtcService.replaceVideoTrack(newVideoTrack);
        }
      }
      
      setIsScreenSharing(false);
    } catch (err) {
      console.error('Failed to stop screen share:', err);
      setError('Failed to stop screen sharing');
    }
  }, [isScreenSharing, getMediaConstraints]);
  
  const switchCamera = useCallback(async () => {
    if (!streamRef.current || isScreenSharing) return;
    
    try {
      const newFacingMode = currentCamera === 'user' ? 'environment' : 'user';
      setCurrentCamera(newFacingMode);
      
      // Get new stream with different camera
      const constraints = getMediaConstraints();
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      if (newVideoTrack && streamRef.current) {
        const oldVideoTrack = streamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) {
          streamRef.current.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        
        streamRef.current.addTrack(newVideoTrack);
        webrtcService.replaceVideoTrack(newVideoTrack);
      }
    } catch (err) {
      console.error('Failed to switch camera:', err);
      setError('Failed to switch camera');
    }
  }, [currentCamera, isScreenSharing, getMediaConstraints]);
  
  const getDevices = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices;
    } catch (err) {
      console.error('Failed to enumerate devices:', err);
      return [];
    }
  }, []);
  
  // Auto-start stream if requested
  useEffect(() => {
    if (autoStart && !streamRef.current) {
      startStream();
    }
  }, [autoStart, startStream]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);
  
  return {
    localStream,
    isLoading,
    error,
    audioEnabled,
    videoEnabled,
    isScreenSharing,
    startStream,
    stopStream,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    switchCamera,
    getDevices
  };
};