"""Original bounded multinomial naive-Bayes earnings-call teaching lab."""

import math
import re
from collections import Counter

LABELS = ["negative", "neutral", "positive"]


def text_check(text, limit):
    if type(text) is not str or len(text) > limit:
        raise ValueError(f"Text must be a string of at most {limit} characters")


def tokens(text):
    text_check(text, 600)
    words = re.findall(r"[a-z]+(?:'[a-z]+)?", text.lower())
    if len(words) > 128:
        raise ValueError("At most 128 word tokens per sentence")
    return words


def vector(text):
    words = tokens(text)
    return Counter(words + [a + "_" + b for a, b in zip(words, words[1:])])


def fit(records, alpha=1.0):
    if (
        type(alpha) not in (int, float)
        or not math.isfinite(alpha)
        or not 0.25 <= alpha <= 4
    ):
        raise ValueError("Smoothing alpha must be finite in 0.25..4")
    if type(records) is not list or not 3 <= len(records) <= 120:
        raise ValueError("Need 3..120 labeled sentences")
    counts = [Counter() for _ in LABELS]
    docs = [0, 0, 0]
    for row in records:
        if type(row) is not dict or row.get("label") not in LABELS:
            raise ValueError("Each sentence needs a valid label")
        v = vector(row.get("text"))
        if not v:
            raise ValueError("Training sentences need ASCII word tokens")
        k = LABELS.index(row["label"])
        counts[k].update(v)
        docs[k] += 1
    if min(docs) == 0:
        raise ValueError("Every class needs a training sentence")
    vocab = sorted(set().union(*counts))
    if len(vocab) > 1024:
        raise ValueError("Vocabulary exceeds 1024 features")
    totals = [sum(c.values()) for c in counts]
    logs = [
        [math.log((c[w] + alpha) / (total + alpha * len(vocab))) for w in vocab]
        for c, total in zip(counts, totals)
    ]
    return {
        "vocab": vocab,
        "counts": [[c[w] for w in vocab] for c in counts],
        "totals": totals,
        "documents": docs,
        "priors": [math.log(n / len(records)) for n in docs],
        "logs": logs,
        "alpha": alpha,
    }


def predict(model, text):
    """Trusted unmodified fitted model; bounded text validated independently."""
    v = vector(text)
    known = [(i, v[w]) for i, w in enumerate(model["vocab"]) if w in v]
    scores = [
        model["priors"][k] + sum(n * model["logs"][k][i] for i, n in known)
        for k in range(3)
    ]
    order = sorted(range(3), key=lambda k: (-scores[k], k))
    a, b = order[:2]
    evidence = [
        {
            "feature": model["vocab"][i],
            "count": n,
            "delta": n * (model["logs"][a][i] - model["logs"][b][i]),
        }
        for i, n in known
    ]
    evidence.sort(key=lambda e: (-abs(e["delta"]), e["feature"]))
    total = sum(v.values())
    return {
        "label": LABELS[a] if known else "unscored",
        "winner": LABELS[a],
        "runner": LABELS[b],
        "scores": scores,
        "margin": scores[a] - scores[b],
        "prior_delta": model["priors"][a] - model["priors"][b],
        "evidence": evidence,
        "known": sum(n for _, n in known),
        "total": total,
        "coverage": sum(n for _, n in known) / total if total else 0.0,
    }


def evaluate(model, records):
    matrix = [[0] * 4 for _ in range(3)]
    rows = []
    for row in records:
        p = predict(model, row["text"])
        matrix[LABELS.index(row["label"])][
            LABELS.index(p["label"]) if p["label"] in LABELS else 3
        ] += 1
        rows.append({**row, "predicted": p["label"]})
    f1 = []
    for k in range(3):
        tp = matrix[k][k]
        fp = sum(matrix[j][k] for j in range(3) if j != k)
        fn = sum(matrix[k]) - tp
        f1.append(2 * tp / (2 * tp + fp + fn) if 2 * tp + fp + fn else 0.0)
    return {
        "matrix": matrix,
        "accuracy": (
            sum(matrix[k][k] for k in range(3)) / len(records) if records else 0.0
        ),
        "macro_f1": sum(f1) / 3,
        "rows": rows,
    }


def analyze(model, text):
    text_check(text, 16000)
    section, speaker = "prepared", "management"
    output = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if line in ("[Prepared]", "[Q&A]"):
            section = "prepared" if line == "[Prepared]" else "qa"
            continue
        if line in ("CEO:", "CFO:", "Analyst:", "Operator:"):
            speaker = line[:-1].lower()
            continue
        for sentence in re.split(r"[.!?]+(?=\s|$)", line):
            sentence = sentence.strip()
            if not sentence:
                continue
            if len(output) >= 160:
                raise ValueError("At most 160 sentences")
            output.append(
                {
                    "text": sentence,
                    "section": section,
                    "speaker": speaker,
                    **predict(model, sentence),
                }
            )
    if not output:
        raise ValueError("Enter at least one sentence")
    # No numeric sentiment index: sentence-label composition, not corporate mood.
    groups = []
    for section in ("prepared", "qa"):
        for role in ("management", "ceo", "cfo", "analyst", "operator"):
            rows = [
                r for r in output if r["section"] == section and r["speaker"] == role
            ]
            if rows:
                groups.append(
                    {
                        "section": section,
                        "speaker": role,
                        "counts": [
                            sum(r["label"] == label for r in rows)
                            for label in LABELS + ["unscored"]
                        ],
                        "sentences": len(rows),
                    }
                )
    return {
        "rows": output,
        "groups": groups,
        "counts": [
            sum(r["label"] == label for r in output) for label in LABELS + ["unscored"]
        ],
    }
