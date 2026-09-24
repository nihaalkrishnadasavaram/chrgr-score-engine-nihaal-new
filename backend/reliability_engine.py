"""
Chrgr Reliability Score Engine
--------------------------------
Converts raw driver check-ins into a single, trustworthy reliability score
for a charger, using exponential time decay so recent check-ins matter more
than old ones, plus a confidence rating based on check-in volume.

Author: Nihaal Krishna Dasavaram
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional


class CheckinResult(str, Enum):
    WORKED = "worked"
    FAILED = "failed"


class Confidence(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass(frozen=True)
class Checkin:
    """A single driver check-in for a charger."""
    result: CheckinResult
    timestamp: datetime  # must be timezone-aware (UTC)

    def __post_init__(self):
        if self.timestamp.tzinfo is None:
            raise ValueError("Checkin.timestamp must be timezone-aware (UTC)")


class ReliabilityScoreEngine:
    """
    Computes a reliability score (0-100) for a charger from its check-in
    history, applying exponential time decay and a volume-based confidence
    rating.

    weight(t) = e^(-lambda * t)   where t = hours since check-in

    score = 100 * (sum of weights for 'worked' check-ins)
                  / (sum of weights for all check-ins)

    Confidence thresholds (by total check-in count) are configurable via
    `confidence_thresholds`; defaults are:
        >= 20 check-ins -> high
        >= 5  check-ins -> medium
        <  5  check-ins -> low
        0 check-ins     -> low (score defaults to None)
    """

    def __init__(
        self,
        decay_constant: float = 0.02,
        confidence_thresholds: tuple[int, int] = (5, 20),
    ):
        if decay_constant <= 0:
            raise ValueError("decay_constant must be positive")
        low_med, med_high = confidence_thresholds
        if not (0 < low_med < med_high):
            raise ValueError(
                "confidence_thresholds must satisfy 0 < low_med < med_high"
            )
        self.decay_constant = decay_constant
        self._low_med_threshold = low_med
        self._med_high_threshold = med_high

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def compute(
        self,
        checkins: List[Checkin],
        as_of: Optional[datetime] = None,
    ) -> dict:
        """
        Compute the reliability score for a charger.

        Args:
            checkins: list of Checkin objects (any order).
            as_of: reference "now" for decay calculations. Defaults to the
                   current UTC time. Useful for deterministic tests/sims.

        Returns:
            {
                "score": int | None,        # 0-100, None if zero check-ins
                "confidence": "high"|"medium"|"low",
                "total_checkins": int,
                "last_checkin": str | None  # ISO8601 timestamp
            }
        """
        as_of = as_of or datetime.now(timezone.utc)

        if not checkins:
            return {
                "score": None,
                "confidence": Confidence.LOW.value,
                "total_checkins": 0,
                "last_checkin": None,
            }

        self._validate_checkins(checkins, as_of)

        weighted_success = 0.0
        weighted_total = 0.0
        latest = checkins[0].timestamp

        for c in checkins:
            hours_elapsed = (as_of - c.timestamp).total_seconds() / 3600.0
            # Clamp to avoid negative-time blowups from near-simultaneous
            # clock skew; true future timestamps are rejected above.
            hours_elapsed = max(hours_elapsed, 0.0)
            w = math.exp(-self.decay_constant * hours_elapsed)

            weighted_total += w
            if c.result == CheckinResult.WORKED:
                weighted_success += w

            if c.timestamp > latest:
                latest = c.timestamp

        # weighted_total is guaranteed > 0 here since decay weights are
        # always positive for a non-empty list.
        raw_score = 100.0 * (weighted_success / weighted_total)
        score = round(raw_score)

        return {
            "score": score,
            "confidence": self._confidence(len(checkins)).value,
            "total_checkins": len(checkins),
            "last_checkin": latest.isoformat(),
        }

    # ------------------------------------------------------------------ #
    # Internals
    # ------------------------------------------------------------------ #

    def _confidence(self, total_checkins: int) -> Confidence:
        if total_checkins >= self._med_high_threshold:
            return Confidence.HIGH
        if total_checkins >= self._low_med_threshold:
            return Confidence.MEDIUM
        return Confidence.LOW

    @staticmethod
    def _validate_checkins(checkins: List[Checkin], as_of: datetime) -> None:
        for c in checkins:
            if not isinstance(c, Checkin):
                raise TypeError(f"Expected Checkin, got {type(c)}")
            if c.timestamp > as_of:
                raise ValueError(
                    f"Check-in timestamp {c.timestamp.isoformat()} is in the "
                    f"future relative to as_of={as_of.isoformat()}"
                )
