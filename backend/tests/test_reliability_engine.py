"""
Test suite for the Chrgr Reliability Score Engine.

Covers: zero check-ins, all-pass, all-fail, mixed old/recent data,
duplicate timestamps, future timestamps, invalid data, and confidence
thresholds.
"""

from datetime import datetime, timedelta, timezone

import pytest

from reliability_engine import (
    Checkin,
    CheckinResult,
    Confidence,
    ReliabilityScoreEngine,
)

NOW = datetime(2026, 9, 24, 12, 0, 0, tzinfo=timezone.utc)


def hours_ago(h: float, result: CheckinResult = CheckinResult.WORKED) -> Checkin:
    return Checkin(result=result, timestamp=NOW - timedelta(hours=h))


@pytest.fixture
def engine():
    return ReliabilityScoreEngine(decay_constant=0.02)


# --------------------------------------------------------------------- #
# Zero check-ins
# --------------------------------------------------------------------- #

class TestZeroCheckins:
    def test_zero_checkins_returns_none_score(self, engine):
        result = engine.compute([], as_of=NOW)
        assert result["score"] is None

    def test_zero_checkins_confidence_is_low(self, engine):
        result = engine.compute([], as_of=NOW)
        assert result["confidence"] == Confidence.LOW.value

    def test_zero_checkins_total_is_zero(self, engine):
        result = engine.compute([], as_of=NOW)
        assert result["total_checkins"] == 0

    def test_zero_checkins_last_checkin_is_none(self, engine):
        result = engine.compute([], as_of=NOW)
        assert result["last_checkin"] is None


# --------------------------------------------------------------------- #
# All-pass check-ins
# --------------------------------------------------------------------- #

class TestAllPass:
    def test_all_pass_score_is_100(self, engine):
        checkins = [hours_ago(h) for h in [1, 5, 10, 24, 48]]
        result = engine.compute(checkins, as_of=NOW)
        assert result["score"] == 100

    def test_all_pass_single_checkin(self, engine):
        result = engine.compute([hours_ago(0.5)], as_of=NOW)
        assert result["score"] == 100

    def test_all_pass_many_old_checkins_still_100(self, engine):
        checkins = [hours_ago(h) for h in range(1, 200, 5)]
        result = engine.compute(checkins, as_of=NOW)
        assert result["score"] == 100


# --------------------------------------------------------------------- #
# All-fail check-ins
# --------------------------------------------------------------------- #

class TestAllFail:
    def test_all_fail_score_is_0(self, engine):
        checkins = [hours_ago(h, CheckinResult.FAILED) for h in [1, 5, 10, 24]]
        result = engine.compute(checkins, as_of=NOW)
        assert result["score"] == 0

    def test_all_fail_single_checkin(self, engine):
        result = engine.compute(
            [hours_ago(2, CheckinResult.FAILED)], as_of=NOW
        )
        assert result["score"] == 0


# --------------------------------------------------------------------- #
# Mixed old + recent data (time decay behavior)
# --------------------------------------------------------------------- #

class TestTimeDecay:
    def test_recent_failure_outweighs_old_successes(self, engine):
        checkins = (
            [hours_ago(h, CheckinResult.WORKED) for h in [500, 600, 700]]
            + [hours_ago(0.1, CheckinResult.FAILED)]
        )
        result = engine.compute(checkins, as_of=NOW)
        assert result["score"] < 20

    def test_recent_success_outweighs_old_failures(self, engine):
        checkins = (
            [hours_ago(h, CheckinResult.FAILED) for h in [500, 600, 700]]
            + [hours_ago(0.1, CheckinResult.WORKED)]
        )
        result = engine.compute(checkins, as_of=NOW)
        assert result["score"] > 80

    def test_equal_recent_mix_near_50(self, engine):
        checkins = [
            hours_ago(1, CheckinResult.WORKED),
            hours_ago(1, CheckinResult.FAILED),
        ]
        result = engine.compute(checkins, as_of=NOW)
        assert 45 <= result["score"] <= 55

    def test_higher_decay_constant_forgets_faster(self):
        checkins = [
            hours_ago(200, CheckinResult.FAILED),
            hours_ago(0.5, CheckinResult.WORKED),
        ]
        slow_decay = ReliabilityScoreEngine(decay_constant=0.001)
        fast_decay = ReliabilityScoreEngine(decay_constant=0.1)

        slow_result = slow_decay.compute(checkins, as_of=NOW)
        fast_result = fast_decay.compute(checkins, as_of=NOW)

        # Faster decay should forget the old failure more, pushing score up
        assert fast_result["score"] >= slow_result["score"]


# --------------------------------------------------------------------- #
# Duplicate timestamps
# --------------------------------------------------------------------- #

class TestDuplicateTimestamps:
    def test_duplicate_timestamps_all_counted(self, engine):
        ts = NOW - timedelta(hours=2)
        checkins = [
            Checkin(CheckinResult.WORKED, ts),
            Checkin(CheckinResult.WORKED, ts),
            Checkin(CheckinResult.FAILED, ts),
        ]
        result = engine.compute(checkins, as_of=NOW)
        assert result["total_checkins"] == 3
        # 2 worked / 1 failed at identical weight -> ~66.7 -> rounds to 67
        assert result["score"] == 67

    def test_duplicate_timestamps_preserved_as_last_checkin(self, engine):
        ts = NOW - timedelta(hours=3)
        checkins = [Checkin(CheckinResult.WORKED, ts)] * 4
        result = engine.compute(checkins, as_of=NOW)
        assert result["last_checkin"] == ts.isoformat()


# --------------------------------------------------------------------- #
# Future timestamps / invalid data
# --------------------------------------------------------------------- #

class TestInvalidData:
    def test_future_timestamp_raises(self, engine):
        future = Checkin(CheckinResult.WORKED, NOW + timedelta(hours=1))
        with pytest.raises(ValueError):
            engine.compute([future], as_of=NOW)

    def test_naive_timestamp_raises_on_construction(self):
        with pytest.raises(ValueError):
            Checkin(CheckinResult.WORKED, datetime(2026, 9, 24, 12, 0, 0))

    def test_non_checkin_item_raises_type_error(self, engine):
        with pytest.raises(TypeError):
            engine.compute(["not a checkin"], as_of=NOW)  # type: ignore

    def test_invalid_decay_constant_raises(self):
        with pytest.raises(ValueError):
            ReliabilityScoreEngine(decay_constant=0)
        with pytest.raises(ValueError):
            ReliabilityScoreEngine(decay_constant=-1)

    def test_invalid_confidence_thresholds_raises(self):
        with pytest.raises(ValueError):
            ReliabilityScoreEngine(confidence_thresholds=(20, 5))
        with pytest.raises(ValueError):
            ReliabilityScoreEngine(confidence_thresholds=(0, 5))


# --------------------------------------------------------------------- #
# Confidence thresholds
# --------------------------------------------------------------------- #

class TestConfidenceThresholds:
    def test_below_low_med_threshold_is_low(self, engine):
        checkins = [hours_ago(1) for _ in range(4)]  # default low_med=5
        result = engine.compute(checkins, as_of=NOW)
        assert result["confidence"] == Confidence.LOW.value

    def test_at_low_med_threshold_is_medium(self, engine):
        checkins = [hours_ago(1) for _ in range(5)]
        result = engine.compute(checkins, as_of=NOW)
        assert result["confidence"] == Confidence.MEDIUM.value

    def test_between_thresholds_is_medium(self, engine):
        checkins = [hours_ago(1) for _ in range(19)]
        result = engine.compute(checkins, as_of=NOW)
        assert result["confidence"] == Confidence.MEDIUM.value

    def test_at_med_high_threshold_is_high(self, engine):
        checkins = [hours_ago(1) for _ in range(20)]
        result = engine.compute(checkins, as_of=NOW)
        assert result["confidence"] == Confidence.HIGH.value

    def test_well_above_threshold_is_high(self, engine):
        checkins = [hours_ago(h) for h in range(1, 101)]
        result = engine.compute(checkins, as_of=NOW)
        assert result["confidence"] == Confidence.HIGH.value

    def test_custom_thresholds_respected(self):
        engine = ReliabilityScoreEngine(confidence_thresholds=(2, 10))
        result = engine.compute([hours_ago(1), hours_ago(2)], as_of=NOW)
        assert result["confidence"] == Confidence.MEDIUM.value


# --------------------------------------------------------------------- #
# Output shape / metadata
# --------------------------------------------------------------------- #

class TestOutputShape:
    def test_output_has_all_required_keys(self, engine):
        result = engine.compute([hours_ago(1)], as_of=NOW)
        assert set(result.keys()) == {
            "score",
            "confidence",
            "total_checkins",
            "last_checkin",
        }

    def test_score_is_integer(self, engine):
        result = engine.compute([hours_ago(1)], as_of=NOW)
        assert isinstance(result["score"], int)

    def test_last_checkin_picks_most_recent(self, engine):
        checkins = [hours_ago(50), hours_ago(1), hours_ago(200)]
        result = engine.compute(checkins, as_of=NOW)
        expected = (NOW - timedelta(hours=1)).isoformat()
        assert result["last_checkin"] == expected

    def test_default_as_of_uses_now(self, engine):
        checkins = [
            Checkin(CheckinResult.WORKED, datetime.now(timezone.utc) - timedelta(hours=1))
        ]
        result = engine.compute(checkins)
        assert result["score"] == 100
