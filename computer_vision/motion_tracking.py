"""
computer_vision/motion_tracking.py - 5-Second Continuous Motion Tracker
URRT Rulebook V1.3 Table 7 Compliant (Motion Tracking Task: 5.0s)
Tracks moving targets in camera feed continuously for at least 5.0 seconds
to achieve full marks in the Crate Motion Tracking trial.
"""

import time
from dataclasses import dataclass
from typing import Optional, Tuple, List, Dict, Any

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False


@dataclass
class MotionResult:
    is_moving: bool
    tracking_active: bool
    continuous_time_s: float
    target_time_s: float
    task_passed: bool
    centroid: Optional[Tuple[int, int]]
    timestamp: float


class MotionTracker:
    """
    Evaluates video stream for continuous motion across a required 5.0 second trial.
    """

    TARGET_DURATION_S = 5.0
    MOTION_THRESHOLD = 25
    MIN_CONTOUR_AREA = 800

    def __init__(self, target_duration_s: float = 5.0):
        self.target_duration_s = target_duration_s
        self.prev_gray = None
        self.motion_start_time: Optional[float] = None
        self.last_motion_time: Optional[float] = None
        self.is_tracking = False
        self.task_passed = False

    def reset(self):
        """Reset motion tracker trial."""
        self.prev_gray = None
        self.motion_start_time = None
        self.last_motion_time = None
        self.is_tracking = False
        self.task_passed = False

    def process_frame(self, frame) -> MotionResult:
        """
        Processes frame, updates motion duration, and evaluates 5.0s pass criterion.
        """
        now = time.time()

        if not CV2_AVAILABLE or frame is None:
            return MotionResult(
                is_moving=False,
                tracking_active=self.is_tracking,
                continuous_time_s=0.0,
                target_time_s=self.target_duration_s,
                task_passed=self.task_passed,
                centroid=None,
                timestamp=now
            )

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (21, 21), 0)

        if self.prev_gray is None:
            self.prev_gray = gray
            return MotionResult(
                is_moving=False,
                tracking_active=False,
                continuous_time_s=0.0,
                target_time_s=self.target_duration_s,
                task_passed=self.task_passed,
                centroid=None,
                timestamp=now
            )

        # Frame differencing
        frame_delta = cv2.absdiff(self.prev_gray, gray)
        thresh = cv2.threshold(frame_delta, self.MOTION_THRESHOLD, 255, cv2.THRESH_BINARY)[1]
        thresh = cv2.dilate(thresh, None, iterations=2)

        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        self.prev_gray = gray

        motion_detected = False
        centroid = None
        max_area = 0

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > self.MIN_CONTOUR_AREA and area > max_area:
                max_area = area
                motion_detected = True
                x, y, w, h = cv2.boundingRect(cnt)
                centroid = (int(x + w / 2), int(y + h / 2))

        # Evaluate continuous motion timeline
        if motion_detected:
            if not self.is_tracking:
                self.is_tracking = True
                self.motion_start_time = now
            self.last_motion_time = now
        else:
            # If motion drops for more than 0.8s, tracking trial breaks
            if self.is_tracking and self.last_motion_time and (now - self.last_motion_time > 0.8):
                if not self.task_passed:
                    self.is_tracking = False
                    self.motion_start_time = None

        continuous_s = 0.0
        if self.is_tracking and self.motion_start_time:
            continuous_s = now - self.motion_start_time
            if continuous_s >= self.target_duration_s:
                self.task_passed = True

        return MotionResult(
            is_moving=motion_detected,
            tracking_active=self.is_tracking,
            continuous_time_s=round(continuous_s, 2),
            target_time_s=self.target_duration_s,
            task_passed=self.task_passed,
            centroid=centroid,
            timestamp=now
        )
