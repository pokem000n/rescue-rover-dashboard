"""
sensors/imu.py - MPU-6050 / BNO055 Inertial Measurement Unit Driver
Features:
- 3-Axis Accelerometer + 3-Axis Gyroscope readings
- Complementary filter for Pitch, Roll, and Yaw estimation
- Critical tilt / rollover safety alert (> 45 degrees)
"""

import math
import time
from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class IMUReading:
    yaw: float    # degrees (-180 to +180)
    pitch: float  # degrees
    roll: float   # degrees
    accel_x: float
    accel_y: float
    accel_z: float
    gyro_x: float
    gyro_y: float
    gyro_z: float
    is_tilt_danger: bool
    timestamp: float


class IMUSensor:
    """
    IMU processor calculating filtered rover attitude and monitoring rollover risks.
    """

    CRITICAL_TILT_DEG = 45.0  # Safe slope threshold

    def __init__(self, alpha: float = 0.98):
        self.alpha = alpha  # Complementary filter weight (gyro vs accel)
        self.pitch = 0.0
        self.roll = 0.0
        self.yaw = 0.0
        self.last_update = time.time()
        self.last_reading: Optional[IMUReading] = None

    def update(self, ax: float, ay: float, az: float, gx: float, gy: float, gz: float) -> IMUReading:
        """
        Update attitude with raw accelerometer (g) and gyro (deg/s) inputs.
        """
        now = time.time()
        dt = max(0.001, min(0.1, now - self.last_update))
        self.last_update = now

        # Accelerometer tilt angles
        accel_pitch = math.degrees(math.atan2(-ax, math.sqrt(ay * ay + az * az)))
        accel_roll = math.degrees(math.atan2(ay, az))

        # Initial seed on first sample
        if self.last_reading is None:
            self.pitch = accel_pitch
            self.roll = accel_roll
        else:
            # Complementary filter: Combine integrated gyro with accelerometer tilt
            self.pitch = self.alpha * (self.pitch + gy * dt) + (1.0 - self.alpha) * accel_pitch
            self.roll = self.alpha * (self.roll + gx * dt) + (1.0 - self.alpha) * accel_roll
        self.yaw = (self.yaw + gz * dt) % 360.0
        if self.yaw > 180.0:
            self.yaw -= 360.0

        tilt_danger = (abs(self.pitch) > self.CRITICAL_TILT_DEG or abs(self.roll) > self.CRITICAL_TILT_DEG)

        reading = IMUReading(
            yaw=round(self.yaw, 2),
            pitch=round(self.pitch, 2),
            roll=round(self.roll, 2),
            accel_x=round(ax, 3),
            accel_y=round(ay, 3),
            accel_z=round(az, 3),
            gyro_x=round(gx, 2),
            gyro_y=round(gy, 2),
            gyro_z=round(gz, 2),
            is_tilt_danger=tilt_danger,
            timestamp=now
        )
        self.last_reading = reading
        return reading

    def get_telemetry_payload(self) -> Dict[str, Any]:
        """Telemetry serialization."""
        if not self.last_reading:
            return {"yaw": 0.0, "pitch": 0.0, "roll": 0.0, "tilt_danger": False, "timestamp": time.time()}
        return {
            "yaw": self.last_reading.yaw,
            "pitch": self.last_reading.pitch,
            "roll": self.last_reading.roll,
            "tilt_danger": self.last_reading.is_tilt_danger,
            "timestamp": self.last_reading.timestamp
        }
