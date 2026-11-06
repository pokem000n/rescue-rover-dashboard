/**
 * UIU Rescue Rover - WebRTC Peer Connection Manager
 * 
 * Supports both:
 * 1. Mobile Phone Camera Broadcaster (creates offer, streams media)
 * 2. Dashboard Viewer (receives offer, creates answer, plays stream)
 */

import { wsClient } from './websocket';

// Public STUN servers for NAT traversal
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export class WebRTCBroadcaster {
  constructor(localVideoElement, onStatusChange) {
    this.videoElement = localVideoElement;
    this.onStatusChange = onStatusChange || (() => {});
    this.peerConnection = null;
    this.localStream = null;
    this.unsubscribers = [];
  }

  async startCamera(facingMode = 'environment') {
    try {
      this.onStatusChange('requesting_camera');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      this.localStream = stream;
      if (this.videoElement) {
        this.videoElement.srcObject = stream;
        this.videoElement.play().catch(e => console.warn('Preview autoplay error:', e));
      }

      this._setupSignalingListeners();
      await this._createPeerConnection();

      // Notify backend camera stream started
      wsClient.send({
        type: 'camera_stream_started'
      });

      this.onStatusChange('broadcasting');
      return true;
    } catch (err) {
      console.error('[WebRTC-Broadcaster] Failed to access camera:', err);
      this.onStatusChange('camera_error', err.message);
      throw err;
    }
  }

  async _createPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // ICE Candidate exchange
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        wsClient.send({
          type: 'webrtc_candidate',
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      console.log(`[WebRTC-Broadcaster] Connection State: ${state}`);
      if (state === 'connected') {
        this.onStatusChange('peer_connected');
      } else if (state === 'disconnected' || state === 'failed') {
        this.onStatusChange('peer_disconnected');
      }
    };

    // Create SDP Offer
    const offer = await this.peerConnection.createOffer({
      offerToReceiveVideo: false,
      offerToReceiveAudio: false
    });
    await this.peerConnection.setLocalDescription(offer);

    wsClient.send({
      type: 'webrtc_offer',
      sdp: offer
    });
  }

  _setupSignalingListeners() {
    // Clean previous subscriptions
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];

    // Listen for answer from dashboard
    const unsubAnswer = wsClient.on('webrtc_answer', async (message) => {
      if (this.peerConnection && message.sdp) {
        try {
          console.log('[WebRTC-Broadcaster] Received remote answer');
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
        } catch (err) {
          console.error('[WebRTC-Broadcaster] Error setting remote description:', err);
        }
      }
    });

    // Listen for remote ICE candidates
    const unsubIce = wsClient.on('webrtc_candidate', async (message) => {
      if (this.peerConnection && message.candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
        } catch (err) {
          console.warn('[WebRTC-Broadcaster] Error adding candidate:', err);
        }
      }
    });

    this.unsubscribers.push(unsubAnswer, unsubIce);
  }

  stop() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];

    wsClient.send({
      type: 'camera_stream_stopped'
    });

    this.onStatusChange('idle');
  }
}

export class WebRTCViewer {
  constructor(remoteVideoElement, onStatusChange) {
    this.videoElement = remoteVideoElement;
    this.onStatusChange = onStatusChange || (() => {});
    this.peerConnection = null;
    this.unsubscribers = [];
  }

  init() {
    this._cleanup();

    const unsubOffer = wsClient.on('webrtc_offer', async (message) => {
      console.log('[WebRTC-Viewer] Received offer from mobile camera');
      await this._handleOffer(message.sdp);
    });

    const unsubIce = wsClient.on('webrtc_candidate', async (message) => {
      if (this.peerConnection && message.candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
        } catch (err) {
          console.warn('[WebRTC-Viewer] Error adding ICE candidate:', err);
        }
      }
    });

    this.unsubscribers.push(unOffer => unsubOffer, unsubIce);
  }

  async _handleOffer(offerSdp) {
    try {
      if (this.peerConnection) {
        this.peerConnection.close();
      }

      this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

      this.peerConnection.ontrack = (event) => {
        console.log('[WebRTC-Viewer] Remote video track received!');
        if (this.videoElement && event.streams && event.streams[0]) {
          this.videoElement.srcObject = event.streams[0];
          this.videoElement.play().catch(e => console.warn('[WebRTC-Viewer] Autoplay:', e));
          this.onStatusChange('connected');
        }
      };

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          wsClient.send({
            type: 'webrtc_candidate',
            candidate: event.candidate
          });
        }
      };

      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection.connectionState;
        console.log(`[WebRTC-Viewer] State: ${state}`);
        if (state === 'connected') {
          this.onStatusChange('connected');
        } else if (state === 'disconnected' || state === 'failed') {
          this.onStatusChange('disconnected');
        }
      };

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send answer back to mobile camera broadcaster
      wsClient.send({
        type: 'webrtc_answer',
        sdp: answer
      });

      this.onStatusChange('negotiating');
    } catch (err) {
      console.error('[WebRTC-Viewer] Failed to handle offer:', err);
      this.onStatusChange('error');
    }
  }

  _cleanup() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }

  destroy() {
    this._cleanup();
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }
}
