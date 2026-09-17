import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Video, 
  VideoOff, 
  Radio, 
  ArrowLeft, 
  FlipHorizontal,
  Wifi,
  WifiOff,
  Link2
} from 'lucide-react';
import { Peer } from 'peerjs';
import { WebRTCBroadcaster } from '../services/webrtc';
import { wsClient } from '../services/websocket';

export default function MobileCamera() {
  const videoRef = useRef(null);
  const broadcasterRef = useRef(null);
  const peerRef = useRef(null);
  const callRef = useRef(null);
  const streamRef = useRef(null);

  const [targetRoom, setTargetRoom] = useState(() => {
    return new URLSearchParams(window.location.search).get('room') || '';
  });

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [broadcasterState, setBroadcasterState] = useState('idle');
  const [wsState, setWsState] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [peerConnected, setPeerConnected] = useState(false);

  useEffect(() => {
    // Attempt local WebSocket connection if available
    wsClient.connect();
    const unsubWs = wsClient.onStatusChange((status) => {
      setWsState(status);
      if (status === 'connected') {
        wsClient.send({
          type: 'register',
          role: 'camera_broadcaster'
        });
      }
    });

    return () => {
      unsubWs();
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
    if (broadcasterRef.current) {
      broadcasterRef.current.stop();
      broadcasterRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setPeerConnected(false);
  };

  const handleStartBroadcast = async () => {
    setErrorMessage('');
    if (!videoRef.current) return;

    try {
      setBroadcasterState('requesting_camera');

      // 1. Access phone camera
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

      // 2. Connect via PeerJS (Direct P2P WebRTC - Works on Vercel without backend!)
      if (targetRoom) {
        console.log('[MobileCamera] Connecting to PeerJS Cloud for Room:', targetRoom);
        const peer = new Peer();
        peerRef.current = peer;

        peer.on('open', (id) => {
          console.log('[MobileCamera] Peer open with client ID:', id);
          console.log('[MobileCamera] Calling dashboard room:', targetRoom);
          const call = peer.call(targetRoom, stream);
          callRef.current = call;

          setPeerConnected(true);
          setBroadcasterState('broadcasting');

          call.on('close', () => {
            console.log('[MobileCamera] Call closed');
            setPeerConnected(false);
          });

          call.on('error', (err) => {
            console.warn('[MobileCamera] Call error:', err);
          });
        });

        peer.on('error', (err) => {
          console.warn('[MobileCamera] Peer error:', err);
          // If room doesn't match or network issue
          if (err.type === 'peer-unavailable') {
            setErrorMessage(`Room "${targetRoom}" not found on dashboard. Make sure the dashboard tab is open!`);
          }
        });
      }

      // 3. Also dispatch via local WebSocket if connected
      if (wsState === 'connected') {
        broadcasterRef.current = new WebRTCBroadcaster(videoRef.current, (state) => {
          console.log('[MobileCamera] WS WebRTC state:', state);
        });
        await broadcasterRef.current.startCamera(facingMode);
      }

      setIsBroadcasting(true);
    } catch (err) {
      console.error('Camera start failed:', err);
      setErrorMessage(err.message || 'Camera permission denied or camera not found.');
      setIsBroadcasting(false);
      setBroadcasterState('idle');
    }
  };

  const handleStopBroadcast = () => {
    cleanup();
    setIsBroadcasting(false);
    setBroadcasterState('idle');
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
      <header className="px-4 py-3 bg-rover-panel/90 border-b border-rover-border flex items-center justify-between z-20">
        <div className="flex items-center space-x-2">
          <a
            href="/"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="text-sm font-bold font-tech tracking-wider text-slate-100 flex items-center gap-1.5">
              ROVER CAM BROADCASTER
            </h1>
            <span className="text-[10px] font-mono text-slate-400">
              {targetRoom ? `LINKED TO CHANNEL: ${targetRoom}` : 'DIRECT WIRELESS STREAM'}
            </span>
          </div>
        </div>

        {/* Connection status indicator */}
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono border ${
          peerConnected || wsState === 'connected'
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
        }`}>
          <Wifi className="w-3 h-3" />
          <span>{peerConnected ? 'STREAMING' : 'READY'}</span>
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
            <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mx-auto flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/10">
              <Camera className="w-10 h-10 animate-pulse" />
            </div>
            
            <h2 className="text-lg font-bold font-tech tracking-wide text-white mb-1">
              WIRELESS ROVER CAMERA
            </h2>
            <p className="text-xs text-slate-400 font-mono mb-4 leading-relaxed">
              Stream live video from this phone directly to the UIU Rescue Rover mission control dashboard.
            </p>

            {/* Room Code field if not pre-filled */}
            <div className="mb-5 bg-rover-panel/80 p-3 rounded-xl border border-rover-border text-left">
              <label className="text-[10px] font-mono text-slate-400 block mb-1">
                DASHBOARD CHANNEL CODE:
              </label>
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <input
                  type="text"
                  value={targetRoom}
                  onChange={(e) => setTargetRoom(e.target.value.trim().toLowerCase())}
                  placeholder="e.g. rvr-abcde"
                  className="bg-rover-dark border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-300 w-full focus:outline-none focus:border-cyan-400 uppercase"
                />
              </div>
            </div>

            <button
              onClick={handleStartBroadcast}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-extrabold font-tech tracking-wider text-base shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
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
              <div className="bg-black/60 backdrop-blur px-2.5 py-1 rounded border border-cyan-500/30 text-cyan-300">
                LENS: {facingMode === 'environment' ? 'REAR WIDE' : 'FRONT'}
              </div>
              <div className="bg-rose-500/80 backdrop-blur px-2.5 py-1 rounded text-white font-bold flex items-center gap-1.5 animate-pulse">
                <Radio className="w-3.5 h-3.5" />
                <span>ON AIR</span>
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div className="bg-black/60 backdrop-blur px-2.5 py-1 rounded border border-white/20 text-slate-300">
                CHANNEL: {targetRoom || 'DIRECT'}
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
        <footer className="p-4 bg-rover-panel/90 border-t border-rover-border flex items-center justify-around z-20">
          <button
            onClick={handleFlipCamera}
            className="p-3.5 rounded-2xl bg-slate-800 text-cyan-400 border border-slate-700 active:scale-90 transition-transform"
            title="Switch between front and back camera"
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
