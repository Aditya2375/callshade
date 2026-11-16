// Independent JavaScript multinomial naive-Bayes implementation.
const ws =
  "[\\x09-\\x0d\\x1c-\\x20\\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000]";
const trim = (t) => t.replace(new RegExp("^" + ws + "+|" + ws + "+$", "g"), "");
export const LABELS = ["negative", "neutral", "positive"];
function textCheck(t, limit) {
  if (typeof t !== "string" || Array.from(t).length > limit)
    throw Error(`Text must be a string of at most ${limit} characters`);
}
export function tokens(text) {
  textCheck(text, 600);
  const words = text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
  if (words.length > 128) throw Error("At most 128 word tokens per sentence");
  return words;
}
export function vector(text) {
  const w = tokens(text),
    v = new Map();
  for (const token of [...w, ...w.slice(1).map((b, i) => w[i] + "_" + b)])
    v.set(token, (v.get(token) || 0) + 1);
  return v;
}
export function fit(records, alpha = 1) {
  if (
    typeof alpha !== "number" ||
    !Number.isFinite(alpha) ||
    alpha < 0.25 ||
    alpha > 4
  )
    throw Error("Smoothing alpha must be finite in 0.25..4");
  if (!Array.isArray(records) || records.length < 3 || records.length > 120)
    throw Error("Need 3..120 labeled sentences");
  const counts = LABELS.map(() => new Map()),
    docs = [0, 0, 0];
  for (const row of Array.from(records)) {
    if (
      !row ||
      Object.getPrototypeOf(row) !== Object.prototype ||
      !LABELS.includes(row.label)
    )
      throw Error("Each sentence needs a valid label");
    const v = vector(row.text);
    if (!v.size) throw Error("Training sentences need ASCII word tokens");
    const k = LABELS.indexOf(row.label);
    docs[k]++;
    for (const [w, n] of v) counts[k].set(w, (counts[k].get(w) || 0) + n);
  }
  if (Math.min(...docs) === 0)
    throw Error("Every class needs a training sentence");
  const vocab = [...new Set(counts.flatMap((c) => [...c.keys()]))].sort();
  if (vocab.length > 1024) throw Error("Vocabulary exceeds 1024 features");
  const totals = counts.map((c) => [...c.values()].reduce((a, b) => a + b, 0));
  return {
    vocab,
    counts: counts.map((c) => vocab.map((w) => c.get(w) || 0)),
    totals,
    documents: docs,
    priors: docs.map((n) => Math.log(n / records.length)),
    logs: counts.map((c, k) =>
      vocab.map((w) =>
        Math.log(
          ((c.get(w) || 0) + alpha) / (totals[k] + alpha * vocab.length),
        ),
      ),
    ),
    alpha,
  };
}
export function predict(model, text) {
  const v = vector(text),
    known = model.vocab.flatMap((w, i) => (v.has(w) ? [[i, v.get(w)]] : [])),
    scores = LABELS.map(
      (_, k) =>
        model.priors[k] +
        known.reduce((s, [i, n]) => s + n * model.logs[k][i], 0),
    ),
    order = [0, 1, 2].sort((a, b) => scores[b] - scores[a] || a - b),
    [a, b] = order,
    evidence = known.map(([i, n]) => ({
      feature: model.vocab[i],
      count: n,
      delta: n * (model.logs[a][i] - model.logs[b][i]),
    }));
  evidence.sort(
    (a, b) =>
      Math.abs(b.delta) - Math.abs(a.delta) ||
      (a.feature < b.feature ? -1 : a.feature > b.feature ? 1 : 0),
  );
  const total = [...v.values()].reduce((a, b) => a + b, 0),
    count = known.reduce((s, [, n]) => s + n, 0);
  return {
    label: known.length ? LABELS[a] : "unscored",
    winner: LABELS[a],
    runner: LABELS[b],
    scores,
    margin: scores[a] - scores[b],
    prior_delta: model.priors[a] - model.priors[b],
    evidence,
    known: count,
    total,
    coverage: total ? count / total : 0,
  };
}
export function evaluate(model, records) {
  const matrix = LABELS.map(() => [0, 0, 0, 0]),
    rows = [];
  for (const r of records) {
    const p = predict(model, r.text);
    matrix[LABELS.indexOf(r.label)][
      p.label === "unscored" ? 3 : LABELS.indexOf(p.label)
    ]++;
    rows.push({ ...r, predicted: p.label });
  }
  const f1 = LABELS.map((_, k) => {
    const tp = matrix[k][k],
      fp = matrix.reduce((s, r, j) => s + (j !== k ? r[k] : 0), 0),
      fn = matrix[k].reduce((a, b) => a + b, 0) - tp;
    return 2 * tp + fp + fn ? (2 * tp) / (2 * tp + fp + fn) : 0;
  });
  return {
    matrix,
    accuracy: records.length
      ? matrix.reduce((s, r, k) => s + r[k], 0) / records.length
      : 0,
    macro_f1: f1.reduce((a, b) => a + b, 0) / 3,
    rows,
  };
}
export function analyze(model, text) {
  textCheck(text, 16000);
  let section = "prepared",
    speaker = "management";
  const output = [];
  for (let line of text.split(/\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/)) {
    line = trim(line);
    if (!line) continue;
    if (["[Prepared]", "[Q&A]"].includes(line)) {
      section = line === "[Prepared]" ? "prepared" : "qa";
      continue;
    }
    if (["CEO:", "CFO:", "Analyst:", "Operator:"].includes(line)) {
      speaker = line.slice(0, -1).toLowerCase();
      continue;
    }
    for (let sentence of line.split(new RegExp("[.!?]+(?=" + ws + "|$)"))) {
      sentence = trim(sentence);
      if (!sentence) continue;
      if (output.length >= 160) throw Error("At most 160 sentences");
      output.push({
        text: sentence,
        section,
        speaker,
        ...predict(model, sentence),
      });
    }
  }
  if (!output.length) throw Error("Enter at least one sentence");
  const groups = [];
  for (const s of ["prepared", "qa"])
    for (const role of ["management", "ceo", "cfo", "analyst", "operator"]) {
      const rows = output.filter((r) => r.section === s && r.speaker === role);
      if (rows.length)
        groups.push({
          section: s,
          speaker: role,
          counts: [...LABELS, "unscored"].map(
            (l) => rows.filter((r) => r.label === l).length,
          ),
          sentences: rows.length,
        });
    }
  return {
    rows: output,
    groups,
    counts: [...LABELS, "unscored"].map(
      (l) => output.filter((r) => r.label === l).length,
    ),
  };
}
