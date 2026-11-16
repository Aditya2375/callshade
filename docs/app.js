import { LABELS, fit, analyze, evaluate } from "./core.js";
import { RECORDS } from "./corpus.js";
const $ = (s) => document.querySelector(s),
  el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  };
const samples = {
  mixed:
    "[Prepared]\nCEO:\nRevenue grew with strong demand. Customer retention improved.\nCFO:\nMargins declined because costs increased. Cash flow is shown in the statement.\n[Q&A]\nAnalyst:\nWhy did demand weaken?\nCFO:\nWe expect a strong recovery. Execution remains disappointing.",
  negation:
    "[Prepared]\nCEO:\nWe are pleased with strong demand. We are not pleased with strong demand.\n[Q&A]\nAnalyst:\nIs a smaller loss a good result?\nCFO:\nWe do not expect a strong recovery. We expect a strong recovery.",
  unknown:
    "[Prepared]\nCEO:\n123 456. 中文. Blorple zqxw frobnicate.\n[Q&A]\nAnalyst:\nThe frobnicate blorple.",
};
let result,
  model,
  selected = 0;
function dirty() {
  if (!result) return;
  $(".desk").classList.add("stale");
  $("#notice").textContent =
    "Inputs changed. Previous result is stale. Analyze again to apply.";
  for (const b of document.querySelectorAll(".sentence")) b.disabled = true;
}
function metric(label, value, cls) {
  const d = el("div");
  d.append(el("span", label), el("b", String(value), cls));
  return d;
}
function inspect(index) {
  selected = index;
  const r = result.rows[index];
  for (const [i, b] of [...document.querySelectorAll(".sentence")].entries())
    b.setAttribute("aria-pressed", String(i === index));
  $("#inspect-id").textContent =
    `SENTENCE ${String(index + 1).padStart(2, "0")}`;
  $("#inspect-text").textContent = r.text;
  $("#detail-metrics").replaceChildren(
    metric("Assigned label", r.label, r.label),
    metric("Feature coverage", `${r.known} / ${r.total}`),
    metric(
      "Log-score margin",
      r.label === "unscored" ? "Not assigned" : r.margin.toFixed(4),
    ),
  );
  $("#decomposition").textContent =
    r.label === "unscored"
      ? "No recognized features. Prior-only winner is not used as a label."
      : `${r.winner} minus ${r.runner}: prior Δ ${r.prior_delta.toFixed(6)} + feature Δ ${r.evidence.reduce((s, e) => s + e.delta, 0).toFixed(6)} = margin ${r.margin.toFixed(6)}`;
  $("#evidence").replaceChildren(
    ...r.evidence.map((e) => {
      const tr = el("tr");
      tr.append(
        el("td", e.feature),
        el("td", String(e.count)),
        el("td", (e.delta >= 0 ? "+" : "") + e.delta.toFixed(6)),
      );
      return tr;
    }),
  );
  $("#no-evidence").textContent = r.evidence.length
    ? "Sorted by absolute contribution, not causal importance. Positive Δ supports the winning class relative to its runner-up; negative Δ opposes it. All recognized features are shown."
    : "No in-vocabulary unigram or bigram. This is not a neutral finding.";
}
function audit() {
  const test = RECORDS.filter((r) => r.call >= "call-10"),
    r = evaluate(model, test);
  $("#eval-metrics").replaceChildren(
    metric("Toy holdout accuracy", `${(100 * r.accuracy).toFixed(1)}%`),
    metric("Toy macro-F1", r.macro_f1.toFixed(3)),
    metric("Vocabulary / train only", model.vocab.length),
  );
  $("#confusion").replaceChildren(
    ...r.matrix.map((row, k) => {
      const tr = el("tr");
      tr.append(el("th", LABELS[k]), ...row.map((n) => el("td", String(n))));
      return tr;
    }),
  );
  $("#holdout").replaceChildren(
    ...r.rows.map((row) => {
      const d = el("div", undefined, "audit-item");
      d.append(
        el("span", row.text),
        el(
          "small",
          `${row.call} / intended ${row.label} / predicted ${row.predicted}`,
        ),
      );
      return d;
    }),
  );
  $("#corpus").replaceChildren(
    ...RECORDS.map((row) => {
      const d = el("div", undefined, "audit-item");
      d.append(
        el("span", row.text),
        el(
          "small",
          `${row.call} / ${row.call < "call-10" ? "training" : "held out"} / intended ${row.label}`,
        ),
      );
      return d;
    }),
  );
}
function render() {
  const all = [...LABELS, "unscored"];
  $("#metrics").replaceChildren(
    ...all.map((label, k) =>
      metric(label[0].toUpperCase() + label.slice(1), result.counts[k], label),
    ),
  );
  $("#groups").replaceChildren(
    ...result.groups.map((g) => {
      const d = el("div", undefined, "group"),
        head = el("div", undefined, "group-head"),
        bar = el("div", undefined, "composition");
      head.append(
        el("span", `${g.section === "qa" ? "Q&A" : "Prepared"} / ${g.speaker}`),
        el("span", `${g.sentences} sentence${g.sentences === 1 ? "" : "s"}`),
      );
      bar.setAttribute("role", "img");
      bar.setAttribute(
        "aria-label",
        all.map((l, k) => `${g.counts[k]} ${l}`).join(", "),
      );
      for (const [k, l] of all.entries()) {
        const segment = el("span", undefined, l);
        segment.style.width = (100 * g.counts[k]) / g.sentences + "%";
        bar.append(segment);
      }
      d.append(head, bar);
      return d;
    }),
  );
  $("#sentences").replaceChildren(
    ...result.rows.map((r, i) => {
      const b = el("button", undefined, "sentence");
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      const text = el("span", r.text);
      text.append(
        el(
          "small",
          `${r.section === "qa" ? "Q&A" : "Prepared"} / ${r.speaker} / ${r.known} of ${r.total} features recognized`,
        ),
      );
      b.append(
        el("span", String(i + 1).padStart(2, "0"), "n"),
        text,
        el("span", r.label, `tag ${r.label}`),
      );
      b.addEventListener("click", () => inspect(i));
      return b;
    }),
  );
  $("#run-title").textContent =
    `${result.rows.length} SENTENCES / LOCAL RESULT`;
  $("#model-info").textContent =
    `α ${model.alpha} / ${model.vocab.length} learned features`;
  inspect(0);
  audit();
}
function run() {
  try {
    const alpha = Number($("#alpha").value);
    if (!["0.25", "1", "4"].includes($("#alpha").value))
      throw Error("Select a listed smoothing value");
    const nextModel = fit(
        RECORDS.filter((r) => r.call < "call-10"),
        alpha,
      ),
      next = analyze(nextModel, $("#transcript").value);
    model = nextModel;
    result = next;
    $(".desk").classList.remove("stale");
    $("#notice").textContent =
      "Applied locally. Labels are fallible; inspect the evidence.";
    render();
  } catch (e) {
    $(".desk").classList.add("stale");
    $("#notice").textContent =
      `Not applied: ${e.message}. Previous results, if any, are stale.`;
    for (const b of document.querySelectorAll(".sentence")) b.disabled = true;
  }
}
$("#transcript").value = samples.mixed;
$("#run").addEventListener("click", run);
$("#transcript").addEventListener("input", dirty);
$("#alpha").addEventListener("change", dirty);
$("#load").addEventListener("click", () => {
  $("#transcript").value = samples[$("#sample").value];
  dirty();
});
run();
