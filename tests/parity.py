import json
import sys
from callshade import RECORDS, fit, predict, analyze, evaluate

programs = json.load(sys.stdin)
result = []
for p in programs:
    m = fit([r for r in RECORDS if r["call"] < "call-10"], p["alpha"])
    result.append(
        {
            "model": m,
            "analysis": analyze(m, p["text"]),
            "evaluation": evaluate(m, [r for r in RECORDS if r["call"] >= "call-10"]),
        }
    )
print(json.dumps({"corpus": RECORDS, "programs": result}, allow_nan=False))
