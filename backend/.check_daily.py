"""Temporary verification of the accumulating daily export file."""
import json
import tempfile
from pathlib import Path

import main


def record(mobile, attempt, score):
    return {
        "userId": f"u-{mobile}",
        "mobile": mobile,
        "attempt": attempt,
        "gameId": "number-wheel",
        "sector": "digital",
        "score": score,
        "winAmount": 0,
        "playedAt": "2026-08-29T12:00:00.000Z",
        "employeeCount": 50,
        "hasBenefits": True,
        "metadata": {"target": 123, "digits": [1, 2, 3]},
    }


with tempfile.TemporaryDirectory() as tmp:
    out = Path(tmp)
    api = main.Api(output_dir=out)

    # three different users, one of them retrying
    results = [
        api.export_game_result(record("09108086113", 1, 0)),
        api.export_game_result(record("09108086113", 2, 1)),
        api.export_game_result(record("09121234567", 1, 3)),
    ]
    for r in results:
        assert r["success"], r
    assert [r["dailyCount"] for r in results] == [1, 2, 3], results

    daily = json.loads(Path(results[-1]["dailyFile"]).read_text(encoding="utf-8"))
    assert isinstance(daily, list), type(daily)
    assert len(daily) == 3, len(daily)
    assert [(d["mobile"], d["attempt"]) for d in daily] == [
        ("09108086113", 1), ("09108086113", 2), ("09121234567", 1),
    ], daily
    print("PASS accumulates all users/attempts in sequence order")

    # sequential files remain single records
    seq1 = json.loads(Path(results[0]["sequenceFile"]).read_text(encoding="utf-8"))
    assert isinstance(seq1, dict) and seq1["attempt"] == 1
    print("PASS sequential files still hold exactly one record")

    # daily file self-heals after deletion
    Path(results[-1]["dailyFile"]).unlink()
    r4 = api.export_game_result(record("09355554444", 1, 2))
    daily = json.loads(Path(r4["dailyFile"]).read_text(encoding="utf-8"))
    assert len(daily) == 4 and r4["dailyCount"] == 4, (len(daily), r4)
    print("PASS deleted daily file is rebuilt from the sequential records")

    # a corrupt sequential file is skipped, not fatal
    Path(results[1]["sequenceFile"]).write_text("{not json", encoding="utf-8")
    r5 = api.export_game_result(record("09000000000", 1, 1))
    assert r5["success"] and r5["dailyCount"] == 4, r5
    daily = json.loads(Path(r5["dailyFile"]).read_text(encoding="utf-8"))
    assert len(daily) == 4 and all(d["mobile"] != "09108086113" or d["attempt"] != 2 for d in daily)
    print("PASS corrupt sequential file skipped; export still succeeds")

    # sequence numbering unaffected, no stray temp files
    today = main.datetime.now().strftime(main.DATE_FORMAT)
    names = sorted(p.name for p in out.iterdir())
    assert names == [
        f"game_data_{today}.json",
        f"game_data_{today}_001.json",
        f"game_data_{today}_002.json",
        f"game_data_{today}_003.json",
        f"game_data_{today}_004.json",
        f"game_data_{today}_005.json",
    ], names
    print("PASS filenames:", names)

    # ordering holds past 9 (string-sort trap)
    for i in range(6, 13):
        api.export_game_result(record(f"0910000{i:04d}", 1, i))
    daily = json.loads(Path(results[-1]["dailyFile"]).read_text(encoding="utf-8"))
    assert [d["score"] for d in daily][-7:] == [6, 7, 8, 9, 10, 11, 12], daily[-7:]
    print("PASS numeric (not lexicographic) sequence ordering")

print("ALL_CHECKS_PASS")
