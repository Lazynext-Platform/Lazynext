import type { Post } from './types'

const post: Post = {
  slug: 'how-decision-dna-scoring-works',
  title: 'How Decision DNA actually scores a decision',
  excerpt: 'Four dimensions, two LLM providers, one deterministic fallback, and a stamped model version on every score. The complete pipeline, including what fails.',
  date: 'April 22, 2026',
  dateTime: '2026-04-22',
  tag: 'Engineering',
  content: [
    { type: 'p', text: 'When you log a decision in Lazynext, four numbers come back: clarity, data quality, risk awareness, alternatives considered. Each is 0\u2013100. They\u2019re weighted equally and rounded into a single overall score. That sounds simple. The pipeline behind it had to survive three things every LLM-backed feature has to survive eventually: the model goes down, the model returns garbage, and the bill is open-ended.' },
    { type: 'h2', text: 'The four dimensions' },
    { type: 'p', text: 'We picked the dimensions to be orthogonal \u2014 a decision can score high on clarity and low on data quality, and that\u2019s a real signal, not a measurement artefact. The prompt asks the model to grade each dimension independently with a one-sentence rationale, then we aggregate them ourselves so the model never sees the overall score it\u2019s indirectly producing.' },
    { type: 'ul', items: [
      'Clarity \u2014 is the question sharp, falsifiable, scoped? "Should we hire?" is 20. "Should we hire a second senior backend engineer in Q3?" is 80.',
      'Data quality \u2014 is the rationale grounded in evidence (numbers, customer quotes, logs) or in vibes? Vibes are not zero, but they\u2019re not 80 either.',
      'Risk awareness \u2014 does it name the downside, the reversibility, the blast radius? "We can roll this back in a sprint" earns more than silence.',
      'Alternatives considered \u2014 what was seriously weighed and rejected, and why? An empty `options_considered[]` caps this dimension hard.',
    ]},
    { type: 'h2', text: 'The provider chain' },
    { type: 'p', text: 'Primary is Groq running Llama 3.3 70B. We chose it because the round-trip is consistently under 800ms, which means we can score on the keystroke that closes the modal without a spinner that screams "AI is happening." Together AI is the fallback for when Groq\u2019s region is degraded. If both fail \u2014 including the wonderful failure mode where the model returns valid JSON wrapped in markdown fences with prose before and after it \u2014 a deterministic heuristic takes over so scoring never blocks the decision from being logged.' },
    { type: 'h2', text: 'JSON wrangling, the unglamorous part' },
    { type: 'p', text: 'Llama via Groq routinely ignores "respond with raw JSON only" and wraps the response in fenced code blocks, sometimes with a friendly preamble. So we have a small `extractJson` step that strips fences, then grabs everything from the first `{` to the last `}`, then parses. If parsing fails, the call is logged as `fallback_cause: "json_parse_failed"` and the heuristic runs. We watch the rate of that cause as a model-quality canary \u2014 when Llama 3.3 first dropped, that line in our logs spiked for 36 hours, then settled.' },
    { type: 'code', lang: 'ts', text: 'function extractJson(raw: string): string {\n  let s = raw.trim()\n  if (s.startsWith("```")) {\n    s = s.replace(/^```(?:json)?\\s*/i, "").replace(/\\s*```$/i, "")\n  }\n  const first = s.indexOf("{")\n  const last = s.lastIndexOf("}")\n  if (first !== -1 && last !== -1 && last > first) {\n    s = s.slice(first, last + 1)\n  }\n  return s.trim()\n}' },
    { type: 'h2', text: 'The heuristic that runs when AI doesn\u2019t' },
    { type: 'p', text: 'The fallback is dumb on purpose. It looks at length signals (rationale character count, question length), counts entries in `options_considered`, and flags risk awareness if the rationale contains the word "revers" or `risk_notes` is non-empty or `decision_type === "experimental"`. It produces scores in the right shape so downstream consumers (the health dashboard, outcome review, public decision pages) don\u2019t have to know which path produced the score. They just have to look at `source` and `model_version`.' },
    { type: 'h2', text: 'Every score is stamped' },
    { type: 'p', text: 'Look back in a year and you should know which model judged what. Every row stores the `model_version` (e.g. `groq:llama-3.3-70b-v2`, or `heuristic:v1`) plus the `source` (`ai` or `heuristic`). When we eventually swap the primary model, the dashboard will let you filter by version so you can audit "did our average clarity score actually rise, or did the new model just grade nicer?" That second question is going to come up at every team that takes this seriously.' },
    { type: 'h2', text: 'What we log on every call' },
    { type: 'p', text: 'A single-line JSON event per score: source, provider, model_version, duration_ms, fallback_cause if any, error message if any. Prefixed with `decision_scorer` so a `grep` in Vercel logs is the entire dashboard. We alert on two things: a spike in `source: heuristic` where `fallback_cause != "no_ai_keys"` (which means real AI calls are failing), and a p95 duration over 2s (which means we\u2019re about to need a second fallback region).' },
    { type: 'h2', text: 'What this is not' },
    { type: 'p', text: 'It is not a verdict on whether the decision was right. The outcome loop does that, weeks or months later. The score is a verdict on whether the reasoning was good enough to be worth tracking \u2014 and a calibration anchor when you compare it to the eventual outcome. A clarity-90 decision that flopped is more interesting than a clarity-30 decision that flopped, because it tells you the team is reasoning well and the world is harder than the reasoning suggested. That\u2019s the gap good orgs close.' },
    { type: 'h2', text: 'Try it' },
    { type: 'p', text: 'Set `GROQ_API_KEY` in your env and the AI path lights up. Without one, the heuristic still produces honest, deterministic scores. We deliberately keep the no-keys path useful so a fresh clone of the repo demos the loop without needing a billing relationship with a model provider.' },
  ],
}

export default post
