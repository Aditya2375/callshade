import argparse
import json
from . import RECORDS, analyze, evaluate, fit

p = argparse.ArgumentParser(
    description="Original synthetic earnings-call sentiment lab; not financial advice"
)
p.add_argument(
    "--text",
    default="[Prepared]\nCEO:\nRevenue grew with strong demand.\n[Q&A]\nAnalyst:\nWhy did margins decline?\nCFO:\nCosts increased and execution was disappointing.",
)
p.add_argument("--alpha", type=float, default=1.0)
a = p.parse_args()
try:
    model = fit([r for r in RECORDS if r["call"] < "call-10"], a.alpha)
    result = {
        "analysis": analyze(model, a.text),
        "synthetic_holdout": evaluate(
            model, [r for r in RECORDS if r["call"] >= "call-10"]
        ),
    }
    print(json.dumps(result, allow_nan=False))
except ValueError as e:
    p.error(str(e))
