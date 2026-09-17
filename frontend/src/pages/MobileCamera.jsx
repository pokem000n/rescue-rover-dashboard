import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Video, 
  VideoOff, 
  RefreshCw, 
  Radio, 
  ShieldCheck, 
  ArrowLeft, 
  FlipHorizontal,
  Wifi,
  WifiOff
} from 'lucide-react';
import { WebRTCBroadcaster } from '../services/webrtc';
import { wsClient } from '../services/websocket';

export default function MobileCamera() {
  const videoRef = useRef(null);
  const broadcasterRef = useRef(null);

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [broadcasterState, setBroadcasterState] = useState('idle');
  const [wsState, setWsState] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Connect WebSocket
    wsClient.connect();
    const unsubWs = wsClient.onStatusChange((status) => {
      setWsState(status);
      if (status === 'connected') {
        // Register role as camera broadcaster
        wsClient.send({
          type: 'register',
          role: 'camera_broadcaster'
        });
      }
    });

    return () => {
      unsubWs();
      if (broadcasterRef.current) {
        broadcasterRef.current.stop();
      }
    };
  }, []);

  const handleStartBroadcast = async () => {
    setErrorMessage('');
    if (!videoRef.current) return;

    try {
      if (!broadcasterRef.current) {
        broadcasterRef.current = new WebRTCBroadcaster(videoRef.current, (state, err) => {
          setBroadcasterState(state);
          if (err) setErrorMessage(err);
        });
      }

      await broadcasterRef.current.startCamera(facingMode);
      setIsBroadcasting(true);
    } catch (err) {
      console.error('Camera start failed:', err);
      setErrorMessage(err.message || 'Camera permission denied or camera not found.');
      setIsBroadcasting(false);
    }
  };

  const handleStopBroadcast = () => {
    if (broadcasterRef.current) {
      broadcasterRef.current.stop();
    }
    setIsBroadcasting(false);
    setBroadcasterState('idle');
  };

  const handleFlipCamera = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);

    if (isBroadcasting && broadcasterRef.current) {
      broadcasterRef.current.stop();
      setTimeout(async () => {
        try {
          await broadcasterRef.current.startCamera(nextMode);
        } catch (err) {
          setErrorMessage('Could not switch camera.');
        }
      }, 300);
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
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                NODE
              </span>
            </h1>
            <span className="text-[10px] font-mono text-slate-400">
              UIU RESCUE ROVER WIRELESS LINK
            </span>
          </div>
        </div>

        {/* WebSocket indicator */}
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono border ${
          wsState === 'connected' 
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
        }`}>
          {wsState === 'connected' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span>{wsState === 'connected' ? 'LINK UP' : 'OFFLINE'}</span>
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
          <div className="text-center p-6 max-w-sm">
            <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mx-auto flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/10">
              <Camera className="w-10 h-10 animate-pulse" />
            </div>
            
            <h2 className="text-lg font-bold font-tech tracking-wide text-white mb-2">
              WIRELESS ROVER CAMERA
            </h2>
            <p className="text-xs text-slate-400 font-mono mb-6 leading-relaxed">
              This mobile device will stream its camera feed directly to the mission control dashboard via WebRTC.
            </p>

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
                STATE: {broadcasterState.toUpperCase()}
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
