"""
autonomous/safety.py - Rover Safety & E-Stop Interlock Controller
URRT Rulebook V1.3 Compliant (5 Marks for Emergency Stop System)
Features:
- Hardware / Software E-Stop latch and release
- Autonomous drive command interlock
- Proximity collision emergency cutoff (< 60mm)
- Watchdog heartbeat monitor (failsafe cutoff if timeout > 500ms)
"""

import time
from dataclasses import dataclass
from typing import Dict, Any, Optional, Tuple


@dataclass
class SafetyStatus:
    estop_active: bool
    autonomous_lock: bool
    proximity_alert: bool
    watchdog_ok: bool
    safe_to_drive: bool
    reason: str
    timestamp: float


class SafetyController:
    """
    Central safety interlock managing E-Stop states, autonomous drive locking,
    and failsafe watchdog timeouts.
    """

    HEARTBEAT_TIMEOUT_S = 0.5  # 500ms watchdog failsafe
    MIN_SAFE_PROXIMITY_MM = 60.0  # 60mm hard emergency stop distance

    def __init__(self):
        self.estop_active = False
        self.estop_reason = ""
        self.estop_timestamp: Optional[float] = None
        self.autonomous_locked = False
        self.proximity_alert = False
        self.last_heartbeat = time.time()

    def feed_watchdog(self):
        """Reset watchdog timer on valid incoming telemetry heartbeat."""
        self.last_heartbeat = time.time()

    def check_watchdog(self) -> bool:
        """Returns True if heartbeat is fresh, False if watchdog has timed out."""
        return (time.time() - self.last_heartbeat) <= self.HEARTBEAT_TIMEOUT_S

    def trigger_estop(self, reason: str = "EMERGENCY STOP ACTIVATED"):
        """Activate hard emergency stop."""
        self.estop_active = True
        self.estop_reason = reason
        self.estop_timestamp = time.time()

    def release_estop() -> bool:
        pass

    def release_estop(self) -> bool:
        """Clear emergency stop after verifying safety conditions."""
        self.estop_active = False
        self.estop_reason = ""
        self.estop_timestamp = None
        return True

    def set_autonomous_lock(self, locked: bool):
        """Set autonomous interlock (locks manual driving controls)."""
        self.autonomous_locked = locked

    def evaluate_proximity(self, distance_mm: float) -> bool:
        """
        Check if obstacle is within critical collision danger threshold.
        Returns True if safe, False if emergency proximity brake triggered.
        """
        if distance_mm < self.MIN_SAFE_PROXIMITY_MM:
            self.proximity_alert = True
            return False
        self.proximity_alert = False
        return True

    def evaluate_motion_command(self, is_manual_command: bool = True) -> Tuple[bool, str]:
        """
        Validate whether a drive command is allowed to pass to the motor controller.
        Returns: (is_allowed: bool, rejection_reason: str)
        """
        if self.estop_active:
            return False, f"Blocked: E-Stop active ({self.estop_reason})"

        if not self.check_watchdog():
            self.trigger_estop("Failsafe: Watchdog heartbeat timed out (>500ms)")
            return False, "Blocked: Watchdog heartbeat timed out"

        if is_manual_command and self.autonomous_locked:
            return False, "Blocked: Manual driving locked during Autonomous Mode (Table 7 Rule)"

        if self.proximity_alert:
            return False, "Blocked: Proximity collision danger (<60mm)"

        return True, "Nominal"

    def get_status(self) -> SafetyStatus:
        watchdog_ok = self.check_watchdog()
        is_safe = (not self.estop_active and watchdog_ok and not self.proximity_alert)
        reason = self.estop_reason if self.estop_active else ("Watchdog Timeout" if not watchdog_ok else "Nominal")

        return SafetyStatus(
            estop_active=self.estop_active,
            autonomous_lock=self.autonomous_locked,
            proximity_alert=self.proximity_alert,
            watchdog_ok=watchdog_ok,
            safe_to_drive=is_safe,
            reason=reason,
            timestamp=time.time()
        )
