import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Maximize2, 
  Minimize2, 
  Smartphone, 
  QrCode, 
  RefreshCw, 
  X, 
  ShieldAlert, 
  Tv, 
  CheckCircle2,
  Video,
  VideoOff
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { WebRTCViewer } from '../services/webrtc';
import { wsClient } from '../services/websocket';

export default function CameraFeed({ isDemoMode }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  const [streamStatus, setStreamStatus] = useState('waiting'); // 'waiting' | 'negotiating' | 'connected' | 'demo'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);
  const [mobileUrl, setMobileUrl] = useState('');
  const [cameraActiveOnServer, setCameraActiveOnServer] = useState(false);

  useEffect(() => {
    // Generate pairing URL for smartphone
    const hostname = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    setMobileUrl(`${window.location.protocol}//${hostname}${port}/camera`);

    // Initialize WebRTC viewer
    if (videoRef.current) {
      viewerRef.current = new WebRTCViewer(videoRef.current, (status) => {
        console.log('[CameraFeed] WebRTC status:', status);
        setStreamStatus(status);
      });
      viewerRef.current.init();
    }

    // Listen for backend camera status events
    const unsubStatus = wsClient.on('camera_status', (msg) => {
      setCameraActiveOnServer(Boolean(msg.active));
      if (!msg.active) {
        setStreamStatus('waiting');
      }
    });

    const unsubInitial = wsClient.on('initial_state', (msg) => {
      if (msg.cameraActive) {
        setCameraActiveOnServer(true);
      }
    });

    return () => {
      unsubStatus();
      unsubInitial();
      if (viewerRef.current) {
        viewerRef.current.destroy();
      }
    };
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.warn('Error attempting fullscreen:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
      setIsFullscreen(false);
    }
  };

  const handleResetConnection = () => {
    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current.init();
      setStreamStatus('waiting');
    }
  };

  const isLive = streamStatus === 'connected';

  return (
    <div 
      ref={containerRef}
      className={`relative rounded-2xl bg-rover-card border border-rover-border overflow-hidden shadow-2xl flex flex-col transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-black' : 'h-full min-h-[380px] lg:min-h-[440px]'
      }`}
    >
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-rover-panel/90 border-b border-rover-border z-10">
        <div className="flex items-center space-x-2.5">
          <div className={`p-1.5 rounded-lg border ${
            isLive 
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-tech tracking-wider text-slate-100 flex items-center gap-2 uppercase">
              LIVE ROVER CAMERA
              {isLive ? (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 animate-pulse">
                  ● REC / LIVE
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
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
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 transition-colors"
            title="Scan QR Code to stream from smartphone"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PAIR PHONE</span>
          </button>

          <button
            onClick={handleResetConnection}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Reconnect WebRTC stream"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
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
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#0e1424] to-[#080c14]">
            
            {/* Tactical Crosshair / HUD Overlay */}
            <div className="absolute inset-4 border border-cyan-500/20 pointer-events-none rounded-xl">
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-dashed border-cyan-500/30 rounded-full" />
            </div>

            <div className="relative z-10 max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mx-auto flex items-center justify-center mb-3 shadow-inner">
                <Smartphone className="w-7 h-7 animate-bounce" />
              </div>

              <h3 className="text-base font-bold font-tech text-slate-200 tracking-wider mb-1">
                {isDemoMode ? 'TEST VIDEO / CAMERA STANDBY' : 'NO WIRELESS CAMERA CONNECTED'}
              </h3>
              
              <p className="text-xs text-slate-400 font-mono mb-4 leading-relaxed">
                Connect your smartphone over Wi-Fi to use it as the rover's wireless inspection camera.
              </p>

              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setShowPairModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-xs font-tech tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
                >
                  <QrCode className="w-4 h-4" />
                  <span>PAIR PHONE CAMERA</span>
                </button>

                <a
                  href="/camera"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-rover-card hover:bg-rover-border border border-rover-border text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
                >
                  <span>TEST IN NEW TAB</span>
                </a>
              </div>
            </div>

          </div>
        )}

        {/* HUD Telemetry Overlay on Live Stream */}
        {isLive && (
          <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between text-[11px] font-mono text-cyan-400/80">
            <div className="flex justify-between items-start">
              <div className="bg-black/60 backdrop-blur px-2.5 py-1 rounded border border-cyan-500/30">
                <span>FPS: 30 | PROTOCOL: WebRTC | RES: 720p</span>
              </div>
              <div className="bg-black/60 backdrop-blur px-2.5 py-1 rounded border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>WIRELESS LINK STABLE</span>
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div className="bg-black/60 backdrop-blur px-2.5 py-1 rounded border border-cyan-500/30">
                <span>LATENCY: &lt;50ms | CODEC: H.264 / VP8</span>
              </div>
              <div className="bg-black/60 backdrop-blur px-2.5 py-1 rounded border border-cyan-500/30">
                <span>UIU ROVER CAM 01</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* QR Code Phone Pairing Modal */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-rover-panel border border-rover-border rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
            <button
              onClick={() => setShowPairModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mx-auto flex items-center justify-center mb-2">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-tech text-white">
                WIRELESS MOBILE CAMERA SETUP
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Follow these 3 simple steps to stream from your phone:
              </p>
            </div>

            {/* QR Code Display */}
            <div className="flex justify-center p-4 bg-white rounded-2xl border-2 border-cyan-400 shadow-lg mx-auto w-fit">
              <QRCodeSVG 
                value={mobileUrl} 
                size={180}
                bgColor="#ffffff"
                fgColor="#0a0d14"
                level="M"
              />
            </div>

            {/* Instructions */}
            <div className="mt-5 space-y-2.5 text-xs text-slate-300 font-mono">
              <div className="flex items-start gap-2 bg-rover-dark p-2.5 rounded-lg border border-rover-border">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold flex-shrink-0">1</span>
                <span>Connect your smartphone to the <strong>same Wi-Fi network</strong> as this computer.</span>
              </div>
              <div className="flex items-start gap-2 bg-rover-dark p-2.5 rounded-lg border border-rover-border">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold flex-shrink-0">2</span>
                <span>Scan the QR code with your phone camera or visit:</span>
              </div>
              <div className="bg-black/60 p-2 rounded border border-slate-700 select-all break-all text-center text-cyan-400 font-mono text-[11px]">
                {mobileUrl}
              </div>
              <div className="flex items-start gap-2 bg-rover-dark p-2.5 rounded-lg border border-rover-border">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold flex-shrink-0">3</span>
                <span>Tap <strong>"START BROADCASTING"</strong> on your phone. Video will appear here in real-time!</span>
              </div>
            </div>

            <button
              onClick={() => setShowPairModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-rover-border hover:bg-slate-700 text-slate-200 font-tech font-semibold text-xs transition-colors"
            >
              CLOSE PAIRING WINDOW
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
