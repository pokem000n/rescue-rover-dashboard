"""
computer_vision/qr_detection.py - QR Code Scanner & IPv4 Extraction
URRT Rulebook V1.3 Table 7 Compliant (QR Code & Server Ping Task)
Detects QR codes from video frames, decodes payload, and extracts IPv4 addresses.
"""

import re
import time
from dataclasses import dataclass
from typing import Optional, Tuple, List, Dict, Any

# Graceful optional import of cv2 and pyzbar
try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False


@dataclass
class QRResult:
    detected: bool
    payload: str
    ipv4_address: Optional[str]
    bbox: Optional[Tuple[int, int, int, int]]  # (x, y, w, h)
    timestamp: float


class QRDetector:
    """
    Scans video frames for QR codes, extracts text, and parses IPv4 targets
    for the URRT Table 7 server ping challenge.
    """

    IPV4_REGEX = re.compile(r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b')

    def __init__(self):
        self.detector = None
        if CV2_AVAILABLE:
            try:
                self.detector = cv2.QRCodeDetector()
            except Exception:
                self.detector = None

    def extract_ipv4(self, text: str) -> Optional[str]:
        """Extract valid IPv4 address from text payload."""
        if not text:
            return None
        match = self.IPV4_REGEX.search(text)
        return match.group(0) if match else None

    def detect_and_decode(self, frame) -> QRResult:
        """
        Process a video frame (BGR numpy array) to detect QR codes.
        """
        if not CV2_AVAILABLE or frame is None or self.detector is None:
            return QRResult(
                detected=False,
                payload="",
                ipv4_address=None,
                bbox=None,
                timestamp=time.time()
            )

        try:
            val, points, _ = self.detector.detectAndDecode(frame)
            if val:
                ipv4 = self.extract_ipv4(val)
                bbox = None
                if points is not None and len(points) > 0:
                    pts = points[0].astype(int)
                    x, y, w, h = cv2.boundingRect(pts)
                    bbox = (int(x), int(y), int(w), int(h))

                return QRResult(
                    detected=True,
                    payload=val,
                    ipv4_address=ipv4,
                    bbox=bbox,
                    timestamp=time.time()
                )
        except Exception:
            pass

        return QRResult(
            detected=False,
            payload="",
            ipv4_address=None,
            bbox=None,
            timestamp=time.time()
        )

    def parse_text_payload(self, text: str) -> QRResult:
        """Directly parse a string payload (useful for API/WebSocket events)."""
        ipv4 = self.extract_ipv4(text)
        return QRResult(
            detected=bool(text),
            payload=text,
            ipv4_address=ipv4,
            bbox=None,
            timestamp=time.time()
        )
