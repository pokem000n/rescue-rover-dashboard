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
  Camera as CameraIcon, 
  Images, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  ZoomIn, 
  Eye, 
  FlipHorizontal, 
  Crosshair, 
  Grid, 
  PictureInPicture2, 
  ArrowUpRight,
  Columns,
  Layers,
  ChevronRight,
  Sparkles,
  Copy
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Peer } from 'peerjs';
import { soundManager } from '../utils/soundEffects';
// QR and object detection libraries (installed via npm)
import jsQR from 'jsqr';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' }
];

const CAM_SLOTS = [
  { id: 'cam1', label: 'CAM 01 (DRIVE)', role: 'Drive / Front Chassis', subId: 'cam1' },
  { id: 'cam2', label: 'CAM 02 (ARM)', role: 'Arm / Rubble Inspection', subId: 'cam2' },
  { id: 'cam3', label: 'CAM 03 (REAR)', role: 'Rear / Panoramic', subId: 'cam3' }
];

// ─── Color Name Classifier (from RGB) ───
function getColorName(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = (max + min) / 2;
  const sat = max === min ? 0 : (max - min) / (lum > 127 ? (510 - max - min) : (max + min));

  if (lum < 30) return 'Black';
  if (lum > 225 && sat < 0.15) return 'White';
  if (sat < 0.12) {
    if (lum < 80) return 'Dark Gray';
    if (lum < 170) return 'Gray';
    return 'Light Gray';
  }

  // Compute hue
  let hue = 0;
  const d = max - min;
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) hue = ((b - r) / d + 2) * 60;
  else hue = ((r - g) / d + 4) * 60;

  if (hue < 15 || hue >= 345) return 'Red';
  if (hue < 40) return 'Orange';
  if (hue < 70) return 'Yellow';
  if (hue < 155) return 'Green';
  if (hue < 195) return 'Cyan';
  if (hue < 260) return 'Blue';
  if (hue < 290) return 'Purple';
  if (hue < 345) return 'Pink';
  return 'Red';
}

// ─── Shape Detector (edge & aspect-ratio based) ───
function detectShape(aspect, bw, bh, imageData, sx, sy, ex, ey, imgW) {
  // Calculate how circular vs rectangular the object is
  // by sampling edges within the bounding box
  const cx = (sx + ex) / 2;
  const cy = (sy + ey) / 2;
  const rx = (ex - sx) / 2;
  const ry = (ey - sy) / 2;

  if (rx < 5 || ry < 5) return 'Point';

  // Sample pixels on the border of the bounding box to detect circularity
  let edgePixels = 0;
  let circlePixels = 0;
  const steps = 36;

  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const px = Math.round(cx + rx * 0.9 * Math.cos(angle));
    const py = Math.round(cy + ry * 0.9 * Math.sin(angle));
    if (px >= 0 && px < imgW && py >= 0) {
      const idx = (py * imgW + px) * 4;
      const brightness = imageData.data[idx] * 0.299 + imageData.data[idx + 1] * 0.587 + imageData.data[idx + 2] * 0.114;
      if (brightness > 30) circlePixels++;
      edgePixels++;
    }
  }

  const circularity = edgePixels > 0 ? circlePixels / edgePixels : 0;
  const squareness = Math.min(aspect, 1 / aspect); // 1.0 = perfect square

  if (squareness > 0.85 && circularity > 0.7) return 'Circle';
  if (squareness > 0.85 && circularity > 0.5) return 'Square';
  if (aspect > 1.5) return 'Horizontal Rectangle';
  if (aspect < 0.65) return 'Vertical Rectangle';
  if (squareness > 0.7) return 'Rectangle';
  if (aspect > 2.5 || aspect < 0.4) return 'Elongated';
  return 'Rectangle';
}

export default function CameraFeed({ 
  isDemoMode,
  temperature = null,
  humidity = null,
  triggerSnapshot = 0,
  onSnapshotsCountChange = () => {},
  theme = 'dark'
}) {
  const containerRef = useRef(null);
  const video1Ref = useRef(null);
  const video2Ref = useRef(null);
  const video3Ref = useRef(null);
  const miniVideo1Ref = useRef(null);
  const miniVideo2Ref = useRef(null);

  // Multi-Camera Streams Ref & Statuses
  const streamsRef = useRef({ cam1: null, cam2: null, cam3: null });
  const [camStatus, setCamStatus] = useState({ cam1: 'waiting', cam2: 'waiting', cam3: 'waiting' });
  const [activeSlot, setActiveSlot] = useState('cam1'); // 'cam1' | 'cam2' | 'cam3' | 'split'

  // Room code generator
  const [roomCode] = useState(() => {
    const existing = sessionStorage.getItem('rover_channel_id');
    if (existing) return existing;
    const newId = 'urrt-' + Math.random().toString(36).substring(2, 7);
    sessionStorage.setItem('rover_channel_id', newId);
    return newId;
  });

  // Floating Mini-HUD States
  const [isScrolledOut, setIsScrolledOut] = useState(false);
  const [isFloatingDismissed, setIsFloatingDismissed] = useState(false);
  const [floatingSize, setFloatingSize] = useState('large'); // 'normal' (360px) | 'large' (480px) | 'xlarge' (620px)

  // Tactical Camera Enhancements
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isNightVision, setIsNightVision] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [overlayMode, setOverlayMode] = useState('reticle'); // 'reticle' | 'grid' | 'none'

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairModalTab, setPairModalTab] = useState('cam1'); // 'cam1' | 'cam2' | 'cam3'
  const [copiedPairUrl, setCopiedPairUrl] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [snapshots, setSnapshots] = useState([]);

  // ─── AI Vision: QR Detection, Object Detection, Motion Detection ───
  const detectionCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const prevFrameRef = useRef(null);
  const cocoModelRef = useRef(null);
  const detectionLoopRef = useRef(null);

  const [qrEnabled, setQrEnabled] = useState(true);
  const [objectDetectEnabled, setObjectDetectEnabled] = useState(false);
  const [motionDetectEnabled, setMotionDetectEnabled] = useState(true);

  const [qrResult, setQrResult] = useState(null); // { data: string, isUrl: boolean }
  const [qrHistory, setQrHistory] = useState([]); // array of past QR results
  const [detectedObjects, setDetectedObjects] = useState([]); // [{ class, score, bbox }]
  const [motionLevel, setMotionLevel] = useState(0); // 0-100 percentage
  const [motionAlert, setMotionAlert] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [copiedQr, setCopiedQr] = useState(false);

  // Setup Peer Listeners for all 3 camera slots
  useEffect(() => {
    const peers = [];

    const setupSlot = (slotId, peerId) => {
      try {
        const peer = new Peer(peerId, { config: { iceServers: ICE_SERVERS } });
        peers.push(peer);

        peer.on('call', (call) => {
          console.log(`[CameraFeed] Call incoming on ${slotId}`);
          setCamStatus(s => ({ ...s, [slotId]: 'connecting' }));
          call.answer();

          call.on('stream', (remoteStream) => {
            console.log(`[CameraFeed] Stream received on ${slotId}:`, remoteStream);
            streamsRef.current[slotId] = remoteStream;
            setCamStatus(s => ({ ...s, [slotId]: 'connected' }));
            soundManager.playChirp();

            const bindTo = (ref) => {
              if (ref.current) {
                ref.current.srcObject = remoteStream;
                ref.current.muted = true;
                ref.current.play().catch(() => {});
              }
            };

            if (slotId === 'cam1') { bindTo(video1Ref); bindTo(miniVideo1Ref); }
            if (slotId === 'cam2') { bindTo(video2Ref); bindTo(miniVideo2Ref); }
            if (slotId === 'cam3') { bindTo(video3Ref); }
          });

          call.on('close', () => {
            streamsRef.current[slotId] = null;
            setCamStatus(s => ({ ...s, [slotId]: 'waiting' }));
          });

          call.on('error', () => {
            setCamStatus(s => ({ ...s, [slotId]: 'waiting' }));
          });
        });

        peer.on('disconnected', () => {
          try { peer.reconnect(); } catch (e) {}
        });

        peer.on('error', (err) => {
          if (err.type === 'disconnected' || (err.message && err.message.toLowerCase().includes('lost connection'))) {
            setTimeout(() => { try { peer.reconnect(); } catch (e) {} }, 1500);
          }
        });
      } catch (err) {
        console.error(`[CameraFeed] Peer init error for ${slotId}:`, err);
      }
    };

    // CAM 1 listens on both `${roomCode}-cam1` and legacy `${roomCode}`
    setupSlot('cam1', `${roomCode}-cam1`);
    setupSlot('cam1', roomCode);
    setupSlot('cam2', `${roomCode}-cam2`);
    setupSlot('cam3', `${roomCode}-cam3`);

    return () => {
      peers.forEach(p => { try { p.destroy(); } catch (e) {} });
    };
  }, [roomCode]);

  // Scroll detection via IntersectionObserver to auto-dock mini-HUD
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const away = !entry.isIntersecting || entry.intersectionRatio < 0.2;
        setIsScrolledOut(away);
        if (!away) {
          setIsFloatingDismissed(false);
        }
      },
      { threshold: [0, 0.2, 0.5] }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Re-bind mini video streams when mini HUD appears
  useEffect(() => {
    if (isScrolledOut && !isFloatingDismissed) {
      if (miniVideo1Ref.current && streamsRef.current.cam1) {
        miniVideo1Ref.current.srcObject = streamsRef.current.cam1;
        miniVideo1Ref.current.muted = true;
        miniVideo1Ref.current.play().catch(() => {});
      }
      if (miniVideo2Ref.current && streamsRef.current.cam2) {
        miniVideo2Ref.current.srcObject = streamsRef.current.cam2;
        miniVideo2Ref.current.muted = true;
        miniVideo2Ref.current.play().catch(() => {});
      }
    }
  }, [isScrolledOut, isFloatingDismissed, activeSlot]);

  // Keyboard shortcut trigger
  useEffect(() => {
    if (triggerSnapshot > 0) {
      handleCaptureSnapshot();
    }
  }, [triggerSnapshot]);

  // ─── Load COCO-SSD model lazily when object detection is enabled ───
  useEffect(() => {
    if (!objectDetectEnabled) return;
    if (cocoModelRef.current) return;
    let cancelled = false;
    setModelLoading(true);
    cocoSsd.load({ base: 'lite_mobilenet_v2' }).then((model) => {
      if (!cancelled) {
        cocoModelRef.current = model;
        setModelLoading(false);
        console.log('[AI Vision] COCO-SSD model loaded');
      }
    }).catch((err) => {
      console.error('[AI Vision] Model load error:', err);
      if (!cancelled) setModelLoading(false);
    });
    return () => { cancelled = true; };
  }, [objectDetectEnabled]);

  // ─── Main Detection Loop: QR + Object Detection + Motion Detection ───
  useEffect(() => {
    const anyEnabled = qrEnabled || objectDetectEnabled || motionDetectEnabled;
    if (!anyEnabled) {
      if (detectionLoopRef.current) {
        clearInterval(detectionLoopRef.current);
        detectionLoopRef.current = null;
      }
      return;
    }

    const getActiveVideo = () => {
      if (activeSlot === 'cam1') return video1Ref.current;
      if (activeSlot === 'cam2') return video2Ref.current;
      if (activeSlot === 'cam3') return video3Ref.current;
      return video1Ref.current; // fallback for split
    };

    const isUrlString = (str) => {
      try { new URL(str); return true; } catch { return false; }
    };

    const runDetection = async () => {
      const video = getActiveVideo();
      if (!video || !video.videoWidth || video.paused || video.ended) return;

      const w = video.videoWidth;
      const h = video.videoHeight;

      // Get or create hidden canvas for frame capture
      let canvas = detectionCanvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        detectionCanvasRef.current = canvas;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);

      // ── QR Code Detection ──
      if (qrEnabled) {
        try {
          const qr = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });
          if (qr && qr.data) {
            const newResult = { data: qr.data, isUrl: isUrlString(qr.data), timestamp: Date.now() };
            setQrResult(prev => {
              if (prev && prev.data === qr.data) return prev;
              // New QR found — add to history
              setQrHistory(hist => {
                if (hist.length > 0 && hist[0].data === qr.data) return hist;
                soundManager.playChirp();
                return [newResult, ...hist].slice(0, 20);
              });
              return newResult;
            });
          }
        } catch (e) { /* jsQR can throw on bad frames */ }
      }

      // ── Object Detection ──
      if (objectDetectEnabled && cocoModelRef.current) {
        try {
          const predictions = await cocoModelRef.current.detect(video, 10, 0.4);
          const processedObjects = predictions.map(p => {
            const [bx, by, bw, bh] = p.bbox;
            // ── Dominant Color Analysis ──
            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            const sx = Math.max(0, Math.floor(bx));
            const sy = Math.max(0, Math.floor(by));
            const ex = Math.min(w, Math.floor(bx + bw));
            const ey = Math.min(h, Math.floor(by + bh));
            // Sample every 4th pixel for speed
            for (let py = sy; py < ey; py += 4) {
              for (let px = sx; px < ex; px += 4) {
                const idx = (py * w + px) * 4;
                rSum += imageData.data[idx];
                gSum += imageData.data[idx + 1];
                bSum += imageData.data[idx + 2];
                count++;
              }
            }
            const avgR = count ? Math.round(rSum / count) : 0;
            const avgG = count ? Math.round(gSum / count) : 0;
            const avgB = count ? Math.round(bSum / count) : 0;
            const dominantHex = `#${avgR.toString(16).padStart(2,'0')}${avgG.toString(16).padStart(2,'0')}${avgB.toString(16).padStart(2,'0')}`;
            const colorName = getColorName(avgR, avgG, avgB);

            // ── Shape Analysis (aspect ratio based) ──
            const aspect = bw / (bh || 1);
            const area = bw * bh;
            const shapeName = detectShape(aspect, bw, bh, imageData, sx, sy, ex, ey, w);

            return {
              class: p.class,
              score: Math.round(p.score * 100),
              bbox: p.bbox,
              color: { hex: dominantHex, name: colorName, r: avgR, g: avgG, b: avgB },
              shape: shapeName
            };
          });
          setDetectedObjects(processedObjects);
          if (processedObjects.length > 0) {
            try {
              onVisionDetected({
                color: processedObjects[0].color?.name || null,
                colorHex: processedObjects[0].color?.hex || null,
                shape: processedObjects[0].shape || null,
                objectClass: processedObjects[0].class,
                timestamp: Date.now()
              });
            } catch (e) {}
          }
        } catch (e) { /* ignore detection errors */ }
      }

      // ── Motion Detection (frame difference) ──
      if (motionDetectEnabled) {
        const currentGray = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) {
          const idx = i * 4;
          currentGray[i] = Math.round(imageData.data[idx] * 0.299 + imageData.data[idx + 1] * 0.587 + imageData.data[idx + 2] * 0.114);
        }

        if (prevFrameRef.current && prevFrameRef.current.length === currentGray.length) {
          let diffCount = 0;
          const threshold = 30; // pixel change threshold
          for (let i = 0; i < currentGray.length; i++) {
            if (Math.abs(currentGray[i] - prevFrameRef.current[i]) > threshold) {
              diffCount++;
            }
          }
          const motionPct = Math.min(100, Math.round((diffCount / currentGray.length) * 100 * 5)); // scale up
          setMotionLevel(motionPct);
          setMotionAlert(motionPct > 25);
        }

        prevFrameRef.current = currentGray;
      }
    };

    // Run every 500ms for QR/motion, 800ms if object detection is on (heavier)
    const interval = objectDetectEnabled ? 800 : 500;
    detectionLoopRef.current = setInterval(runDetection, interval);

    return () => {
      if (detectionLoopRef.current) {
        clearInterval(detectionLoopRef.current);
        detectionLoopRef.current = null;
      }
    };
  }, [qrEnabled, objectDetectEnabled, motionDetectEnabled, activeSlot]);

  // ─── Draw bounding boxes on overlay canvas ───
  useEffect(() => {
    if (!objectDetectEnabled || detectedObjects.length === 0) return;
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    
    const video = activeSlot === 'cam2' ? video2Ref.current : activeSlot === 'cam3' ? video3Ref.current : video1Ref.current;
    if (!video || !video.videoWidth) return;

    const rect = video.getBoundingClientRect();
    overlay.width = rect.width;
    overlay.height = rect.height;
    const scaleX = rect.width / video.videoWidth;
    const scaleY = rect.height / video.videoHeight;
    
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const colors = ['#00c2cb', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#f97316'];

    detectedObjects.forEach((obj, i) => {
      const [x, y, w, h] = obj.bbox;
      const sx = x * scaleX;
      const sy = y * scaleY;
      const sw = w * scaleX;
      const sh = h * scaleY;
      const color = obj.color ? obj.color.hex : colors[i % colors.length];
      const borderColor = colors[i % colors.length];

      // Bounding box with corner brackets style
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sw, sh);

      // Top label: class + score
      const label = `${obj.class} ${obj.score}%`;
      ctx.font = 'bold 11px monospace';
      const textW = ctx.measureText(label).width + 8;
      ctx.fillStyle = borderColor;
      ctx.fillRect(sx, sy - 18, textW, 18);
      ctx.fillStyle = '#000';
      ctx.fillText(label, sx + 4, sy - 5);

      // Bottom label: color + shape
      if (obj.color || obj.shape) {
        const infoLabel = `${obj.color ? obj.color.name : '?'} · ${obj.shape || '?'}`;
        ctx.font = 'bold 10px monospace';
        const infoW = ctx.measureText(infoLabel).width + 24;
        
        // Color swatch + info background
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(sx, sy + sh + 2, infoW, 16);
        
        // Tiny color swatch circle
        if (obj.color) {
          ctx.beginPath();
          ctx.arc(sx + 8, sy + sh + 10, 4, 0, Math.PI * 2);
          ctx.fillStyle = obj.color.hex;
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        
        ctx.fillStyle = '#fff';
        ctx.fillText(infoLabel, sx + 16, sy + sh + 14);
      }
    });
  }, [detectedObjects, objectDetectEnabled, activeSlot]);

  const handleCaptureSnapshot = () => {
    soundManager.playShutter();

    // Select active video element
    let activeVideo = video1Ref.current;
    let camTag = 'CAM 01 (DRIVE)';
    if (activeSlot === 'cam2') { activeVideo = video2Ref.current; camTag = 'CAM 02 (ARM)'; }
    else if (activeSlot === 'cam3') { activeVideo = video3Ref.current; camTag = 'CAM 03 (REAR)'; }

    const isSlotLive = activeVideo && activeVideo.srcObject;
    const canvas = document.createElement('canvas');
    const w = activeVideo?.videoWidth || 1280;
    const h = activeVideo?.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    if (isFlipped) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    if (isSlotLive) {
      ctx.drawImage(activeVideo, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#0a0f18';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#00c2cb';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`UIU RESCUE ROVER - ${camTag}`, w / 2, h / 2);
      ctx.textAlign = 'left';
    }

    if (isFlipped) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Tactical Watermark Bar
    ctx.fillStyle = 'rgba(6, 9, 14, 0.88)';
    ctx.fillRect(0, h - 60, w, 60);

    ctx.fillStyle = '#00c2cb';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`UIU RESCUE ROVER TEAM (#URRT) • ${camTag}`, 24, h - 24);

    const tempStr = temperature !== null && temperature !== undefined ? `${temperature}°C` : '--';
    const humStr = humidity !== null && humidity !== undefined ? `${humidity}%` : '--';
    const timeStr = new Date().toLocaleString();

    ctx.fillStyle = '#f1f5f9';
    ctx.font = '15px monospace';
    ctx.fillText(`TEMP: ${tempStr} | HUM: ${humStr} | ${timeStr}`, w - 480, h - 24);

    const dataUrl = canvas.toDataURL('image/png');
    const snapshotItem = {
      id: Date.now(),
      url: dataUrl,
      timestamp: timeStr,
      temp: tempStr,
      hum: humStr,
      camera: camTag
    };

    setSnapshots(prev => {
      const next = [snapshotItem, ...prev];
      onSnapshotsCountChange(next.length);
      return next;
    });
    setShowGalleryModal(true);
  };

  const handleScrollToMain = () => {
    soundManager.playChirp();
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNativePiP = async () => {
    soundManager.playChirp();
    try {
      let target = video1Ref.current;
      if (activeSlot === 'cam2') target = video2Ref.current;
      if (activeSlot === 'cam3') target = video3Ref.current;
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (target && target.requestPictureInPicture) {
        await target.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP error:', e);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.warn(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
      setIsFullscreen(false);
    }
  };

  const isCurrentLive = 
    activeSlot === 'split'
      ? (camStatus.cam1 === 'connected' || camStatus.cam2 === 'connected')
      : (camStatus[activeSlot] === 'connected');

  const getPairUrl = (slotId) => {
    if (typeof window === 'undefined') return '';
    const slot = CAM_SLOTS.find(s => s.id === slotId) || CAM_SLOTS[0];
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    // Mobile phones cannot open laptop's "localhost", and camera permissions require HTTPS.
    // Use the live Vercel HTTPS domain when on localhost so smartphones can scan and stream effortlessly.
    const baseUrl = isLocalhost ? 'https://frontend-teal-eta-93.vercel.app' : window.location.origin;
    return `${baseUrl}/camera?room=${roomCode}-${slot.subId}&cam=${slotId === 'cam2' ? '2' : slotId === 'cam3' ? '3' : '1'}&name=${encodeURIComponent(slot.role)}`;
  };

  return (
    <div 
      ref={containerRef}
      className={`relative rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all border ${
        theme === 'light'
          ? 'bg-white border-slate-200 shadow-slate-200/50'
          : 'bg-[#0f1624] border-[#162338]'
      } ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-black' : 'h-full flex-1 min-h-[220px]'
      }`}
    >
      {/* Top Header & Camera Slot Selector Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between px-3.5 py-2.5 border-b z-10 gap-2 ${
        theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#0a0f18]/95 border-[#162338]'
      }`}>
        {/* Left: Camera Slot Selector Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 font-mono text-xs">
          {CAM_SLOTS.map((slot) => {
            const isLive = camStatus[slot.id] === 'connected';
            const isActive = activeSlot === slot.id;
            return (
              <button
                key={slot.id}
                onClick={() => { soundManager.playChirp(); setActiveSlot(slot.id); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all font-bold ${
                  isActive
                    ? 'bg-[#00c2cb] text-black shadow-md shadow-cyan-500/20'
                    : theme === 'light'
                    ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    : 'bg-[#06090e] text-slate-300 hover:bg-[#162338] border border-[#162338]'
                }`}
                title={`Switch to ${slot.role}`}
              >
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                <span>{slot.label}</span>
              </button>
            );
          })}

          {/* Dual Split View Tab */}
          <button
            onClick={() => { soundManager.playChirp(); setActiveSlot('split'); }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all font-bold ${
              activeSlot === 'split'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : theme === 'light'
                ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                : 'bg-[#06090e] text-slate-300 hover:bg-[#162338] border border-[#162338]'
            }`}
            title="View CAM 01 and CAM 02 concurrently in split-screen"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>DUAL SPLIT</span>
          </button>
        </div>

        {/* Right: Viewport Action Controls */}
        <div className="flex items-center space-x-1.5 font-mono text-xs self-end sm:self-auto">
          {/* Snapshot Shutter Button */}
          <button
            onClick={handleCaptureSnapshot}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-400 transition-colors font-semibold"
            title="Capture inspection frame with watermark (S)"
          >
            <CameraIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SNAPSHOT</span>
          </button>

          {/* Gallery Button */}
          {snapshots.length > 0 && (
            <button
              onClick={() => setShowGalleryModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 hover:bg-purple-500/30 transition-colors"
              title="View inspection photos"
            >
              <Images className="w-3.5 h-3.5" />
              <span>{snapshots.length}</span>
            </button>
          )}

          {/* Multi-Cam Pair Phone Modal */}
          <button
            onClick={() => setShowPairModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#00c2cb]/15 hover:bg-[#00c2cb]/25 border border-[#00c2cb]/40 text-[#00c2cb] transition-colors font-bold"
            title="Connect Phone as Rover Camera"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ADD CAM</span>
          </button>

          {/* Native PiP Button */}
          <button
            onClick={handleNativePiP}
            className={`p-1.5 rounded-xl border transition-colors ${
              theme === 'light' ? 'bg-white border-slate-200 text-slate-600 hover:text-[#00c2cb]' : 'bg-[#06090e] border-[#162338] text-slate-300 hover:text-[#00c2cb]'
            }`}
            title="Pop-out Picture-in-Picture window"
          >
            <PictureInPicture2 className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-xl border transition-colors ${
              theme === 'light' ? 'bg-white border-slate-200 text-slate-600 hover:text-[#00c2cb]' : 'bg-[#06090e] border-[#162338] text-slate-300 hover:text-[#00c2cb]'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Video Viewport (Single or Split) */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[320px]">
        
        {/* Single Camera View */}
        {activeSlot !== 'split' && (
          <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
            {/* Video 1 */}
            <video
              ref={video1Ref}
              autoPlay
              playsInline
              muted
              style={{
                transform: `scale(${zoomLevel}) ${isFlipped ? 'scaleX(-1)' : ''}`,
                filter: isNightVision ? 'contrast(135%) brightness(115%) sepia(1) hue-rotate(85deg) saturate(380%)' : 'none',
                transition: 'transform 0.2s ease, filter 0.2s ease'
              }}
              className={`w-full h-full object-contain ${activeSlot === 'cam1' && camStatus.cam1 === 'connected' ? 'block' : 'hidden'}`}
            />

            {/* Video 2 */}
            <video
              ref={video2Ref}
              autoPlay
              playsInline
              muted
              style={{
                transform: `scale(${zoomLevel}) ${isFlipped ? 'scaleX(-1)' : ''}`,
                filter: isNightVision ? 'contrast(135%) brightness(115%) sepia(1) hue-rotate(85deg) saturate(380%)' : 'none',
                transition: 'transform 0.2s ease, filter 0.2s ease'
              }}
              className={`w-full h-full object-contain ${activeSlot === 'cam2' && camStatus.cam2 === 'connected' ? 'block' : 'hidden'}`}
            />

            {/* Video 3 */}
            <video
              ref={video3Ref}
              autoPlay
              playsInline
              muted
              style={{
                transform: `scale(${zoomLevel}) ${isFlipped ? 'scaleX(-1)' : ''}`,
                filter: isNightVision ? 'contrast(135%) brightness(115%) sepia(1) hue-rotate(85deg) saturate(380%)' : 'none',
                transition: 'transform 0.2s ease, filter 0.2s ease'
              }}
              className={`w-full h-full object-contain ${activeSlot === 'cam3' && camStatus.cam3 === 'connected' ? 'block' : 'hidden'}`}
            />

            {/* Standby / No Stream placeholder for active slot */}
            {camStatus[activeSlot] !== 'connected' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#0a0f18] via-[#06090e] to-black">

            {/* Object Detection Bounding Box Overlay Canvas */}
            {objectDetectEnabled && camStatus[activeSlot] === 'connected' && (
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                style={{ objectFit: 'contain' }}
              />
            )}
                <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-[#00a8b5] to-[#00e5ff] shadow-[0_0_20px_rgba(0,194,203,0.4)] mb-3">
                  <img src="/urrt-logo.png" alt="URRT" className="w-full h-full rounded-full object-cover bg-black" />
                </div>
                <h3 className="text-sm font-bold font-tech text-white uppercase tracking-wider mb-1">
                  {CAM_SLOTS.find(s => s.id === activeSlot)?.label} STANDBY
                </h3>
                <p className="text-xs text-slate-400 font-mono mb-3">
                  Scan QR code with smartphone to stream as this rover camera
                </p>
                <button
                  onClick={() => { setPairModalTab(activeSlot); setShowPairModal(true); }}
                  className="px-3.5 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#00e5ff] text-black font-bold text-xs font-tech tracking-wider flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
                >
                  <QrCode className="w-4 h-4" />
                  <span>PAIR THIS CAMERA</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Dual Split-Screen View (CAM 1 & CAM 2) */}
        {activeSlot === 'split' && (
          <div className="w-full h-full grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-[#06090e]">
            {/* Split Left: CAM 01 */}
            <div className="relative rounded-xl border border-[#162338] bg-black overflow-hidden flex items-center justify-center">
              <video
                ref={video1Ref}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${camStatus.cam1 === 'connected' ? 'block' : 'hidden'}`}
              />
              {camStatus.cam1 !== 'connected' && (
                <div className="text-center p-4">
                  <span className="text-xs font-mono text-slate-500 block">CAM 01 (DRIVE) STANDBY</span>
                  <button 
                    onClick={() => { setPairModalTab('cam1'); setShowPairModal(true); }}
                    className="mt-2 text-[10px] text-[#00c2cb] underline font-mono"
                  >
                    Pair Drive Camera
                  </button>
                </div>
              )}
              <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-white border border-[#00c2cb]/40">
                CAM 01: DRIVE
              </div>
            </div>

            {/* Split Right: CAM 02 */}
            <div className="relative rounded-xl border border-[#162338] bg-black overflow-hidden flex items-center justify-center">
              <video
                ref={video2Ref}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${camStatus.cam2 === 'connected' ? 'block' : 'hidden'}`}
              />
              {camStatus.cam2 !== 'connected' && (
                <div className="text-center p-4">
                  <span className="text-xs font-mono text-slate-500 block">CAM 02 (ARM) STANDBY</span>
                  <button 
                    onClick={() => { setPairModalTab('cam2'); setShowPairModal(true); }}
                    className="mt-2 text-[10px] text-[#00c2cb] underline font-mono"
                  >
                    Pair Arm Camera
                  </button>
                </div>
              )}
              <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-white border border-[#00c2cb]/40">
                CAM 02: ARM
              </div>
            </div>
          </div>
        )}

        {/* Tactical Search Reticle / Grid Overlay */}
        {activeSlot !== 'split' && overlayMode === 'reticle' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-16 h-16 border border-[#00c2cb]/40 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
              <div className="absolute w-full h-[1px] bg-[#00c2cb]/50" />
              <div className="absolute h-full w-[1px] bg-[#00c2cb]/50" />
            </div>
            <div className="absolute inset-6 pointer-events-none">
              <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-[#00c2cb]" />
              <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-[#00c2cb]" />
              <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-[#00c2cb]" />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-[#00c2cb]" />
            </div>
          </div>
        )}

        {activeSlot !== 'split' && overlayMode === 'grid' && (
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-[#00c2cb]/20">
            <div className="border-r border-b border-[#00c2cb]/20" />
            <div className="border-r border-b border-[#00c2cb]/20" />
            <div className="border-b border-[#00c2cb]/20" />
            <div className="border-r border-b border-[#00c2cb]/20" />
            <div className="border-r border-b border-[#00c2cb]/20" />
            <div className="border-b border-[#00c2cb]/20" />
            <div className="border-r border-b border-[#00c2cb]/20" />
            <div className="border-r border-b border-[#00c2cb]/20" />
            <div />
          </div>
        )}

        {/* Tactical Control Bar on Viewport */}
        <div className="absolute bottom-3 left-3 z-20 flex items-center pointer-events-auto">
          <div className="flex items-center gap-1.5 bg-[#06090e]/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-[#162338]">
            <button
              onClick={() => {
                soundManager.playChirp();
                setZoomLevel(z => z === 1 ? 1.5 : z === 1.5 ? 2 : 1);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0f1624] text-[10px] font-mono text-[#00c2cb] hover:bg-[#162338] transition-colors"
              title="Toggle Digital Zoom (1x, 1.5x, 2x)"
            >
              <ZoomIn className="w-3 h-3" />
              <span>{zoomLevel}X</span>
            </button>

            <button
              onClick={() => {
                soundManager.playChirp();
                setIsNightVision(v => !v);
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono transition-colors ${
                isNightVision 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                  : 'bg-[#0f1624] text-slate-400 hover:text-white'
              }`}
              title="Toggle Night Vision / Low-Light NVG Shader"
            >
              <Eye className="w-3 h-3" />
              <span>NVG</span>
            </button>

            <button
              onClick={() => {
                soundManager.playChirp();
                setIsFlipped(f => !f);
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono transition-colors ${
                isFlipped 
                  ? 'bg-[#00c2cb]/20 text-[#00c2cb] border border-[#00c2cb]/40' 
                  : 'bg-[#0f1624] text-slate-400 hover:text-white'
              }`}
              title="Mirror / Flip Video Stream"
            >
              <FlipHorizontal className="w-3 h-3" />
              <span>FLIP</span>
            </button>

            <button
              onClick={() => {
                soundManager.playChirp();
                setOverlayMode(m => m === 'reticle' ? 'grid' : m === 'grid' ? 'none' : 'reticle');
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0f1624] text-[10px] font-mono text-slate-300 hover:text-white transition-colors"
              title="Cycle Reticle / Search Grid / Off"
            >
              {overlayMode === 'reticle' ? <Crosshair className="w-3 h-3 text-rose-400" /> : <Grid className="w-3 h-3 text-[#00c2cb]" />}
              <span className="uppercase">{overlayMode}</span>
            </button>
          </div>
        </div>

        {/* ─── AI Vision Detection Toggle Bar (Right side of viewport) ─── */}
        <div className="absolute bottom-3 right-3 z-20 flex items-center pointer-events-auto">
          <div className="flex items-center gap-1.5 bg-[#06090e]/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-[#162338]">
            {/* QR Toggle */}
            <button
              onClick={() => { soundManager.playChirp(); setQrEnabled(q => !q); }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono transition-colors ${
                qrEnabled
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'bg-[#0f1624] text-slate-400 hover:text-white'
              }`}
              title="Toggle QR Code Scanner"
            >
              <QrCode className="w-3 h-3" />
              <span>QR</span>
            </button>

            {/* Object Detection Toggle */}
            <button
              onClick={() => { soundManager.playChirp(); setObjectDetectEnabled(o => !o); }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono transition-colors ${
                objectDetectEnabled
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-[#0f1624] text-slate-400 hover:text-white'
              }`}
              title="Toggle AI Object Detection (COCO-SSD)"
            >
              {modelLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              <span>DETECT</span>
            </button>

            {/* Motion Detection Toggle */}
            <button
              onClick={() => { soundManager.playChirp(); setMotionDetectEnabled(m => !m); }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono transition-colors ${
                motionDetectEnabled
                  ? motionAlert
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-[#0f1624] text-slate-400 hover:text-white'
              }`}
              title="Toggle Motion Detection"
            >
              <Radio className="w-3 h-3" />
              <span>MOTION {motionDetectEnabled ? `${motionLevel}%` : ''}</span>
            </button>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ─── AI VISION RESULTS PANEL (below video viewport) ────────── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {(qrResult || detectedObjects.length > 0 || (motionDetectEnabled && motionLevel > 0)) && (
        <div className={`px-3.5 py-2.5 border-t space-y-2 ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#0a0f18]/95 border-[#162338]'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#00c2cb]" />
            <span className="text-[11px] font-bold font-tech text-[#00c2cb] uppercase tracking-wider">AI Vision Intel</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">

            {/* QR Detection Result */}
            {qrEnabled && (
              <div className={`rounded-xl p-2.5 border ${
                qrResult
                  ? 'bg-purple-500/10 border-purple-500/30'
                  : theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#0f1624] border-[#162338]'
              }`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <QrCode className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">QR Scanner</span>
                </div>
                {qrResult ? (
                  <div>
                    {qrResult.isUrl ? (
                      <a
                        href={qrResult.data}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono text-blue-400 hover:text-blue-300 underline break-all block"
                      >
                        {qrResult.data}
                      </a>
                    ) : (
                      <p className="text-xs font-mono text-slate-300 break-all">{qrResult.data}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(qrResult.data);
                          setCopiedQr(true);
                          setTimeout(() => setCopiedQr(false), 2000);
                          soundManager.playChirp();
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 text-[10px] font-mono hover:bg-purple-500/30 transition-colors"
                      >
                        {copiedQr ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedQr ? 'COPIED' : 'COPY'}</span>
                      </button>
                      {qrResult.isUrl && (
                        <a
                          href={qrResult.data}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 text-[10px] font-mono hover:bg-blue-500/30 transition-colors"
                        >
                          <ArrowUpRight className="w-3 h-3" />
                          <span>OPEN</span>
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] font-mono text-slate-500">Scanning for QR codes...</p>
                )}
                {qrHistory.length > 1 && (
                  <div className="mt-2 pt-1.5 border-t border-purple-500/20">
                    <span className="text-[9px] font-mono text-slate-500 block mb-1">HISTORY ({qrHistory.length})</span>
                    <div className="space-y-0.5 max-h-16 overflow-y-auto">
                      {qrHistory.slice(1, 5).map((h, i) => (
                        <p key={i} className="text-[9px] font-mono text-slate-400 truncate">{h.data}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Object Detection Results */}
            {objectDetectEnabled && (
              <div className={`rounded-xl p-2.5 border ${
                detectedObjects.length > 0
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#0f1624] border-[#162338]'
              }`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">Object Detection</span>
                  {modelLoading && <Loader2 className="w-3 h-3 animate-spin text-amber-300" />}
                </div>
                {detectedObjects.length > 0 ? (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {detectedObjects.map((obj, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] font-mono bg-[#0a0f18] rounded-lg px-2 py-1.5">
                        {/* Color Swatch */}
                        {obj.color && (
                          <div
                            className="w-4 h-4 rounded-full border border-white/30 flex-shrink-0"
                            style={{ backgroundColor: obj.color.hex }}
                            title={`RGB(${obj.color.r}, ${obj.color.g}, ${obj.color.b})`}
                          />
                        )}
                        {/* Object Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-200 capitalize font-bold">{obj.class}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                              obj.score > 80 ? 'bg-emerald-500/20 text-emerald-300' :
                              obj.score > 50 ? 'bg-amber-500/20 text-amber-300' :
                              'bg-rose-500/20 text-rose-300'
                            }`}>
                              {obj.score}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {obj.color && (
                              <span className="text-[9px] text-slate-400">
                                🎨 <span className="text-slate-300">{obj.color.name}</span>
                              </span>
                            )}
                            {obj.shape && (
                              <span className="text-[9px] text-slate-400">
                                ◆ <span className="text-slate-300">{obj.shape}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] font-mono text-slate-500">
                    {modelLoading ? 'Loading AI model...' : 'No objects detected'}
                  </p>
                )}
              </div>
            )}

            {/* Motion Detection Meter */}
            {motionDetectEnabled && (
              <div className={`rounded-xl p-2.5 border ${
                motionAlert
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#0f1624] border-[#162338]'
              }`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Radio className={`w-3.5 h-3.5 ${motionAlert ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
                  <span className={`text-[10px] font-mono font-bold uppercase ${motionAlert ? 'text-rose-400' : 'text-emerald-400'}`}>
                    Motion {motionAlert ? 'ALERT' : 'Monitor'}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#162338] overflow-hidden mb-1.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      motionLevel > 60 ? 'bg-rose-500' :
                      motionLevel > 25 ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}
                    style={{ width: `${motionLevel}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500">Activity Level</span>
                  <span className={`font-bold ${
                    motionLevel > 60 ? 'text-rose-400' :
                    motionLevel > 25 ? 'text-amber-400' :
                    'text-emerald-400'
                  }`}>
                    {motionLevel}%
                  </span>
                </div>
                {motionAlert && (
                  <div className="mt-1.5 flex items-center gap-1 text-[9px] font-mono text-rose-400">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                    <span>Significant motion detected!</span>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Enlarged Floating Sticky Picture-in-Picture Mini-HUD with Size & Channel Controls */}
      {isScrolledOut && !isFloatingDismissed && (
        <div className={`fixed bottom-5 right-5 z-40 rounded-2xl backdrop-blur-md border-2 border-[#00c2cb] shadow-2xl shadow-cyan-950/90 overflow-hidden animate-in slide-in-from-bottom-5 duration-300 font-mono transition-all ${
          theme === 'light' ? 'bg-white/95' : 'bg-[#0a0f18]/95'
        } ${
          floatingSize === 'normal' 
            ? 'w-80 sm:w-96' 
            : floatingSize === 'large' 
            ? 'w-96 sm:w-[480px] md:w-[540px]' 
            : 'w-[94vw] sm:w-[600px] md:w-[680px]'
        }`}>
          
          {/* Mini-HUD Header */}
          <div className={`flex items-center justify-between px-3.5 py-2 border-b ${
            theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-[#06090e] border-[#162338]'
          }`}>
            <div 
              className="flex items-center gap-2 cursor-pointer group"
              onClick={handleScrollToMain}
              title="Click to scroll smoothly to main camera view"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isCurrentLive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                theme === 'light' ? 'text-slate-900 group-hover:text-[#00a8b5]' : 'text-white group-hover:text-[#00c2cb]'
              }`}>
                ROVER HUD
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#00c2cb]/20 text-[#00c2cb] border border-[#00c2cb]/40 font-bold">
                {activeSlot.toUpperCase()}
              </span>
            </div>

            {/* Controls on Floating HUD Header */}
            <div className="flex items-center gap-1.5 text-xs">
              {/* Channel Quick Switcher on Floating HUD */}
              <div className="flex items-center rounded-lg bg-black/20 p-0.5 border border-[#162338] text-[10px]">
                <button
                  onClick={() => { soundManager.playChirp(); setActiveSlot('cam1'); }}
                  className={`px-1.5 py-0.5 rounded ${activeSlot === 'cam1' ? 'bg-[#00c2cb] text-black font-bold' : 'text-slate-400'}`}
                >
                  C1
                </button>
                <button
                  onClick={() => { soundManager.playChirp(); setActiveSlot('cam2'); }}
                  className={`px-1.5 py-0.5 rounded ${activeSlot === 'cam2' ? 'bg-[#00c2cb] text-black font-bold' : 'text-slate-400'}`}
                >
                  C2
                </button>
                <button
                  onClick={() => { soundManager.playChirp(); setActiveSlot('split'); }}
                  className={`px-1.5 py-0.5 rounded ${activeSlot === 'split' ? 'bg-purple-500 text-white font-bold' : 'text-slate-400'}`}
                >
                  SPLIT
                </button>
              </div>

              {/* Size Switcher Toggle */}
              <button
                onClick={() => {
                  soundManager.playChirp();
                  setFloatingSize(s => s === 'normal' ? 'large' : s === 'large' ? 'xlarge' : 'normal');
                }}
                className="p-1 rounded-md hover:bg-black/10 text-slate-400 hover:text-[#00c2cb] transition-colors text-[10px] font-bold"
                title={`Resize Floating Camera (Current: ${floatingSize})`}
              >
                {floatingSize === 'normal' ? 'M' : floatingSize === 'large' ? 'L' : 'XL'}
              </button>

              <button
                onClick={handleScrollToMain}
                className="p-1 rounded-md hover:bg-black/10 text-slate-400 hover:text-white transition-colors"
                title="Scroll back to main camera"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-[#00c2cb]" />
              </button>

              <button
                onClick={() => setIsFloatingDismissed(true)}
                className="p-1 rounded-md hover:bg-black/10 text-slate-400 hover:text-rose-400 transition-colors"
                title="Minimize floating camera"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mini Video Viewport */}
          <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
            {activeSlot !== 'split' ? (
              <video
                ref={miniVideo1Ref}
                autoPlay
                playsInline
                muted
                style={{
                  transform: `scale(${zoomLevel}) ${isFlipped ? 'scaleX(-1)' : ''}`,
                  filter: isNightVision ? 'contrast(135%) brightness(115%) sepia(1) hue-rotate(85deg) saturate(380%)' : 'none'
                }}
                className={`w-full h-full object-cover ${isCurrentLive ? 'block' : 'hidden'}`}
              />
            ) : (
              <div className="w-full h-full grid grid-cols-2 gap-1 p-1">
                <video ref={miniVideo1Ref} autoPlay playsInline muted className="w-full h-full object-cover rounded" />
                <video ref={miniVideo2Ref} autoPlay playsInline muted className="w-full h-full object-cover rounded" />
              </div>
            )}

            {!isCurrentLive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-[#0a0f18]">
                <img src="/urrt-logo.png" alt="URRT" className="w-10 h-10 rounded-full mb-1" />
                <span className="text-[11px] text-slate-400 font-tech">STANDBY FEED</span>
              </div>
            )}

            {/* Live Telemetry Pill */}
            <div className="absolute top-2 left-2 bg-black/85 px-2 py-0.5 rounded text-[10px] text-[#00c2cb] border border-[#00c2cb]/40 pointer-events-none">
              {temperature !== null ? `${temperature}°C` : '--'} | {humidity !== null ? `${humidity}%` : '--'}
            </div>

            {/* Floating Quick Action Controls */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <button
                onClick={handleCaptureSnapshot}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/90 hover:bg-emerald-400 text-black font-bold text-[11px] shadow-lg transition-transform active:scale-95"
                title="Capture Snapshot with Watermark"
              >
                <CameraIcon className="w-3.5 h-3.5" />
                <span>SNAP</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* Multi-Camera Phone Pairing Modal */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-lg w-full p-6 relative shadow-2xl border ${
            theme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0f18] border-[#162338] text-white'
          }`}>
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
              <h3 className="text-lg font-bold font-tech tracking-wider">
                WIRELESS MULTI-CAMERA SETUP
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Select camera role below and scan QR code with any smartphone
              </p>
            </div>

            {/* Camera Role Tabs in Modal */}
            <div className="flex items-center justify-center gap-1.5 mb-4 p-1 rounded-xl bg-slate-900/40 border border-slate-800">
              {CAM_SLOTS.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setPairModalTab(slot.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    pairModalTab === slot.id
                      ? 'bg-[#00c2cb] text-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>

            {/* Active Role QR Code */}
            <div className="bg-white p-4 rounded-2xl w-52 h-52 mx-auto flex items-center justify-center shadow-lg border border-slate-200">
              <QRCodeSVG
                value={getPairUrl(pairModalTab)}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>

            <div className="mt-4 text-center">
              <span className="text-xs font-mono font-bold text-[#00c2cb] block mb-1">
                ASSIGNED ROLE: {CAM_SLOTS.find(s => s.id === pairModalTab)?.role}
              </span>
              <p className="text-[11px] text-slate-400 font-mono">
                Scan QR code with phone camera, or copy link to open in mobile browser:
              </p>
            </div>

            {/* Direct Copyable Link Box */}
            <div className="mt-3 flex items-center gap-1.5 p-2 rounded-xl bg-[#06090e] border border-[#162338]">
              <input
                type="text"
                readOnly
                value={getPairUrl(pairModalTab)}
                className="bg-transparent text-[11px] font-mono text-slate-300 w-full focus:outline-none truncate select-all px-1"
              />
              <button
                type="button"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(getPairUrl(pairModalTab));
                    setCopiedPairUrl(true);
                    setTimeout(() => setCopiedPairUrl(false), 2000);
                    soundManager.playChirp();
                  } catch (e) {}
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#00c2cb]/15 hover:bg-[#00c2cb]/25 text-[#00c2cb] font-mono text-[10px] font-bold transition-all flex-shrink-0 cursor-pointer"
              >
                {copiedPairUrl ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPairUrl ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <a
                href={getPairUrl(pairModalTab)}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-[#162338] hover:bg-slate-700 text-white font-mono text-xs text-center font-semibold transition-colors"
              >
                OPEN TEST STREAM IN NEW TAB
              </a>
              <button
                onClick={() => setShowPairModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#00e5ff] text-black font-bold font-mono text-xs transition-colors"
              >
                DONE
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Snapshot Gallery Modal */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col p-6 relative shadow-2xl border ${
            theme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0f18] border-[#162338] text-white'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-[#162338]">
              <div className="flex items-center gap-2">
                <Images className="w-5 h-5 text-[#00c2cb]" />
                <h3 className="text-lg font-bold font-tech tracking-wider">
                  MISSION INSPECTION GALLERY
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#00c2cb]/20 text-[#00c2cb] font-bold">
                  {snapshots.length} CAPTURES
                </span>
              </div>
              <button
                onClick={() => setShowGalleryModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 my-4">
              {snapshots.length === 0 ? (
                <div className="py-16 text-center text-slate-500 font-mono text-xs">
                  No snapshots captured yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {snapshots.map((snap) => (
                    <div key={snap.id} className="rounded-xl bg-[#06090e] border border-[#162338] overflow-hidden group">
                      <div className="relative aspect-video bg-black">
                        <img src={snap.url} alt="Rover snapshot" className="w-full h-full object-cover" />
                        <a
                          href={snap.url}
                          download={`URRT_Snapshot_${snap.id}.png`}
                          className="absolute bottom-2 right-2 p-2 rounded-lg bg-black/80 hover:bg-[#00c2cb] hover:text-black text-white transition-colors shadow-lg"
                          title="Download high-resolution image"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                      <div className="p-2.5 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                        <span>{snap.timestamp}</span>
                        <span className="text-[#00c2cb] font-bold">{snap.camera || '#URRT'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowGalleryModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#162338] hover:bg-slate-700 text-slate-200 font-tech font-semibold text-xs transition-colors"
            >
              CLOSE GALLERY
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
