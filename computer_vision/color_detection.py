"""
computer_vision/color_detection.py - HSV Color Detector
URRT Rulebook V1.3 Table 7 Compliant (Colour & Shape Task)
Filters video frames into HSV color ranges to classify target crate cards:
Red, Green, Blue, Yellow, Orange.
"""

import time
from dataclasses import dataclass
from typing import Optional, Tuple, Dict, Any, List

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False


@dataclass
class ColorResult:
    detected: bool
    color_name: str
    confidence: float
    bbox: Optional[Tuple[int, int, int, int]]  # (x, y, w, h)
    hex_code: str
    timestamp: float


class ColorDetector:
    """
    HSV color segmentation and classification for URRT target cards.
    """

    COLOR_RANGES = {
        "Red": [
            {"lower": (0, 100, 100), "upper": (10, 255, 255)},
            {"lower": (170, 100, 100), "upper": (180, 255, 255)}
        ],
        "Green": [
            {"lower": (35, 80, 80), "upper": (85, 255, 255)}
        ],
        "Blue": [
            {"lower": (100, 100, 80), "upper": (130, 255, 255)}
        ],
        "Yellow": [
            {"lower": (20, 100, 100), "upper": (35, 255, 255)}
        ],
        "Orange": [
            {"lower": (10, 120, 100), "upper": (25, 255, 255)}
        ]
    }

    COLOR_HEX = {
        "Red": "#ef4444",
        "Green": "#10b981",
        "Blue": "#3b82f6",
        "Yellow": "#facc15",
        "Orange": "#f97316"
    }

    MIN_CONTOUR_AREA = 500  # Minimum pixel area for valid card

    def detect(self, frame) -> ColorResult:
        """
        Classifies dominant target card color from an image frame.
        """
        if not CV2_AVAILABLE or frame is None:
            return ColorResult(
                detected=False,
                color_name="Unknown",
                confidence=0.0,
                bbox=None,
                hex_code="#94a3b8",
                timestamp=time.time()
            )

        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        best_color = "Unknown"
        max_area = 0
        best_bbox = None

        for color_name, ranges in self.COLOR_RANGES.items():
            mask = np.zeros(hsv.shape[:2], dtype="uint8")
            for r in ranges:
                lower = np.array(r["lower"], dtype="uint8")
                upper = np.array(r["upper"], dtype="uint8")
                mask |= cv2.inRange(hsv, lower, upper)

            # Morphological cleaning
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area > self.MIN_CONTOUR_AREA and area > max_area:
                    max_area = area
                    best_color = color_name
                    x, y, w, h = cv2.boundingRect(cnt)
                    best_bbox = (int(x), int(y), int(w), int(h))

        detected = (best_color != "Unknown")
        confidence = min(0.99, max(0.60, max_area / 10000.0)) if detected else 0.0

        return ColorResult(
            detected=detected,
            color_name=best_color,
            confidence=round(confidence, 2),
            bbox=best_bbox,
            hex_code=self.COLOR_HEX.get(best_color, "#94a3b8"),
            timestamp=time.time()
        )
