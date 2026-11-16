# Callshade

An original earnings-call sentiment teaching lab with a learned multinomial naive-Bayes model, sentence-level evidence and a whole-call synthetic holdout. Independent Python and JavaScript implementations learn the same class priors, vocabulary and smoothed feature weights. The browser adds a local excerpt analyzer, speaker/section composition, selectable sentence ledger, complete feature-contribution table and open corpus/evaluation audit.

**A small synthetic baseline, not validated financial NLP.** No real company transcripts, stock observations, licensed sentiment dictionary, pretrained weights, external model, price forecast, broker integration, trades or investment-performance claim. Sentiment labels are fallible text classifications, not facts about a business. The model does not understand questions, intent, sarcasm, comparisons, negation scope or accounting numbers.

## Run

Python 3.10+ standard library only:

```sh
python3 -m callshade
python3 -m callshade --alpha 1 --text 'Revenue grew with strong demand.'
```

The CLI emits JSON containing the local excerpt analysis and synthetic holdout audit. It accepts text as an argument, not a filename, executable command or network resource. Invalid inputs exit with status 2. Text passed as a command-line argument can be visible in shell history or process listings; use the local browser UI instead for sensitive excerpts. There is no API key, paid service, transcript feed or model download.

```python
from callshade import RECORDS, analyze, fit

training = [r for r in RECORDS if r["call"] < "call-10"]
model = fit(training, alpha=1)
result = analyze(model, "[Prepared]\nCEO:\nRevenue grew with strong demand.")
assert len(result["rows"]) == 1
assert sum(result["counts"]) == 1
```

Serve the static browser:

```sh
python3 -m http.server 8000 --directory docs --bind 127.0.0.1
```

Open `http://127.0.0.1:8000`. No build is needed. Text and analysis stay in memory in this tab. No upload, storage, cookies, telemetry or application network requests. Ordinary static-host asset logs may still exist; source links leave the page. Refreshing or closing the page normally discards its state, but this is not secure erasure and browser history/session restoration is outside this app's control. No analytics, account, file picker, microphone or clipboard reader. The native CLI also makes no network calls or explicit file writes.

## Data and evaluation boundary

The 72 corpus sentences are original invented examples, authored for this project. They form 12 fictional micro-calls, each containing two negative, two neutral and two positive author-intended tone labels. There are no real companies, market outcomes or copied transcripts. They are **not** randomly sampled, independently annotated or representative of earnings-call language.

- Training: calls 01 to 09, totaling 54 sentences, 18 per class.
- Holdout: calls 10 to 12, totaling 18 sentences, 6 per class.
- Vocabulary, feature totals, class priors and conditional weights use training only. The excerpt and holdout never update them. No duplicate full sentences or call IDs cross the split.
- Calls share the same author, vocabulary and writing patterns across the split. Group separation prevents direct call overlap but does not eliminate this structural similarity. Even a perfect synthetic score establishes no real-world accuracy.
- This is one fixed group split, not cross-validation, a historical forecast or temporal testing. The corpus has no real dates. Choosing smoothing after viewing the audit is descriptive exploration, not untouched testing. There is no automated tuning, claim of independent final validation or comparison with a production model.

The audit shows all 18 holdout predictions, the full confusion matrix, accuracy and macro-F1. Actual labels are matrix rows; predicted negative/neutral/positive/unscored are columns. Accuracy is correct predictions divided by all rows. For each class, F1 is `2*TP/(2*TP+FP+FN)` with zero for a zero denominator; macro-F1 is the unweighted mean over all three classes. Unscored predictions count as false negatives for their actual class. The tied training-majority baseline chooses negative and scores 6/18 = 33.3% on this balanced holdout. All 72 original corpus sentences can be inspected in the UI. A higher toy score is not a production-quality certificate.

## Exact model

1. Lowercase the sentence, then extract ASCII word tokens with `[a-z]+(?:'[a-z]+)?`. Straight internal apostrophes remain; curly apostrophes, punctuation and digits act as separators. Accented/non-ASCII words can fragment into misleading ASCII pieces. For example, "résumé" becomes "r", "sum". There is no Unicode normalization, stemming, stop-word removal, sentence embedding, numerical reasoning or explicit negation rule. English-like ASCII text is the intended input, not multilingual analysis.
2. Count unigrams and adjacent token bigrams. A bigram joins two tokens with an underscore. Punctuation within a supplied sentence does not prevent a pair. Unknown words still affect token adjacency: pairs are formed before vocabulary filtering. No truncation or silent vocabulary pruning. Repeated features count repeatedly. Combining words and pairs deliberately creates correlated features, violating the model's conditional-independence assumption.
3. Fit a sorted training-only vocabulary. For each class `c`, `N[c,w]` counts feature occurrences and `T[c]` is their sum. With vocabulary size `V`, fit `P(w|c) = (N[c,w]+alpha)/(T[c]+alpha*V)`. Fit the class prior as its training document count divided by total training documents. There is no smoothing of class priors because every class must be present.
4. Score a new sentence with `log(prior[c]) + sum(count[w]*log(P(w|c)))` over recognized features only. Unknown features contribute nothing; they do not get an extra unknown bucket or trigger refitting. Logarithms avoid multiplying tiny values. Natural logarithms are used.
5. Largest score wins. Exact ties follow the fixed class order: negative, neutral, positive. If zero feature occurrences are recognized, return **unscored**, rather than using the prior-only winner as an assigned label. The low-level result still includes its prior-only winner/runner/scores for arithmetic inspection. Any positive recognized count permits a forced classification, even at very low coverage. There is no calibrated rejection threshold or OOD detector.
6. Compare winner against runner-up. Every known feature contributes `count*(log_weight[winner]-log_weight[runner])`; add the prior difference to recover the score margin. The table includes all recognized features, sorted by absolute contribution then ASCII feature name. Positive contributions support the winner relative to the runner-up; negative ones oppose it. These are exact model-accounting terms, not causal explanations or semantic proof.

The UI reports counts, recognized/total feature occurrences and log-score margin. Feature coverage includes both unigrams and bigrams, with repetitions. For `n` word tokens, total occurrences are `2*n-1` when `n>0`; otherwise zero. Coverage is not word-only coverage, document completeness, model quality or confidence. Raw log scores and their margins depend on text length, correlated features, class totals and priors. They are not normalized sentiment strength. No probability percentages, calibrated confidence, economic-state inference or investment signal are produced.

Smoothing alpha is finite in [0.25, 4]; the UI offers 0.25, 1 and 4. Alpha 1 is Laplace smoothing. It changes all class denominators and learned weights, not merely the display. No best alpha is claimed. The bundled vocabulary has 429 features at every alpha because smoothing does not change feature inclusion.

### Excerpt parsing and aggregation

Headers must be the entire trimmed line, with exactly this capitalization:

```text
[Prepared]
CEO:
Revenue grew with strong demand.
[Q&A]
Analyst:
Why did margins decline?
CFO:
Costs increased and execution was disappointing.
```

The initial section is prepared and the initial speaker is management. `[Prepared]` and `[Q&A]` change only the section, not the speaker. `CEO:`, `CFO:`, `Analyst:` and `Operator:` change only the speaker. Role state persists until another recognized role header. Thus a section change alone does not infer a new speaker. Other speaker formats, names or inline headers are ordinary content; `CEO: Revenue grew` is not recognized as a speaker header.

Each non-header line is split after one or more `.`, `!` or `?` characters only when followed by whitespace or the end of the line. Delimiters are discarded. Decimal `2.5` is not split internally, but abbreviations and initials followed by spaces can split incorrectly. Each line is also a boundary. Quoted sentences, tables, boilerplate, speaker diarization and full transcript formats are not understood. Python and JavaScript use matching explicit Unicode whitespace/line-break semantics for parser parity; this is not multilingual tokenization.

The ledger retains section and speaker for every sentence. Composition groups keep management, CEO, CFO, analyst and operator speech separate within prepared/Q&A sections. Overall counts include every parsed sentence, including analyst questions and operator text. There is no management-only sentiment index, weighted corporate score, sentiment change forecast or claim that a positive question means management is positive. The default mixed excerpt intentionally exposes a questionable classification of "Why did demand weaken?"; inspect its sparse evidence instead of trusting the color.

Changing text, loading a control or changing alpha marks previous output visibly stale and disables sentence selection. **Analyze locally** is required to apply changes. Invalid input keeps the old result visibly stale, never claims a new analysis succeeded, and changes no fitted state. The method audit remains the last applied model, not pending inputs. A successful run recomputes the model, excerpt, ledger and audit together.

## Library bounds and contracts

- `fit(records, alpha=1)` accepts an exact Python list / ordinary JS array of 3 to 120 plain records, each with a valid `label` and a string `text`. Every class must have at least one nonempty-token sentence. Unused metadata such as call ID does not affect fitting. Labels are exactly negative, neutral or positive. Alpha must be numeric, finite and within [0.25, 4]; booleans and numeric strings are rejected.
- Each sentence is at most 600 Unicode code points and 128 extracted word tokens. The union vocabulary is at most 1024 features; larger fits fail instead of silently trimming. Each class can have a different feature total. No model file or object from an untrusted source should be passed to the low-level helpers.
- `analyze(model, text)` accepts a string of at most 16,000 Unicode code points, yielding at most 160 nonempty sentences. Per-sentence bounds above also apply. Empty/header-only excerpts fail. Text with no word tokens can still be a sentence, reported unscored. Unicode length is measured by code points, not UTF-16 units or bytes. The HTML textarea has a coarse 32,000-unit ceiling; the actual 16,000-code-point validation runs on analysis.
- `predict(model, text)` validates its bounded sentence text, but expects an unmodified fitted model. `evaluate(model, records)` is a trusted helper for bounded, valid, labeled records; it does not independently validate arbitrary inputs. Its empty evaluation has zero accuracy and macro-F1. Neither helper is an untrusted serialized-model loader.
- No input training record is mutated; returned arrays/objects belong to the caller. Treat models as immutable while using them. No hostile getters/proxies, subclasses, concurrent mutation, callbacks, plugin execution or process-isolation guarantee. Host memory/runtime failure is not transactionally contained. Public low-level helpers are in-process tools, not a secure multi-tenant service.

All core loops are bounded by the limits above in normal supported use. There is no background loop, scheduler, external model endpoint, file ingestion or command execution. Core math uses the standard library/native JS only. Developer-only browser tooling is locked separately.

## Verify

```sh
make test
npm ci --ignore-scripts
npx playwright install chromium
npm test
npm run test:browser
```

Native tests include an analytic three-class count/denominator fixture, tokenization and bigram fixtures, exact ties and zero-known abstention, grouped split/corpus uniqueness, input immutability, record-order invariance, parser state/decimal boundaries, independently computed confusion metrics, malformed/limit/CLI rejection and 100 seeded independent count/log-score fixtures. For the latter, independent counters and probability formulas verify weights, normalization, score sums and complete margin decomposition. No borrowed NLP package computes the expected answer.

The JavaScript suite compares 30 complete native/browser-core outputs across alpha values 0.25, 1 and 4, including fitted vocabulary/counts/priors/weights, corpus equality, every excerpt prediction and evidence term, role/section groups, all holdout rows and metrics. Cases include negation, unknown words, non-ASCII text, Unicode line boundaries, decimal punctuation and literal HTML. Analytic fixtures and independent oracles supplement parity, which can otherwise preserve shared mistakes.

Real Chromium checks at 1440/1024/768/390/320 px verify actual model-derived counts and evidence, selected sentence state, complete evidence tables, section/speaker separation, all controls, smoothing changes, dirty/invalid input, bounds, zero-known abstention, literal HTML rendering, full corpus/holdout audit, no page overflow, errors, failed or third-party requests, storage or cookies. No other-browser or assistive-technology certification. Responsive tables have explicit local scrolling; a long feature can be visually ellipsized with its full text retained in the DOM. Labels, tables and buttons are native semantic HTML, not canvas-only content.

CI tests Python 3.10, 3.12 and 3.13, the independent browser core, real Chromium and pinned static/security scans. All workflow actions are commit-pinned, permissions are read-only, the Gitleaks binary is checksum-verified, and dev-only Playwright is version-locked. Passing tests and static analysis do not prove absence of bugs or establish classification quality.

## Background

Concept sources, not copied data/code or evidence of this lab's real-world accuracy:

- [Scikit-learn naive Bayes](https://scikit-learn.org/stable/modules/naive_bayes.html): multinomial smoothing, conditional independence and the warning against taking probability outputs too seriously.
- [Stanford Introduction to Information Retrieval](https://nlp.stanford.edu/IR-book/html/htmledition/naive-bayes-text-classification-1.html): log-space text classification, priors and additive smoothing.
- [Scikit-learn grouped evaluation](https://scikit-learn.org/stable/modules/cross_validation.html): keeping dependent groups separate. This lab uses a single explicit split, not GroupKFold.
- [Scikit-learn model evaluation](https://scikit-learn.org/stable/modules/model_evaluation.html): classification metrics and macro aggregation.
- [FactSet comparison, December 2021](https://insight.factset.com/comparing-natural-language-processing-nlp-approaches-for-earnings-calls): practitioner evidence that financial NLP methods can disagree. Its historical investment claims do not apply here.
- [Huang, Wang and Yang, FinBERT](https://onlinelibrary.wiley.com/doi/10.1111/1911-3846.12832): a different finance-adapted transformer model. This project neither implements it nor inherits its results.
- [Notre Dame Loughran-McDonald dictionary](https://sraf.nd.edu/loughranmcdonald-master-dictionary/): a different financial lexicon with its own use terms. No entries are bundled, copied, downloaded or needed by Callshade.

MIT. Original code, corpus and design by Aditya Kulkarni.
