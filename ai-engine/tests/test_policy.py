import shutil
from pathlib import Path

from app.tools import lookup_policy as lp
from tests.conftest import make_api

SAMPLE = Path(lp.KNOWLEDGE_DIR) / "_sample.md"


def _dir_with_topic(tmp_path: Path) -> Path:
    shutil.copy(SAMPLE, tmp_path / "holding.md")
    return tmp_path


def test_sample_not_a_topic():
    assert SAMPLE not in lp.knowledge_files()
    assert lp.load_topic("sample_topic") is None


def test_a5_substitute_vars():
    terms = {"amount": 2000000, "holdHours": 48}
    out, missing = lp.substitute("Cọc {holding_deposit}, giữ {hold_hours} giờ", terms)
    assert out == "Cọc 2.000.000, giữ 48 giờ" and missing == []


def test_a5_missing_params_never_guessed():
    out, missing = lp.substitute("{hold_hours} giờ, từ {hold_hours_min} đến {hold_hours_max}", {"holdHours": 24})
    assert missing == ["hold_hours_min", "hold_hours_max"]
    assert "{hold_hours_min}" in out and out.startswith("24 giờ")
    _, missing_all = lp.substitute("{holding_deposit}", None)
    assert missing_all == ["holding_deposit"]


async def test_a5_run_with_core_and_without(tmp_path, monkeypatch):
    monkeypatch.setattr(lp, "KNOWLEDGE_DIR", _dir_with_topic(tmp_path))
    res = await lp.run(make_api(), {"topic": "sample_topic"})
    assert "2.000.000" in res["markdown"] and "48" in res["markdown"]
    assert res["missing_params"] == ["hold_hours_min", "hold_hours_max"]  # API chưa có min/max
    down = await lp.run(make_api(fail=True), {"topic": "sample_topic"})
    assert set(down["missing_params"]) == {"holding_deposit", "hold_hours", "hold_hours_min", "hold_hours_max"}
    assert (await lp.run(make_api(), {"topic": "nope"})) == {"error": "not_found"}
