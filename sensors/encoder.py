"""
sensors/encoder.py - Wheel Encoders & Odometry Reader
Features:
- Dual-wheel optical / magnetic quadrature encoder support
- Ticks-to-distance conversion
- Differential drive forward kinematics (X, Y, Theta)
- Speed estimation (mm/s)
"""

import math
import time
from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class OdometryReading:
    x_mm: float
    y_mm: float
    theta_deg: float
    linear_speed_mm_s: float
    angular_speed_deg_s: float
    left_distance_mm: float
    right_distance_mm: float
    timestamp: float


class WheelEncoder:
    """
    Computes dead-reckoning odometry and robot velocity from wheel encoder counts.
    """

    def __init__(
        self,
        wheel_diameter_mm: float = 65.0,
        track_width_mm: float = 210.0,
        ticks_per_revolution: int = 360
    ):
        self.wheel_diameter_mm = wheel_diameter_mm
        self.track_width_mm = track_width_mm
        self.ticks_per_rev = ticks_per_revolution
        self.mm_per_tick = (math.pi * wheel_diameter_mm) / float(ticks_per_revolution)

        self.x = 0.0
        self.y = 0.0
        self.theta = 0.0  # radians

        self.last_left_ticks = 0
        self.last_right_ticks = 0
        self.last_time = time.time()
        self.last_reading: Optional[OdometryReading] = None

    def update(self, current_left_ticks: int, current_right_ticks: int) -> OdometryReading:
        """
        Calculates incremental position and speed from new tick counts.
        """
        now = time.time()
        dt = max(0.001, now - self.last_time)
        self.last_time = now

        delta_left_ticks = current_left_ticks - self.last_left_ticks
        delta_right_ticks = current_right_ticks - self.last_right_ticks

        self.last_left_ticks = current_left_ticks
        self.last_right_ticks = current_right_ticks

        # Distance traveled by each wheel
        d_left = delta_left_ticks * self.mm_per_tick
        d_right = delta_right_ticks * self.mm_per_tick
        d_center = (d_left + d_right) / 2.0
        d_theta = (d_right - d_left) / self.track_width_mm

        # Update pose
        self.x += d_center * math.cos(self.theta + d_theta / 2.0)
        self.y += d_center * math.sin(self.theta + d_theta / 2.0)
        self.theta = (self.theta + d_theta) % (2.0 * math.pi)

        linear_speed = d_center / dt
        angular_speed = math.degrees(d_theta) / dt

        reading = OdometryReading(
            x_mm=round(self.x, 2),
            y_mm=round(self.y, 2),
            theta_deg=round(math.degrees(self.theta), 2),
            linear_speed_mm_s=round(linear_speed, 2),
            angular_speed_deg_s=round(angular_speed, 2),
            left_distance_mm=round(current_left_ticks * self.mm_per_tick, 2),
            right_distance_mm=round(current_right_ticks * self.mm_per_tick, 2),
            timestamp=now
        )
        self.last_reading = reading
        return reading

    def get_telemetry_payload(self) -> Dict[str, Any]:
        """Telemetry representation."""
        if not self.last_reading:
            return {"x_mm": 0.0, "y_mm": 0.0, "theta_deg": 0.0, "speed_mm_s": 0.0, "timestamp": time.time()}
        return {
            "x_mm": self.last_reading.x_mm,
            "y_mm": self.last_reading.y_mm,
            "theta_deg": self.last_reading.theta_deg,
            "speed_mm_s": self.last_reading.linear_speed_mm_s,
            "timestamp": self.last_reading.timestamp
        }
