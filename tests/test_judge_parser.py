import pytest

from backend_or_api.app.judges.verdict_parser import parse_judge_verdict


def test_parse_plain_json() -> None:
    raw = '{"passed": true, "score": 0.9, "feedback": "ok"}'
    v = parse_judge_verdict(raw)
    assert v.passed is True
    assert v.score == 0.9
    assert v.feedback == "ok"


def test_parse_fenced_json() -> None:
    raw = '```json\n{"passed": false, "score": 0.2, "feedback": "weak"}\n```'
    v = parse_judge_verdict(raw)
    assert v.passed is False
    assert v.score == 0.2


def test_invalid_json_raises() -> None:
    with pytest.raises(Exception):
        parse_judge_verdict("not json")
