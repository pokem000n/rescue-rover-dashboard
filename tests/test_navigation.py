"""
tests/test_navigation.py - Unit tests for Navigation Controller
"""

import unittest
from autonomous.navigation import NavigationController


class TestNavigation(unittest.TestCase):
    def setUp(self):
        self.nav = NavigationController()

    def test_target_zone_boundaries(self):
        # 100mm is right in the 80-120mm target zone
        self.assertTrue(self.nav.is_target_zone_locked(100.0))
        self.assertTrue(self.nav.is_target_zone_locked(80.0))
        self.assertTrue(self.nav.is_target_zone_locked(120.0))

        # Outside target zone
        self.assertFalse(self.nav.is_target_zone_locked(79.0))
        self.assertFalse(self.nav.is_target_zone_locked(121.0))

    def test_sonar_evaluation_stop(self):
        # In zone -> stop command
        direction, left, right = self.nav.evaluate_sonar_target(95.0)
        self.assertEqual(direction, "stop")
        self.assertEqual(left, 0)
        self.assertEqual(right, 0)
        self.assertTrue(self.nav.in_target_zone)

    def test_sonar_evaluation_approach(self):
        # Approaching zone (e.g. 200mm) -> forward
        direction, left, right = self.nav.evaluate_sonar_target(200.0)
        self.assertEqual(direction, "forward")
        self.assertGreater(left, 0)
        self.assertFalse(self.nav.in_target_zone)

    def test_critical_stop(self):
        # < 70mm -> emergency stop
        direction, left, right = self.nav.evaluate_sonar_target(50.0)
        self.assertEqual(direction, "stop")
        self.assertEqual(left, 0)
        self.assertFalse(self.nav.in_target_zone)


if __name__ == "__main__":
    unittest.main()
