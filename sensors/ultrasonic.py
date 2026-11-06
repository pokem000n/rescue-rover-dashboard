"""
sensors/ultrasonic.py - HC-SR04 / JSN-SR04T Ultrasonic Driver
URRT Rulebook V1.3 Table 7 Compliant (Sonar Monitoring & Stop Zone 80-120mm)
Features:
- Distance measurement in millimeters (mm)
- Rolling median & moving average noise filtering
- Table 7 Target Zone detection (80mm - 120mm)
- Critical collision emergency alert (< 60mm)
"""

import time
from collections import deque
from dataclasses import dataclass
from typing import Optional, List, Dict, Any


@dataclass
class DistanceReading:
    raw_distance_mm: float
    filtered_distance_mm: float
    in_target_zone: bool
    is_critical_close: bool
    timestamp: float


class UltrasonicSensor:
    """
    Ultrasonic distance measurement handler with statistical filtering
    and URRT Table 7 target zone boundaries.
    """

    TARGET_MIN_MM = 80.0
    TARGET_MAX_MM = 120.0
    CRITICAL_MIN_MM = 60.0

    def __init__(self, trig_pin: int = 5, echo_pin: int = 18, filter_window: int = 5):
        self.trig_pin = trig_pin
        self.echo_pin = echo_pin
        self.history = deque(maxlen=filter_window)
        self.last_reading: Optional[DistanceReading] = None

    def ingest_reading(self, distance_mm: float) -> DistanceReading:
        """
        Ingest a raw distance reading in mm, apply median filter,
        and evaluate Table 7 target compliance.
        """
        # Clamp to realistic physical range (20mm to 4000mm)
        clamped = max(20.0, min(4000.0, float(distance_mm)))
        self.history.append(clamped)

        # Median filter to eliminate spikes
        sorted_vals = sorted(self.history)
        n = len(sorted_vals)
        if n % 2 == 1:
            filtered = sorted_vals[n // 2]
        else:
            filtered = (sorted_vals[n // 2 - 1] + sorted_vals[n // 2]) / 2.0

        in_zone = (self.TARGET_MIN_MM <= filtered <= self.TARGET_MAX_MM)
        critical = (filtered < self.CRITICAL_MIN_MM)

        reading = DistanceReading(
            raw_distance_mm=round(clamped, 1),
            filtered_distance_mm=round(filtered, 1),
            in_target_zone=in_zone,
            is_critical_close=critical,
            timestamp=time.time()
        )
        self.last_reading = reading
        return reading

    def is_in_target_zone(self) -> bool:
        """Check if latest reading is within 80mm - 120mm."""
        if not self.last_reading:
            return False
        return self.last_reading.in_target_zone

    def get_telemetry_payload(self) -> Dict[str, Any]:
        """Telemetry representation for WebSocket broadcast."""
        dist = self.last_reading.filtered_distance_mm if self.last_reading else 0.0
        in_zone = self.last_reading.in_target_zone if self.last_reading else False
        return {
            "sonar_mm": dist,
            "in_target_zone": in_zone,
            "target_min_mm": self.TARGET_MIN_MM,
            "target_max_mm": self.TARGET_MAX_MM,
            "timestamp": time.time()
        }
