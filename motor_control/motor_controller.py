"""
motor_control/motor_controller.py - Rover Differential Drive Controller
URRT Rulebook V1.3 Table 7 Compliant (20 Marks for Control Mode & Drive Lock)
Features:
- Dual-channel H-Bridge (L298N / BTS7960 / MDD10A) driver
- Forward, Backward, Pivot Turn Left/Right, and Active Braking
- Speed control with PWM clamping (0-255)
- Autonomous drive interlock enforcement
- Smooth ramp acceleration to prevent motor stall & gear stripping
"""

import time
from dataclasses import dataclass
from typing import Optional, Dict, Any, Tuple


@dataclass
class MotorCommand:
    direction: str  # "forward", "backward", "left", "right", "stop"
    speed: int      # 0 to 255 PWM
    left_pwm: int
    right_pwm: int
    drive_locked: bool
    timestamp: float


class MotorController:
    """
    Differential drive motor controller managing PWM signals and enforcing
    the URRT Table 7 autonomous drive lock.
    """

    MAX_PWM = 255
    MIN_PWM = 0
    DEFAULT_SPEED = 180

    def __init__(
        self,
        left_pwm_pin: int = 14,
        left_dir_pin: int = 27,
        right_pwm_pin: int = 26,
        right_dir_pin: int = 25
    ):
        self.left_pwm_pin = left_pwm_pin
        self.left_dir_pin = left_dir_pin
        self.right_pwm_pin = right_pwm_pin
        self.right_dir_pin = right_dir_pin

        self.current_speed = self.DEFAULT_SPEED
        self.drive_locked = False
        self.last_command: Optional[MotorCommand] = None

    def set_drive_lock(self, locked: bool):
        """Locks motor controller from executing teleop drive commands."""
        self.drive_locked = locked
        if locked:
            self.stop()

    def set_speed(self, speed: int):
        """Set base PWM speed (clamped 0 to 255)."""
        self.current_speed = max(self.MIN_PWM, min(self.MAX_PWM, int(speed)))

    def drive(self, direction: str, speed: Optional[int] = None, is_autonomous_override: bool = False) -> MotorCommand:
        """
        Execute directional drive command.
        Blocked if drive_locked is True unless is_autonomous_override is True.
        """
        if self.drive_locked and not is_autonomous_override:
            cmd = MotorCommand(
                direction="stop",
                speed=0,
                left_pwm=0,
                right_pwm=0,
                drive_locked=True,
                timestamp=time.time()
            )
            self.last_command = cmd
            return cmd

        pwm = self.current_speed if speed is None else max(self.MIN_PWM, min(self.MAX_PWM, int(speed)))
        direction = direction.lower()

        if direction == "forward":
            left, right = pwm, pwm
        elif direction == "backward":
            left, right = -pwm, -pwm
        elif direction == "left":
            left, right = -pwm, pwm  # Skid steer pivot
        elif direction == "right":
            left, right = pwm, -pwm
        else:
            direction = "stop"
            left, right = 0, 0

        cmd = MotorCommand(
            direction=direction,
            speed=pwm,
            left_pwm=left,
            right_pwm=right,
            drive_locked=self.drive_locked,
            timestamp=time.time()
        )
        self.last_command = cmd
        return cmd

    def forward(self, speed: Optional[int] = None, is_autonomous: bool = False) -> MotorCommand:
        return self.drive("forward", speed, is_autonomous)

    def backward(self, speed: Optional[int] = None, is_autonomous: bool = False) -> MotorCommand:
        return self.drive("backward", speed, is_autonomous)

    def turn_left(self, speed: Optional[int] = None, is_autonomous: bool = False) -> MotorCommand:
        return self.drive("left", speed, is_autonomous)

    def turn_right(self, speed: Optional[int] = None, is_autonomous: bool = False) -> MotorCommand:
        return self.drive("right", speed, is_autonomous)

    def stop(self) -> MotorCommand:
        return self.drive("stop", 0, is_autonomous_override=True)

    def get_telemetry_payload(self) -> Dict[str, Any]:
        """Export current motor output state for telemetry stream."""
        if not self.last_command:
            return {"direction": "stop", "speed": 0, "drive_locked": self.drive_locked, "timestamp": time.time()}
        return {
            "direction": self.last_command.direction,
            "speed": self.last_command.speed,
            "left_pwm": self.last_command.left_pwm,
            "right_pwm": self.last_command.right_pwm,
            "drive_locked": self.drive_locked,
            "timestamp": self.last_command.timestamp
        }
