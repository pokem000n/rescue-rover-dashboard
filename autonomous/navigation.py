"""
autonomous/navigation.py - Autonomous Navigation & Obstacle Avoidance Controller
URRT Rulebook V1.3 Compliant
Features:
- Ultrasonic-guided approach to Sensor Crate
- Strict 80mm - 120mm stop zone target locking
- Obstacle avoidance & vector steering
- Waypoint / Odometry navigation
"""

import math
import time
from dataclasses import dataclass
from typing import Optional, Tuple, Dict, Any


@dataclass
class Waypoint:
    x: float
    y: float
    heading: float = 0.0
    tolerance_mm: float = 50.0


class NavigationController:
    """
    Autonomous Navigation controller managing motion toward targets and
    enforcing the URRT Table 7 Sensor Crate stop zone (80 mm - 120 mm).
    """

    # Rulebook Crate Stop Zone Thresholds (in mm)
    TARGET_MIN_MM = 80.0
    TARGET_MAX_MM = 120.0
    CRITICAL_STOP_MM = 70.0
    CRITICAL_SLOW_MM = 250.0

    # Default PWM Speeds
    SPEED_FAST = 220
    SPEED_CRUISE = 170
    SPEED_APPROACH = 110
    SPEED_STOP = 0

    def __init__(self, target_distance_mm: float = 100.0):
        self.target_distance_mm = target_distance_mm
        self.current_x = 0.0
        self.current_y = 0.0
        self.current_yaw = 0.0  # degrees
        self.waypoints = []
        self.current_waypoint_idx = 0
        self.in_target_zone = False
        self.last_update_time = time.time()

        # PID parameters for distance approach
        self.kp_dist = 1.2
        self.kd_dist = 0.08
        self.prev_dist_error = 0.0

        # PID parameters for heading
        self.kp_head = 2.0
        self.prev_head_error = 0.0

    def update_odometry(self, delta_x: float, delta_y: float, yaw: float):
        """Update rover position estimate from encoders and IMU."""
        self.current_x += delta_x
        self.current_y += delta_y
        self.current_yaw = yaw

    def add_waypoint(self, x: float, y: float, heading: float = 0.0):
        """Add navigation waypoint."""
        self.waypoints.append(Waypoint(x=x, y=y, heading=heading))

    def evaluate_sonar_target(self, distance_mm: float) -> Tuple[str, int, int]:
        """
        Evaluate front ultrasonic sonar distance.
        Returns:
            (direction: str, left_speed: int, right_speed: int)
        """
        # 1. Critical proximity emergency stop
        if distance_mm < self.CRITICAL_STOP_MM:
            self.in_target_zone = False
            return "stop", 0, 0

        # 2. Perfect Target Stop Zone: 80mm - 120mm (Rulebook Table 7 Target)
        if self.TARGET_MIN_MM <= distance_mm <= self.TARGET_MAX_MM:
            self.in_target_zone = True
            return "stop", 0, 0

        # 3. Overshot target (too close, but > critical) -> Gentle reverse
        if distance_mm < self.TARGET_MIN_MM:
            self.in_target_zone = False
            return "backward", self.SPEED_APPROACH, self.SPEED_APPROACH

        # 4. Final Approach Zone (< 250mm) -> Creep forward carefully
        if distance_mm <= self.CRITICAL_SLOW_MM:
            self.in_target_zone = False
            error = distance_mm - self.target_distance_mm
            pwm = int(max(self.SPEED_APPROACH, min(self.SPEED_CRUISE, self.kp_dist * error)))
            return "forward", pwm, pwm

        # 5. Far distance -> Cruise forward
        self.in_target_zone = False
        return "forward", self.SPEED_CRUISE, self.SPEED_CRUISE

    def compute_obstacle_avoidance(self, front_mm: float, left_mm: float, right_mm: float) -> Tuple[str, int, int]:
        """
        Reactive obstacle avoidance behavior based on multi-directional sensor data.
        """
        if front_mm < self.CRITICAL_SLOW_MM:
            if left_mm > right_mm:
                # Pivot left
                return "left", self.SPEED_APPROACH, self.SPEED_APPROACH
            else:
                # Pivot right
                return "right", self.SPEED_APPROACH, self.SPEED_APPROACH

        return "forward", self.SPEED_CRUISE, self.SPEED_CRUISE

    def is_target_zone_locked(self, distance_mm: float) -> bool:
        """Check if rover is stably within the Table 7 80-120mm target zone."""
        return self.TARGET_MIN_MM <= distance_mm <= self.TARGET_MAX_MM

    def get_telemetry_dict(self) -> Dict[str, Any]:
        """Export navigation status for telemetry transmission."""
        return {
            "x": round(self.current_x, 2),
            "y": round(self.current_y, 2),
            "yaw": round(self.current_yaw, 2),
            "in_target_zone": self.in_target_zone,
            "target_min_mm": self.TARGET_MIN_MM,
            "target_max_mm": self.TARGET_MAX_MM,
            "active_waypoint": self.current_waypoint_idx,
            "timestamp": time.time(),
        }
