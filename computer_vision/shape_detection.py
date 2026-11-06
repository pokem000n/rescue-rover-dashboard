"""
computer_vision/shape_detection.py - Geometric Shape Classifier
URRT Rulebook V1.3 Table 7 Compliant (Colour & Shape Task)
Classifies geometric shapes on the Sensor Crate target cards:
Circle, Square, Rectangle, Triangle, Pentagon, Hexagon.
"""

import math
import time
from dataclasses import dataclass
from typing import Optional, Tuple, Dict, Any

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False


@dataclass
class ShapeResult:
    detected: bool
    shape_name: str
    vertices: int
    confidence: float
    bbox: Optional[Tuple[int, int, int, int]]
    center: Optional[Tuple[int, int]]
    timestamp: float


class ShapeDetector:
    """
    Detects and classifies geometric target shapes via contour approximation
    and circularity metrics.
    """

    MIN_CONTOUR_AREA = 600

    def detect(self, frame) -> ShapeResult:
        """
        Processes frame and returns detected shape.
        """
        if not CV2_AVAILABLE or frame is None:
            return ShapeResult(
                detected=False,
                shape_name="Unknown",
                vertices=0,
                confidence=0.0,
                bbox=None,
                center=None,
                timestamp=time.time()
            )

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edged = cv2.Canny(blurred, 50, 150)

        contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        best_shape = "Unknown"
        best_vertices = 0
        max_area = 0
        best_bbox = None
        best_center = None

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < self.MIN_CONTOUR_AREA or area <= max_area:
                continue

            peri = cv2.arcLength(cnt, True)
            if peri == 0:
                continue

            approx = cv2.approxPolyDP(cnt, 0.04 * peri, True)
            vertices = len(approx)

            # Circularity metric: 4 * pi * Area / (Perimeter^2)
            circularity = (4.0 * math.pi * area) / (peri * peri)

            shape = "Unknown"
            if circularity > 0.82:
                shape = "Circle"
                vertices = 0
            elif vertices == 3:
                shape = "Triangle"
            elif vertices == 4:
                x, y, w, h = cv2.boundingRect(approx)
                aspect_ratio = float(w) / float(h)
                shape = "Square" if 0.90 <= aspect_ratio <= 1.10 else "Rectangle"
            elif vertices == 5:
                shape = "Pentagon"
            elif vertices == 6:
                shape = "Hexagon"
            else:
                if circularity > 0.70:
                    shape = "Circle"

            if shape != "Unknown":
                max_area = area
                best_shape = shape
                best_vertices = vertices
                x, y, w, h = cv2.boundingRect(cnt)
                best_bbox = (int(x), int(y), int(w), int(h))
                best_center = (int(x + w / 2), int(y + h / 2))

        detected = (best_shape != "Unknown")
        confidence = min(0.98, max(0.65, max_area / 15000.0)) if detected else 0.0

        return ShapeResult(
            detected=detected,
            shape_name=best_shape,
            vertices=best_vertices,
            confidence=round(confidence, 2),
            bbox=best_bbox,
            center=best_center,
            timestamp=time.time()
        )
