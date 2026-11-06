"""
URRT Autonomous Rover - Computer Vision Package
Compliant with URRT Rulebook V1.3 Table 7
"""

from .qr_detection import QRDetector, QRResult
from .color_detection import ColorDetector, ColorResult
from .shape_detection import ShapeDetector, ShapeResult
from .motion_tracking import MotionTracker, MotionResult

__all__ = [
    "QRDetector",
    "QRResult",
    "ColorDetector",
    "ColorResult",
    "ShapeDetector",
    "ShapeResult",
    "MotionTracker",
    "MotionResult",
]
