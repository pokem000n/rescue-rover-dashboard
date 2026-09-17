import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Video, 
  VideoOff, 
  Radio, 
  ArrowLeft, 
  FlipHorizontal,
  Wifi,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Peer } from 'peerjs';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' }
];

export default function MobileCamera() {
  const videoRef = useRef(null);
  const peerRef = useRef(null);
  const callRef = useRef(null);
  const streamRef = useRef(null);

  const [targetRoom, setTargetRoom] = useState(() => {
    return new URLSearchParams(window.location.search).get('room') || '';
  });

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [statusText, setStatusText] = useState('Ready to stream');
  const [isConnectedToDashboard, setIsConnectedToDashboard] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (callRef.current) {
      callRef.current.close();
      callRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsConnectedToDashboard(false);
    setIsBroadcasting(false);
  };

  const handleStartBroadcast = async () => {
    setErrorMessage('');
    if (!videoRef.current) return;

    if (!targetRoom) {
      setErrorMessage('Please enter or scan the Dashboard Channel ID first.');
      return;
    }

    try {
      setStatusText('Opening phone camera...');

      // 1. Get phone camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(e => console.warn('Play:', e));

      setIsBroadcasting(true);
      setStatusText('Connecting to cloud broker...');

      // 2. Connect PeerJS
      const peer = new Peer({
        config: {
          iceServers: ICE_SERVERS
        }
      });
      peerRef.current = peer;

      peer.on('open', (myId) => {
        console.log('[MobileCamera] Connected to PeerJS cloud with ID:', myId);
        setStatusText(`Calling Dashboard (${targetRoom.slice(0, 8)}...)...`);

        const call = peer.call(targetRoom, stream);
        callRef.current = call;

        setIsConnectedToDashboard(true);
        setStatusText('STREAMING LIVE TO DASHBOARD');

        call.on('close', () => {
          console.log('[MobileCamera] Call closed');
          setIsConnectedToDashboard(false);
          setStatusText('Dashboard disconnected');
        });

        call.on('error', (err) => {
          console.error('[MobileCamera] Call error:', err);
          setErrorMessage('Failed to connect to dashboard. Make sure the dashboard tab is open!');
          setIsConnectedToDashboard(false);
        });
      });

      peer.on('disconnected', () => {
        console.log('[MobileCamera] Disconnected from server, auto-reconnecting...');
        try {
          peer.reconnect();
        } catch (e) {
          console.warn('[MobileCamera] Reconnect error:', e);
        }
      });

      peer.on('error', (err) => {
        console.warn('[MobileCamera] Peer error:', err);
        if (err.type === 'disconnected' || (err.message && err.message.toLowerCase().includes('lost connection'))) {
          setStatusText('Reconnecting to server...');
          setTimeout(() => {
            try { peer.reconnect(); } catch (e) {}
          }, 1500);
          return;
        }
        if (err.type === 'peer-unavailable') {
          setErrorMessage(`Dashboard ID not found! Ensure the dashboard page is open in your computer browser.`);
        } else {
          setErrorMessage(`Network note: ${err.message || err.type}`);
        }
        setIsConnectedToDashboard(false);
      });

    } catch (err) {
      console.error('Camera start failed:', err);
      setErrorMessage(err.message || 'Camera permission denied or camera not found.');
      cleanup();
    }
  };

  const handleStopBroadcast = () => {
    cleanup();
    setStatusText('Broadcast stopped');
  };

  const handleFlipCamera = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);

    if (isBroadcasting) {
      handleStopBroadcast();
      setTimeout(() => {
        handleStartBroadcast();
      }, 400);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans select-none">
      
      {/* Mobile Top App Bar */}
      <header className="px-4 py-3 bg-[#0a0f18]/95 border-b border-[#162338] flex items-center justify-between z-20">
        <div className="flex items-center space-x-2.5">
          <a
            href="/"
            className="p-1.5 rounded-xl bg-[#162338] text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div className="flex items-center gap-2">
            <img src="/urrt-logo.png" alt="URRT Logo" className="w-8 h-8 rounded-full border border-[#00c2cb]" />
            <div>
              <h1 className="text-xs sm:text-sm font-bold font-tech tracking-wider text-white flex items-center gap-1.5">
                ROVER CAM BROADCASTER
              </h1>
              <span className="text-[10px] font-mono text-[#00c2cb]">
                UIU RESCUE ROVER TEAM • #URRT
              </span>
            </div>
          </div>
        </div>

        {/* Live status badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono border font-semibold ${
          isConnectedToDashboard
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
            : isBroadcasting
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            : 'bg-[#162338] text-slate-400 border-slate-700'
        }`}>
          <Radio className={`w-3 h-3 ${isConnectedToDashboard ? 'animate-pulse text-emerald-400' : ''}`} />
          <span>{isConnectedToDashboard ? 'ON AIR' : isBroadcasting ? 'CONNECTING' : 'READY'}</span>
        </div>
      </header>

      {/* Viewport Container */}
      <main className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        
        {/* Local Camera Viewfinder */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isBroadcasting ? 'block' : 'hidden'}`}
        />

        {/* Standby View */}
        {!isBroadcasting && (
          <div className="text-center p-6 max-w-sm w-full">
            <div className="relative mx-auto w-24 h-24 mb-4">
              <div className="w-full h-full rounded-full p-0.5 bg-gradient-to-tr from-[#00a8b5] to-[#00e5ff] shadow-[0_0_25px_rgba(0,194,203,0.45)]">
                <img src="/urrt-logo.png" alt="URRT Logo" className="w-full h-full rounded-full object-cover bg-black" />
              </div>
            </div>
            
            <h2 className="text-lg font-bold font-tech tracking-wide text-white mb-1">
              UIU RESCUE ROVER CAMERA
            </h2>
            <p className="text-xs text-slate-400 font-mono mb-4 leading-relaxed">
              Stream live video from this phone directly to the UIU Rescue Rover (#URRT) mission control dashboard.
            </p>

            {/* Room Code input */}
            <div className="mb-5 bg-[#0a0f18] p-3 rounded-xl border border-[#162338] text-left">
              <label className="text-[10px] font-mono text-slate-400 block mb-1">
                DASHBOARD CHANNEL ID:
              </label>
              <input
                type="text"
                value={targetRoom}
                onChange={(e) => setTargetRoom(e.target.value.trim())}
                placeholder="Scanned from QR code"
                className="bg-[#06090e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#00c2cb] w-full focus:outline-none focus:border-[#00c2cb]"
              />
            </div>

            <button
              onClick={handleStartBroadcast}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#00a8b5] to-[#00c2cb] hover:from-[#00c2cb] hover:to-[#00e5ff] text-black font-extrabold font-tech tracking-wider text-base shadow-xl shadow-[#00c2cb]/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Video className="w-5 h-5" />
              <span>START BROADCASTING</span>
            </button>
          </div>
        )}

        {/* Tactical HUD Overlay when broadcasting */}
        {isBroadcasting && (
          <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between text-xs font-mono">
            <div className="flex justify-between items-start">
              <div className="bg-black/70 backdrop-blur px-2.5 py-1 rounded-lg border border-[#00c2cb]/30 text-[#00c2cb]">
                LENS: {facingMode === 'environment' ? 'REAR WIDE' : 'FRONT'}
              </div>
              <div className={`backdrop-blur px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 ${
                isConnectedToDashboard ? 'bg-rose-600/90 text-white animate-pulse' : 'bg-amber-500/80 text-black'
              }`}>
                <Radio className="w-3.5 h-3.5" />
                <span>{isConnectedToDashboard ? 'LIVE ON AIR • #URRT' : 'CALLING...'}</span>
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div className="bg-black/70 backdrop-blur px-2.5 py-1 rounded-lg border border-white/20 text-slate-200">
                {statusText}
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="absolute bottom-24 left-4 right-4 bg-rose-950/90 border border-rose-500 text-rose-200 text-xs font-mono p-3 rounded-xl shadow-xl text-center">
            {errorMessage}
          </div>
        )}

      </main>

      {/* Mobile Bottom Action Bar */}
      {isBroadcasting && (
        <footer className="p-4 bg-[#0a0f18]/95 border-t border-[#162338] flex items-center justify-around z-20">
          <button
            onClick={handleFlipCamera}
            className="p-3.5 rounded-2xl bg-[#162338] text-[#00c2cb] border border-slate-700 active:scale-90 transition-transform"
            title="Switch front/back camera"
          >
            <FlipHorizontal className="w-6 h-6" />
          </button>

          <button
            onClick={handleStopBroadcast}
            className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-tech font-bold tracking-wider text-sm flex items-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
          >
            <VideoOff className="w-5 h-5" />
            <span>STOP BROADCAST</span>
          </button>
        </footer>
      )}

    </div>
  );
}
