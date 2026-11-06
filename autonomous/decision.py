"""
autonomous/decision.py - Mission Decision & State Machine
URRT Rulebook V1.3 Table 7 Compliant (20 Marks for Control Mode & Drive Lock)
Features:
- Teleop (×1 Multiplier) vs Autonomous (×4 Multiplier) Modes
- Referee Declaration Verification
- Hardware/Software Drive Interlock Enforcement
- Mission Stage Progression
"""

import time
from enum import Enum
from typing import Dict, Any, Optional


class ControlMode(str, Enum):
    TELEOP = "teleop"
    AUTONOMOUS = "autonomous"


class MissionState(str, Enum):
    IDLE = "IDLE"
    DECLARED_TO_REFEREE = "DECLARED_TO_REFEREE"
    AUTONOMOUS_NAVIGATING = "AUTONOMOUS_NAVIGATING"
    CRATE_TARGET_LOCKED = "CRATE_TARGET_LOCKED"
    EXECUTING_TASKS = "EXECUTING_TASKS"
    MISSION_SUCCESS = "MISSION_SUCCESS"
    EMERGENCY_HALT = "EMERGENCY_HALT"


class MissionStateMachine:
    """
    Finite state machine managing mission progression, scoring multiplier,
    and drive locking rules mandated by URRT Table 7 (20 marks).
    """

    def __init__(self):
        self.mode = ControlMode.TELEOP
        self.state = MissionState.IDLE
        self.referee_declaration_timestamp: Optional[float] = None
        self.state_entry_time = time.time()
        self.drive_locked = False
        self.last_event = "System initialized in Teleoperation mode."

    def set_mode(self, new_mode: ControlMode, referee_declared: bool = False) -> Dict[str, Any]:
        """
        Switch robot control mode.
        If Autonomous mode is set, drive controls are strictly locked.
        """
        if new_mode == ControlMode.AUTONOMOUS:
            if not referee_declared:
                return {
                    "success": False,
                    "error": "Referee declaration required before initiating Autonomous mode (×4).",
                    "mode": self.mode.value,
                    "drive_locked": self.drive_locked
                }
            self.mode = ControlMode.AUTONOMOUS
            self.drive_locked = True
            self.referee_declaration_timestamp = time.time()
            self.transition_to(MissionState.DECLARED_TO_REFEREE, "Autonomous mode declared to referee. Manual drive locked.")
        else:
            self.mode = ControlMode.TELEOP
            self.drive_locked = False
            self.referee_declaration_timestamp = None
            self.transition_to(MissionState.IDLE, "Switched to Teleoperation mode (×1). Manual drive unlocked.")

        return {
            "success": True,
            "mode": self.mode.value,
            "multiplier": 4 if self.mode == ControlMode.AUTONOMOUS else 1,
            "drive_locked": self.drive_locked,
            "state": self.state.value,
            "timestamp": time.time()
        }

    def transition_to(self, new_state: MissionState, reason: str = ""):
        """State transition handler."""
        self.state = new_state
        self.state_entry_time = time.time()
        self.last_event = reason or f"Transitioned to {new_state.value}"

    def trigger_estop(self, reason: str = "Operator E-Stop triggered"):
        """Emergency stop: locks motors, drops to safe state."""
        self.transition_to(MissionState.EMERGENCY_HALT, reason)
        self.drive_locked = True
        self.mode = ControlMode.TELEOP

    def reset_estop(self):
        """Clear E-Stop condition back to safe IDLE state."""
        self.transition_to(MissionState.IDLE, "E-Stop cleared by operator.")
        self.drive_locked = False

    def can_manual_drive(self) -> bool:
        """
        URRT Rulebook Table 7 Compliance:
        Manual teleoperation drive is strictly prohibited when in Autonomous mode
        or under Emergency Stop.
        """
        if self.state == MissionState.EMERGENCY_HALT:
            return False
        if self.mode == ControlMode.AUTONOMOUS:
            return False
        return not self.drive_locked

    def get_status_dict(self) -> Dict[str, Any]:
        """Telemetry state serialization."""
        return {
            "mode": self.mode.value,
            "multiplier": 4 if self.mode == ControlMode.AUTONOMOUS else 1,
            "state": self.state.value,
            "drive_locked": self.drive_locked,
            "can_manual_drive": self.can_manual_drive(),
            "last_event": self.last_event,
            "state_duration_s": round(time.time() - self.state_entry_time, 2),
            "timestamp": time.time()
        }
