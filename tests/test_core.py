import copy
import math
import random
import subprocess
import sys
import unittest
from collections import Counter
from callshade import LABELS, RECORDS, analyze, evaluate, fit, predict, tokens, vector


class Core(unittest.TestCase):
    def setUp(self):
        self.train = [r for r in RECORDS if r["call"] < "call-10"]
        self.hold = [r for r in RECORDS if r["call"] >= "call-10"]
        self.model = fit(self.train)

    def test_analytic(self):
        m = fit(
            [
                {"text": "bad bad", "label": "negative"},
                {"text": "plain", "label": "neutral"},
                {"text": "good", "label": "positive"},
            ]
        )
        self.assertEqual(m["vocab"], ["bad", "bad_bad", "good", "plain"])
        self.assertEqual(m["counts"][0], [2, 1, 0, 0])
        self.assertAlmostEqual(m["logs"][0][0], math.log(3 / 7))
        self.assertAlmostEqual(m["logs"][1][0], math.log(1 / 5))
        self.assertEqual(predict(m, "bad")["label"], "negative")
        self.assertEqual(predict(m, "xyz")["label"], "unscored")
        self.assertEqual(predict(m, "xyz")["winner"], "negative")
        self.assertEqual(predict(m, "xyz")["margin"], 0)

    def test_tokenizer(self):
        self.assertEqual(
            tokens("CFO's 2.5% re-orders DON'T résumé"),
            ["cfo's", "re", "orders", "don't", "r", "sum"],
        )
        self.assertEqual(vector("a a b"), Counter({"a": 2, "b": 1, "a_a": 1, "a_b": 1}))
        self.assertEqual(tokens("😀中文123"), [])

    def test_no_leakage(self):
        self.assertEqual(len(self.train), 54)
        self.assertEqual(len(self.hold), 18)
        self.assertFalse(
            set(r["call"] for r in self.train) & set(r["call"] for r in self.hold)
        )
        self.assertEqual(len({r["text"] for r in RECORDS}), 72)
        m = copy.deepcopy(self.model)
        h = copy.deepcopy(self.hold)
        h[0]["text"] = "unseen sentinel"
        evaluate(m, h)
        self.assertEqual(m, self.model)
        self.assertNotIn("sentinel", m["vocab"])
        self.assertEqual(m["documents"], [18] * 3)

    def test_oracle_and_explanation(self):
        rng = random.Random(72)
        for trial in range(100):
            data = [
                {
                    "label": k,
                    "text": " ".join(
                        rng.choices(["a", "b", "c", "d", "e"], k=rng.randrange(1, 9))
                    ),
                }
                for k in LABELS
                for _ in range(3)
            ]
            alpha = rng.choice([0.25, 1.0, 4.0])
            m = fit(data, alpha)
            cs = {k: Counter() for k in LABELS}
            for row in data:
                cs[row["label"]].update(vector(row["text"]))
            for k, label in enumerate(LABELS):
                denom = sum(cs[label].values()) + alpha * len(m["vocab"])
                self.assertAlmostEqual(sum(math.exp(x) for x in m["logs"][k]), 1)
                for i, w in enumerate(m["vocab"]):
                    self.assertAlmostEqual(
                        m["logs"][k][i], math.log((cs[label][w] + alpha) / denom)
                    )
            text = " ".join(rng.choices(["a", "b", "z"], k=8))
            v = vector(text)
            p = predict(m, text)
            oracle = [
                math.log(1 / 3)
                + sum(
                    n
                    * math.log(
                        (cs[k][w] + alpha)
                        / (sum(cs[k].values()) + alpha * len(m["vocab"]))
                    )
                    for w, n in v.items()
                    if w in m["vocab"]
                )
                for k in LABELS
            ]
            for a, b in zip(p["scores"], oracle):
                self.assertAlmostEqual(a, b)
            self.assertAlmostEqual(
                p["margin"], p["prior_delta"] + sum(e["delta"] for e in p["evidence"])
            )
            self.assertLessEqual(p["known"], p["total"])

    def test_parsing(self):
        r = analyze(
            self.model,
            "[Prepared]\nCEO:\nRevenue is 2.5 million. Strong growth!\n[Q&A]\nAnalyst:\nWhy did costs rise?\nCFO:\nMargins declined.",
        )
        self.assertEqual(len(r["rows"]), 4)
        self.assertEqual(r["rows"][0]["text"], "Revenue is 2.5 million")
        self.assertEqual(
            [(x["section"], x["speaker"]) for x in r["rows"]],
            [("prepared", "ceo")] * 2 + [("qa", "analyst"), ("qa", "cfo")],
        )
        self.assertEqual(sum(r["counts"]), 4)
        self.assertEqual(sum(x["sentences"] for x in r["groups"]), 4)
        # Role names embedded on a content line are not silently parsed as headers.
        self.assertEqual(
            analyze(self.model, "CEO: Revenue grew")["rows"][0]["speaker"], "management"
        )

    def test_metrics(self):
        m = fit(
            [
                {"text": "bad", "label": "negative"},
                {"text": "plain", "label": "neutral"},
                {"text": "good", "label": "positive"},
            ]
        )
        e = evaluate(
            m,
            [
                {"text": "bad", "label": "negative"},
                {"text": "good", "label": "negative"},
                {"text": "xyz", "label": "positive"},
            ],
        )
        self.assertEqual(e["matrix"], [[1, 0, 1, 0], [0, 0, 0, 0], [0, 0, 0, 1]])
        self.assertAlmostEqual(e["accuracy"], 1 / 3)
        self.assertAlmostEqual(e["macro_f1"], (2 / 3) / 3)
        self.assertEqual(evaluate(m, [])["accuracy"], 0)

    def test_input_copy_and_determinism(self):
        old = copy.deepcopy(self.train)
        m = fit(self.train)
        analyze(m, "Strong demand.")
        self.assertEqual(self.train, old)
        self.assertEqual(m, self.model)
        self.assertEqual(fit(self.train), fit(list(reversed(self.train))))

    def test_validation(self):
        for alpha in [True, None, "1", 0, 0.249, 4.1, math.nan, math.inf]:
            with self.assertRaises(ValueError):
                fit(self.train, alpha)
        for rows in [
            [],
            [{}] * 3,
            [{"text": "123", "label": k} for k in LABELS],
            [{"text": "a", "label": "positive"}] * 3,
        ]:
            with self.assertRaises(ValueError):
                fit(rows)
        for text in [None, 4, "x" * 601, "a " * 129]:
            with self.assertRaises(ValueError):
                predict(self.model, text)
        for text in ["", "\n[Prepared]\nCEO:", "x" * 16001, "a. " * 161]:
            with self.assertRaises(ValueError):
                analyze(self.model, text)
        self.assertEqual(len(analyze(self.model, "a. " * 160)["rows"]), 160)
        self.assertEqual(len(tokens("x" * 600)), 1)
        self.assertEqual(len(tokens("a " * 128)), 128)

    def test_bounds_and_unequal_priors(self):
        rows = [{"text": "bad", "label": "negative"}] * 2 + [
            {"text": "plain", "label": "neutral"},
            {"text": "good", "label": "positive"},
        ]
        m = fit(rows)
        self.assertEqual(m["documents"], [2, 1, 1])
        self.assertAlmostEqual(m["priors"][0], math.log(0.5))
        self.assertAlmostEqual(m["priors"][1], math.log(0.25))
        p = predict(m, "good good good")
        self.assertEqual(p["label"], "positive")
        self.assertLess(p["prior_delta"], 0)
        self.assertAlmostEqual(
            p["margin"], p["prior_delta"] + sum(e["delta"] for e in p["evidence"])
        )
        maximum = [{"text": "a", "label": LABELS[i % 3]} for i in range(120)]
        self.assertEqual(fit(maximum)["documents"], [40, 40, 40])
        with self.assertRaises(ValueError):
            fit(maximum + [maximum[0]])

        def word(n):
            return "w" + chr(97 + n // 676) + chr(97 + n // 26 % 26) + chr(97 + n % 26)

        wide = [
            {
                "text": " ".join(word(i * 80 + j) for j in range(80)),
                "label": LABELS[i % 3],
            }
            for i in range(7)
        ]
        self.assertLess(len(fit(wide[:6])["vocab"]), 1024)
        with self.assertRaises(ValueError):
            fit(wide)
        self.assertEqual(len(analyze(self.model, "a" * 600)["rows"]), 1)
        with self.assertRaises(ValueError):
            analyze(self.model, "😀" * 16001)

    def test_cli(self):
        for args in [["--alpha", "nan"], ["--alpha", "0"], ["--text", ""]]:
            p = subprocess.run(
                [sys.executable, "-m", "callshade", *args], capture_output=True
            )
            self.assertEqual(p.returncode, 2)
            self.assertEqual(p.stdout, b"")
        p = subprocess.run([sys.executable, "-m", "callshade"], capture_output=True)
        self.assertEqual(p.returncode, 0)


if __name__ == "__main__":
    unittest.main()
