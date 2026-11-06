"""
tests/test_motor.py - Unit tests for Motor Controller
"""

import unittest
from motor_control.motor_controller import MotorController


class TestMotor(unittest.TestCase):
    def test_drive_commands(self):
        mc = MotorController()

        # Forward
        cmd = mc.forward(speed=200)
        self.assertEqual(cmd.direction, "forward")
        self.assertEqual(cmd.left_pwm, 200)
        self.assertEqual(cmd.right_pwm, 200)

        # Left Pivot Turn
        cmd = mc.turn_left(speed=150)
        self.assertEqual(cmd.direction, "left")
        self.assertEqual(cmd.left_pwm, -150)
        self.assertEqual(cmd.right_pwm, 150)

        # Stop
        cmd = mc.stop()
        self.assertEqual(cmd.direction, "stop")
        self.assertEqual(cmd.left_pwm, 0)
        self.assertEqual(cmd.right_pwm, 0)

    def test_drive_lock_enforcement(self):
        mc = MotorController()
        mc.set_drive_lock(True)

        # Teleop forward command must be blocked
        cmd = mc.forward(speed=200, is_autonomous=False)
        self.assertEqual(cmd.direction, "stop")
        self.assertEqual(cmd.left_pwm, 0)
        self.assertTrue(cmd.drive_locked)

        # Autonomous override is permitted
        cmd = mc.forward(speed=120, is_autonomous=True)
        self.assertEqual(cmd.direction, "forward")
        self.assertEqual(cmd.left_pwm, 120)


if __name__ == "__main__":
    unittest.main()
