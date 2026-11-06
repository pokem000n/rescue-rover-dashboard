"""
tests/test_safety.py - Unit tests for Safety & Interlock Controller
"""

import unittest
import time
from autonomous.safety import SafetyController
from autonomous.decision import MissionStateMachine, ControlMode


class TestSafety(unittest.TestCase):
    def test_estop_interlock(self):
        safety = SafetyController()
        self.assertFalse(safety.estop_active)

        allowed, _ = safety.evaluate_motion_command(is_manual_command=True)
        self.assertTrue(allowed)

        # Trigger E-Stop
        safety.trigger_estop("Operator E-Stop")
        self.assertTrue(safety.estop_active)

        allowed, reason = safety.evaluate_motion_command(is_manual_command=True)
        self.assertFalse(allowed)
        self.assertIn("E-Stop active", reason)

        # Release E-Stop
        safety.release_estop()
        self.assertFalse(safety.estop_active)

    def test_autonomous_drive_lock(self):
        fsm = MissionStateMachine()
        self.assertTrue(fsm.can_manual_drive())

        # Cannot switch to autonomous without referee declaration
        res = fsm.set_mode(ControlMode.AUTONOMOUS, referee_declared=False)
        self.assertFalse(res["success"])
        self.assertTrue(fsm.can_manual_drive())

        # Switch with referee declaration
        res = fsm.set_mode(ControlMode.AUTONOMOUS, referee_declared=True)
        self.assertTrue(res["success"])
        self.assertEqual(res["multiplier"], 4)
        self.assertTrue(res["drive_locked"])
        self.assertFalse(fsm.can_manual_drive())


if __name__ == "__main__":
    unittest.main()
