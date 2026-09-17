import React, { useState, useEffect, useRef } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Smartphone, 
  QrCode, 
  RefreshCw, 
  X, 
  Video,
  Radio,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Peer } from 'peerjs';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' }
];

export default function CameraFeed({ isDemoMode }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const peerRef = useRef(null);

  // Generate a clean, instant room code that never blocks or waits
  const [roomCode] = useState(() => {
    const existing = sessionStorage.getItem('rover_channel_id');
    if (existing) return existing;
    const newId = 'urrt-' + Math.random().toString(36).substring(2, 7);
    sessionStorage.setItem('rover_channel_id', newId);
    return newId;
  });

  const [streamStatus, setStreamStatus] = useState('waiting'); // 'waiting' | 'connecting' | 'connected'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Waiting for phone connection...');

  // Pairing URL is always ready instantly
  const mobileUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/camera?room=${roomCode}` 
    : '';

  useEffect(() => {
    let peerInstance = null;

    try {
      // Connect to PeerJS with the generated roomCode
      peerInstance = new Peer(roomCode, {
        config: {
          iceServers: ICE_SERVERS
        }
      });
      peerRef.current = peerInstance;

      peerInstance.on('open', (id) => {
        console.log('[CameraFeed] Live channel ready:', id);
      });

      peerInstance.on('call', (call) => {
        console.log('[CameraFeed] Incoming mobile camera call!');
        setStreamStatus('connecting');
        setStatusMessage('Connecting live video feed...');

        call.answer();

        call.on('stream', (remoteStream) => {
          console.log('[CameraFeed] Stream received:', remoteStream);
          if (videoRef.current) {
            videoRef.current.srcObject = remoteStream;
            videoRef.current.muted = true;
            videoRef.current.play().then(() => {
              setStreamStatus('connected');
              setStatusMessage('Live feed active');
            }).catch(e => {
              console.warn('Play error:', e);
              setStreamStatus('connected');
            });
          }
          setStreamStatus('connected');
        });

        call.on('close', () => {
          setStreamStatus('waiting');
          setStatusMessage('Phone disconnected');
        });

        call.on('error', (err) => {
          console.warn('Call error:', err);
          setStreamStatus('waiting');
        });
      });

      peerInstance.on('disconnected', () => {
        console.log('[CameraFeed] Broker dropped, auto-reconnecting...');
        try {
          peerInstance.reconnect();
        } catch (e) {}
      });

      peerInstance.on('error', (err) => {
        console.warn('[CameraFeed] Peer status:', err.type, err.message);
        if (err.type === 'disconnected' || (err.message && err.message.toLowerCase().includes('lost connection'))) {
          setTimeout(() => {
            try { peerInstance.reconnect(); } catch (e) {}
          }, 1500);
        }
      });
    } catch (err) {
      console.error('[CameraFeed] Init error:', err);
    }

    return () => {
      if (peerInstance) {
        peerInstance.destroy();
      }
    };
  }, [roomCode]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.warn('Fullscreen error:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
      setIsFullscreen(false);
    }
  };

  const handleReset = () => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamStatus('waiting');
    setStatusMessage('Waiting for smartphone connection...');
  };

  const isLive = streamStatus === 'connected';

  return (
    <div 
      ref={containerRef}
      className={`relative rounded-2xl bg-[#0f1624] border border-[#162338] overflow-hidden shadow-2xl flex flex-col transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-black' : 'h-full min-h-[380px] lg:min-h-[440px]'
      }`}
    >
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0a0f18]/95 border-b border-[#162338] z-10">
        <div className="flex items-center space-x-2.5">
          <div className={`p-1.5 rounded-lg border ${
            isLive 
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
              : 'bg-[#00c2cb]/10 border-[#00c2cb]/30 text-[#00c2cb]'
          }`}>
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-tech tracking-wider text-white flex items-center gap-2 uppercase">
              LIVE ROVER CAMERA
              {isLive ? (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 animate-pulse">
                  ● LIVE STREAM
                </span>
              ) : streamStatus === 'connecting' ? (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-pulse">
                  CONNECTING...
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#06090e] text-slate-400 border border-[#162338]">
                  {isDemoMode ? 'SIMULATION MODE' : 'STANDBY'}
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Viewport Action Controls */}
        <div className="flex items-center space-x-1.5 font-mono text-xs">
          <button
            onClick={() => setShowPairModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#00a8b5]/20 to-[#00c2cb]/10 hover:bg-[#00c2cb]/20 border border-[#00c2cb]/40 text-[#00c2cb] transition-colors"
            title="Scan QR Code to stream from smartphone"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PAIR PHONE</span>
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 rounded-xl bg-[#06090e] hover:bg-slate-800 text-slate-300 border border-[#162338] transition-colors"
            title="Reset video stream"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-[#06090e] hover:bg-slate-800 text-slate-300 border border-[#162338] transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[300px]">
        
        {/* Remote Live Video Stream Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-contain ${isLive ? 'block' : 'hidden'}`}
        />

        {/* Fallback Standby / Demo View when no phone camera is connected */}
        {!isLive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#0a0f18] via-[#06090e] to-black">
            
            {/* Tactical Crosshair / HUD Overlay */}
            <div className="absolute inset-4 border border-[#00c2cb]/20 pointer-events-none rounded-2xl">
              <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-[#00c2cb]" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-[#00c2cb]" />
              <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-[#00c2cb]" />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-[#00c2cb]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-dashed border-[#00c2cb]/30 rounded-full animate-spin-slow" />
            </div>

            <div className="relative z-10 max-w-md">
              {/* Official UIU Rescue Rover Team Logo Badge in Viewfinder */}
              <div className="relative mx-auto w-20 h-20 mb-3 group">
                <div className="w-full h-full rounded-full p-0.5 bg-gradient-to-tr from-[#00a8b5] to-[#00e5ff] shadow-[0_0_25px_rgba(0,194,203,0.45)]">
                  <img 
                    src="/urrt-logo.png" 
                    alt="UIU Rescue Rover Team" 
                    className="w-full h-full rounded-full object-cover bg-black"
                  />
                </div>
                {streamStatus === 'connecting' && (
                  <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#00c2cb]" />
                  </div>
                )}
              </div>

              <h3 className="text-base font-bold font-tech text-white tracking-wider mb-1">
                {streamStatus === 'connecting' ? 'CONNECTING PHONE STREAM...' : 'NO WIRELESS CAMERA CONNECTED'}
              </h3>
              
              <p className="text-xs text-slate-400 font-mono mb-4 leading-relaxed">
                {statusMessage}
              </p>

              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setShowPairModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00a8b5] to-[#00c2cb] hover:from-[#00c2cb] hover:to-[#00e5ff] text-black font-bold text-xs font-tech tracking-wider flex items-center gap-2 shadow-lg shadow-[#00c2cb]/20 transition-all"
                >
                  <QrCode className="w-4 h-4" />
                  <span>PAIR PHONE CAMERA</span>
                </button>

                {roomCode && (
                  <a
                    href={`/camera?room=${roomCode}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2.5 rounded-xl bg-[#06090e] hover:bg-slate-800 border border-[#162338] text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <span>TEST IN NEW TAB</span>
                  </a>
                )}
              </div>
            </div>

          </div>
        )}

        {/* HUD Telemetry Overlay on Live Stream */}
        {isLive && (
          <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between text-[11px] font-mono text-[#00c2cb]">
            <div className="flex justify-between items-start">
              <div className="bg-black/70 backdrop-blur px-2.5 py-1 rounded-lg border border-[#00c2cb]/40 flex items-center gap-2">
                <img src="/urrt-logo.png" alt="URRT" className="w-3.5 h-3.5 rounded-full" />
                <span>UIU RESCUE ROVER CAM 01</span>
              </div>
              <div className="bg-black/70 backdrop-blur px-2.5 py-1 rounded-lg border border-emerald-500/40 text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>WIRELESS FEED ONLINE</span>
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div className="bg-black/70 backdrop-blur px-2.5 py-1 rounded-lg border border-[#00c2cb]/30">
                <span>FPS: 30 | WEBRTC P2P | RES: 720p</span>
              </div>
              <div className="bg-black/70 backdrop-blur px-2.5 py-1 rounded-lg border border-[#00c2cb]/30 font-bold text-white">
                #URRT
              </div>
            </div>
          </div>
        )}

      </div>

      {/* QR Code Phone Pairing Modal */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0f18] border border-[#162338] rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
            <button
              onClick={() => setShowPairModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-[#00a8b5] to-[#00e5ff] mx-auto mb-2 shadow-[0_0_15px_rgba(0,194,203,0.4)]">
                <img src="/urrt-logo.png" alt="URRT Logo" className="w-full h-full rounded-full object-cover bg-black" />
              </div>
              <h3 className="text-lg font-bold font-tech text-white">
                WIRELESS ROVER CAMERA SETUP
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-1">
                UIU Rescue Rover Team • #URRT
              </p>
            </div>

            {/* Instant QR Code Display */}
            <div className="flex justify-center p-4 bg-white rounded-2xl border-2 border-[#00c2cb] shadow-lg shadow-[#00c2cb]/20 mx-auto w-fit">
              <QRCodeSVG 
                value={mobileUrl} 
                size={180}
                bgColor="#ffffff"
                fgColor="#06090e"
                level="M"
              />
            </div>

            <div className="mt-4 text-center">
              <span className="text-[11px] font-mono text-slate-400">CHANNEL CODE: </span>
              <span className="text-xs font-mono font-bold text-[#00c2cb] px-2 py-0.5 bg-black/60 rounded-lg border border-[#00c2cb]/30 select-all uppercase">
                {roomCode}
              </span>
            </div>

            {/* Instructions */}
            <div className="mt-4 space-y-2 text-xs text-slate-300 font-mono">
              <div className="flex items-start gap-2 bg-[#06090e] p-2.5 rounded-xl border border-[#162338]">
                <span className="w-5 h-5 rounded-full bg-[#00c2cb]/20 text-[#00c2cb] flex items-center justify-center font-bold flex-shrink-0">1</span>
                <span>Open your phone camera and <strong>scan this QR code</strong>.</span>
              </div>
              <div className="flex items-start gap-2 bg-[#06090e] p-2.5 rounded-xl border border-[#162338]">
                <span className="w-5 h-5 rounded-full bg-[#00c2cb]/20 text-[#00c2cb] flex items-center justify-center font-bold flex-shrink-0">2</span>
                <span>On your phone, tap <strong>"START BROADCASTING"</strong>.</span>
              </div>
              <div className="flex items-start gap-2 bg-[#06090e] p-2.5 rounded-xl border border-[#162338]">
                <span className="w-5 h-5 rounded-full bg-[#00c2cb]/20 text-[#00c2cb] flex items-center justify-center font-bold flex-shrink-0">3</span>
                <span>Live video instantly displays on this screen!</span>
              </div>
            </div>

            <button
              onClick={() => setShowPairModal(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-[#162338] hover:bg-slate-700 text-slate-200 font-tech font-semibold text-xs transition-colors"
            >
              CLOSE PAIRING WINDOW
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
