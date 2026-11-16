import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  fit,
  predict,
  analyze,
  evaluate,
  tokens,
  vector,
  LABELS,
} from "../docs/core.js";
import { RECORDS } from "../docs/corpus.js";
let count = 0;
function near(a, b, path = "root") {
  if (typeof a === "number") {
    assert.ok(
      Math.abs(a - b) <= 1e-10 * Math.max(1, Math.abs(a), Math.abs(b)),
      path + ":" + a + " vs " + b,
    );
    count++;
  } else if (Array.isArray(a)) {
    assert.equal(a.length, b.length, path);
    a.forEach((v, i) => near(v, b[i], path + "." + i));
  } else if (a && typeof a === "object") {
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), path);
    for (const k in a) near(a[k], b[k], path + "." + k);
  } else {
    assert.equal(a, b, path);
    count++;
  }
}
const texts = [
  "[Prepared]\nCEO:\nRevenue grew with strong demand.\n[Q&A]\nAnalyst:\nWhy did margins decline?\nCFO:\nCosts increased and execution was disappointing.",
  "123 😀 中文. xyzzy blorple.",
  "CEO: Revenue grew. Margins are 2.5 percent.",
  "[Q&A]\nCFO:\nWe are not pleased. We do not expect a strong recovery.",
  "<img src=x onerror=alert(1)> Revenue grew.",
  "Revenue grew\u2028Margins fell",
  "CFO\x85Revenue grew",
  "CFO\rRevenue grew",
];
texts.push(
  "\x1fRevenue grew.\x85Margin fell.\ufeff",
  "\u3000Revenue grew.\u3000",
);
const programs = [0.25, 1, 4].flatMap((alpha) =>
  texts.map((text) => ({ alpha, text })),
);
const child = spawnSync("python3", ["-m", "tests.parity"], {
  input: JSON.stringify(programs),
  encoding: "utf8",
  maxBuffer: 15 * 1024 * 1024,
});
assert.equal(child.status, 0, child.stderr);
const native = JSON.parse(child.stdout);
near(RECORDS, native.corpus);
programs.forEach((p, i) => {
  const model = fit(
    RECORDS.filter((r) => r.call < "call-10"),
    p.alpha,
  );
  near(
    {
      model,
      analysis: analyze(model, p.text),
      evaluation: evaluate(
        model,
        RECORDS.filter((r) => r.call >= "call-10"),
      ),
    },
    native.programs[i],
  );
});
assert.deepEqual(tokens("CFO's 2.5% re-orders DON'T résumé"), [
  "cfo's",
  "re",
  "orders",
  "don't",
  "r",
  "sum",
]);
const m = fit([
  { text: "bad bad", label: "negative" },
  { text: "plain", label: "neutral" },
  { text: "good", label: "positive" },
]);
assert.deepEqual(m.vocab, ["bad", "bad_bad", "good", "plain"]);
near(m.logs[0][0], Math.log(3 / 7));
assert.equal(predict(m, "bad").label, "negative");
assert.equal(predict(m, "xyz").label, "unscored");
assert.equal(predict(m, "").margin, 0);
assert.throws(() => fit([, {}, {}]));
for (const alpha of [true, null, "1", 0, 0.249, 4.1, NaN, Infinity])
  assert.throws(() => fit(RECORDS, alpha));
for (const t of [null, 4, "x".repeat(601), "a ".repeat(129)])
  assert.throws(() => predict(m, t));
for (const t of [
  "",
  "\n[Prepared]\nCEO:",
  "x".repeat(16001),
  "a. ".repeat(161),
])
  assert.throws(() => analyze(m, t));
assert.equal(analyze(m, "a. ".repeat(160)).rows.length, 160);
assert.equal(tokens("😀".repeat(300)).length, 0);

const rows = [
    ...Array(2).fill({ text: "bad", label: "negative" }),
    { text: "plain", label: "neutral" },
    { text: "good", label: "positive" },
  ],
  uneven = fit(rows),
  up = predict(uneven, "good good good");
assert.deepEqual(uneven.documents, [2, 1, 1]);
assert.equal(up.label, "positive");
assert.ok(up.prior_delta < 0);
near(up.margin, up.prior_delta + up.evidence.reduce((s, e) => s + e.delta, 0));
const maximum = Array.from({ length: 120 }, (_, i) => ({
  text: "a",
  label: LABELS[i % 3],
}));
assert.deepEqual(fit(maximum).documents, [40, 40, 40]);
assert.throws(() => fit([...maximum, maximum[0]]));
function word(n) {
  return (
    "w" +
    String.fromCharCode(
      97 + Math.floor(n / 676),
      97 + (Math.floor(n / 26) % 26),
      97 + (n % 26),
    )
  );
}
const wide = Array.from({ length: 7 }, (_, i) => ({
  text: Array.from({ length: 80 }, (_, j) => word(i * 80 + j)).join(" "),
  label: LABELS[i % 3],
}));
assert.ok(fit(wide.slice(0, 6)).vocab.length < 1024);
assert.throws(() => fit(wide));

console.log(
  JSON.stringify({
    scalar_checks: count,
    full_native_parity: programs.length,
    status: "PASS",
  }),
);
