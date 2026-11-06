"""
tests/test_sensors.py - Unit tests for Sensor Drivers
"""

import unittest
from sensors.ultrasonic import UltrasonicSensor
from sensors.imu import IMUSensor
from sensors.encoder import WheelEncoder


class TestSensors(unittest.TestCase):
    def test_ultrasonic_filtering_and_target_zone(self):
        sensor = UltrasonicSensor(filter_window=3)
        
        # Test median filtering across 3 samples: [100, 300 (spike), 105] -> median ~105
        sensor.ingest_reading(100.0)
        sensor.ingest_reading(300.0)
        reading = sensor.ingest_reading(105.0)

        self.assertEqual(reading.filtered_distance_mm, 105.0)
        self.assertTrue(reading.in_target_zone)
        self.assertFalse(reading.is_critical_close)

    def test_ultrasonic_critical_close(self):
        sensor = UltrasonicSensor(filter_window=1)
        reading = sensor.ingest_reading(45.0)
        self.assertTrue(reading.is_critical_close)
        self.assertFalse(reading.in_target_zone)

    def test_imu_tilt_danger(self):
        imu = IMUSensor()
        # Normal flat position
        r1 = imu.update(ax=0.0, ay=0.0, az=1.0, gx=0.0, gy=0.0, gz=0.0)
        self.assertFalse(r1.is_tilt_danger)

        # High tilt angle on steep incline (ax = 0.9g, az = 0.1g)
        imu_tilted = IMUSensor()
        r2 = imu_tilted.update(ax=0.9, ay=0.0, az=0.1, gx=0.0, gy=0.0, gz=0.0)
        self.assertTrue(r2.is_tilt_danger)

    def test_encoder_odometry(self):
        encoder = WheelEncoder(wheel_diameter_mm=65.0, track_width_mm=200.0, ticks_per_revolution=360)
        # 360 ticks forward on both wheels = 1 full revolution = pi * 65mm ~ 204.2mm
        reading = encoder.update(current_left_ticks=360, current_right_ticks=360)
        self.assertAlmostEqual(reading.x_mm, 204.2, delta=1.0)
        self.assertAlmostEqual(reading.theta_deg, 0.0, delta=1.0)


if __name__ == "__main__":
    unittest.main()
