"""
URRT Autonomous Rover - Motor Control Package
Compliant with URRT Rulebook V1.3 Table 7 (Drive Controls & Autonomous Lock)
"""

from .motor_controller import MotorController, MotorCommand

__all__ = ["MotorController", "MotorCommand"]
