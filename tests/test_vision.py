"""
tests/test_vision.py - Unit tests for Computer Vision Modules
"""

import unittest
import time
from computer_vision.qr_detection import QRDetector
from computer_vision.color_detection import ColorDetector
from computer_vision.shape_detection import ShapeDetector
from computer_vision.motion_tracking import MotionTracker


class TestVision(unittest.TestCase):
    def test_qr_ipv4_extraction(self):
        detector = QRDetector()
        
        # Test valid IPv4 payloads
        res1 = detector.parse_text_payload("http://192.168.4.1/api/ping")
        self.assertEqual(res1.ipv4_address, "192.168.4.1")

        res2 = detector.parse_text_payload("CRATE_SERVER:10.0.0.42;ZONE=B")
        self.assertEqual(res2.ipv4_address, "10.0.0.42")

        # Test invalid payload
        res3 = detector.parse_text_payload("NO_IP_HERE_PLAIN_TEXT")
        self.assertIsNone(res3.ipv4_address)

    def test_color_detector_instantiation(self):
        cd = ColorDetector()
        self.assertIn("Red", cd.COLOR_RANGES)
        self.assertIn("Green", cd.COLOR_RANGES)
        self.assertIn("Blue", cd.COLOR_RANGES)

    def test_shape_detector_instantiation(self):
        sd = ShapeDetector()
        self.assertGreater(sd.MIN_CONTOUR_AREA, 0)

    def test_motion_tracker_initial_state(self):
        mt = MotionTracker(target_duration_s=5.0)
        self.assertEqual(mt.target_duration_s, 5.0)
        self.assertFalse(mt.task_passed)
        self.assertFalse(mt.is_tracking)


if __name__ == "__main__":
    unittest.main()
