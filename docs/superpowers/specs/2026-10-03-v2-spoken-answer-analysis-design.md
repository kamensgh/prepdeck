# Prepdeck v2 PRD: Spoken Answer Analysis

2026-10-03 · Amended after Stage 0 (see `2026-10-03-v2-stage0-results.md`) · Shareable copy: https://claude.ai/code/artifact/c5674832-3ffa-4369-a535-2bd9469659d2

## Summary and goals

v2 lets users answer a dealt card out loud and get graded in seconds on Content, Fluency and Pacing, entirely on their device and free to run. v1 shows what a strong answer covers; v2 tells users whether *their* answer covered it, and how it sounded.

Goals:

1. Give specific, actionable feedback on a spoken answer: which rubric points were missed, which filler words were used, where the long pauses fell.
2. Cost nothing per answer to run, with no audio or transcript ever leaving the device.
3. Keep the v1 deck untouched: analysis is an opt-in overlay, never a required step.

The grading rubric comes from each question's existing `tips.hit`, so reviewers keep controlling grading through the content they already edit in Sanity.

## Decisions and scope

| Decision | Choice | Why |
| --- | --- | --- |
| Where it runs | On-device in the browser, $0 per answer | Free to run; audio never leaves the device |
| Content grading | Rubric coverage check for everyone; optional on-device LLM feedback (Stage 2) | Coverage works on any device and is deterministic; LLM adds richer feedback where hardware allows |
| Saving | Nothing saved | Simplest and most private; no accounts needed |
| After a result | Try again (same card) or New question | Keeps practice going without history |
| Presentation | Three ratings (Strong / Good / Needs work) with a specific breakdown | Readable at a glance; no blended grade hiding a weakness |
| Recording limit | 3 minutes | Covers nearly every question type; keeps analysis fast |
| Where it happens | Full-screen overlay opened by **Analyse my answer** | Separates recording from the deck; keeps deck state and loaded models |
| Speech engine | Whisper `base.en` + Silero VAD + MiniLM via Transformers.js, transcribed in ~25 s chunks while recording; compact quantisation | Word timestamps and robust pause detection; results ~3–5 s after Stop; ~140 MB one-time download |

**Out of scope for v2:** accounts, saved history or progress tracking, cloud transcription, non-English answers, self-hosted models, and a blended overall score.

## User flow

A dealt card gains one button, **Analyse my answer**, beside "What makes a great answer?". It opens a full-screen overlay that hides the deck; the card, tips and deck otherwise behave exactly as in v1.

1. **Setup (first use only).** "Grading runs on your device. Nothing is uploaded. We'll download about 140 MB once." **Download and continue** shows progress in MB with a time estimate, then the browser asks for the microphone. Models are cached for later visits.
2. **Ready.** The question text at the top, a large **Start recording** button, and ✕ Close. Tips are not available in the overlay until results.
3. **Recording.** A 3-second count-in, then a live waveform, a countdown (`2:41 left`) and **Stop** (Space also stops). Recording stops itself at 3:00.
4. **Analysing.** "Listening back…" with steps: Transcribing → Checking pauses → Checking content. Target 5–15 s.
5. **Results.**
    - Three ratings: Content, Fluency, Pacing, each Strong / Good / Needs work.
    - A breakdown under each, e.g. "you said 'like' 6 times", "longest pause 4.2s, after 'so the browser…'", "covered 5 of 7 points; missed: layout, paint".
    - The transcript with fillers and long pauses highlighted, playback of the recording, and the tips panel for comparison.
6. **Next step.** **Try again** returns to Ready on the same card and discards the result. **New question** deals the next card and goes to Ready, or shows "That's the whole deck" at the end. **Back to deck** closes the overlay.

Close, Esc and the browser Back button all exit; mid-recording they ask "Discard this recording?". Nothing persists after leaving. The overlay is a modal dialog: focus is trapped inside and returns to the button on close, and the countdown and analysis steps are announced to screen readers.

## Analysis pipeline

All analysis runs in the browser: three small models produce raw signals, and plain TypeScript functions turn them into ratings. Grading logic never touches a model, so it can be tuned and unit-tested on its own.

**Amended after Stage 0:** the recorder streams 16 kHz audio and cuts it into ~25 s chunks at the quietest moment; the worker transcribes and runs VAD on each chunk while the user is still talking, so Stop only waits for the last chunk (whole-recording analysis of a 3-minute answer took ~24 s). Whisper folds natural "um"s into stretched words, so Fluency also counts **hesitations**: voiced time after a word, beyond its expected length, that VAD marks as speech.

```
Mic → Recorder ──16 kHz audio──▶ Analysis worker (background thread)
                                  ├─ Silero VAD     → segments [{start, end}]
                                  ├─ Whisper base.en → words [{text, start, end}]
                                  └─ MiniLM          → vectors for content()
                                         │
                       pure functions (unit-tested)
                       ├─ pacing(segments, words)
                       ├─ fluency(words)
                       ├─ content(words, tips, embed)
                       └─ rate(metrics) → 3 ratings + breakdown
                                         │
                                         ▼
                                   Results panel
```

| Unit | Does | Interface |
| --- | --- | --- |
| `lib/speech/recorder.ts` | Captures the mic, resamples to 16 kHz mono, feeds the waveform | `start()`, `stop() → Float32Array` |
| `workers/analysis.worker.ts` | Owns all models, off the main thread | `load` → progress events; `analyse(audio, question)` → `Result` + step progress |
| Silero VAD (~2 MB) | Finds speech vs silence in the audio itself | → `segments [{start, end}]` |
| Whisper `base.en` (~75 MB) | Transcribes with word timestamps; a filler-heavy initial prompt nudges it to keep fillers | → `words [{text, start, end}]` |
| MiniLM (~23 MB) | Embeds rubric points and transcript windows | → vectors for `content()` |
| `lib/analysis/fluency.ts` | Counts fillers with context rules ("it's, like, slow" counts; "I like React" doesn't) and hesitations (`hesitation.ts`) | `fluency(words, segments)` |
| `lib/analysis/pacing.ts` | Long pauses, longest pause + preceding words, rate, length | `pacing(segments, words)` |
| `lib/analysis/content.ts` | Splits `tips.hit` into points, marks covered or missed | `content(words, tips, embed)` |
| `lib/analysis/rate.ts` | Applies thresholds, writes breakdown lines | `rate(metrics) → Result` |

Models load through Transformers.js (ONNX), using WebGPU where available and WASM otherwise. They download from Hugging Face's CDN and are stored in the browser cache; audio is never sent anywhere. Multi-threaded WASM needs cross-origin isolation (COOP/COEP headers), set only on the practice route so other pages and embeds are unaffected.

**Stage 2** adds an optional fourth model in the same worker: a small LLM via WebLLM that takes the finished `Result` and writes a short feedback paragraph. The core path never depends on it.

## Rating rules

Each dimension gets Strong, Good or Needs work using the starting thresholds below, all kept in `lib/analysis/thresholds.ts` and tuned during calibration.

| Dimension | Strong | Good | Needs work | Breakdown example |
| --- | --- | --- | --- | --- |
| Fluency (fillers + hesitations per minute) | under 3 | 3–6 | over 6 | "you said 'like' 6 times, 'um' 4 times, 'basically' 3 times" · "4 hesitations, longest after 'the thing about…'" |
| Pacing | 0–1 long pauses, normal rate and length | 2–3 long pauses, or rate or length off | 4+ long pauses, or rate and length both off | "longest pause 4.2s, after 'so the browser…'" |
| Content (rubric points covered) | 70% or more | 40–69% | under 40% | "covered 5 of 7 points; missed: layout, paint" |

Definitions:

- **Hesitation:** 0.8 s or more of voiced time after a word, beyond 0.25 s + 0.07 s per letter, before the next word. Silence in that span is a pause instead.
- **Long pause:** 2.5 s or more of silence mid-answer. Silence before the first word is thinking time; up to 5 s is free, beyond that it counts as one long pause.
- **Normal rate:** 110–170 words per minute. **Normal length:** 30 s to 2:30.
- **Avoid tips are not graded** (decided 2026-10-04): sentence embeddings can't see negation, so in the golden set strong answers that covered the avoid topic correctly were downgraded. The "Avoid" tip stays visible in the results' tips panel.
- **Thin rubric:** when `tips.hit` yields fewer than 3 points (common for behavioural questions), Content is graded on structure instead: situation and task, action, result.
- **Not graded:** under 15 words detected shows "We couldn't hear enough to grade. Check your mic and try again" with no ratings.

Breakdown lines describe what happened, never the person: "you said 'like' 6 times", not "you're not fluent".

## Errors and edge cases

Every failure gives the user a clear next step and never affects the deck behind the overlay.

| Area | Situation | Behaviour |
| --- | --- | --- |
| Device | No WebGPU | WASM fallback; notice before setup: "Analysis may take up to a minute on this device" |
| Device | No WASM or no `getUserMedia` | **Analyse my answer** is hidden; v1 deck works as normal |
| Device | Model fails to load or runs out of memory | "Your device couldn't load the analysis model" + Retry |
| Device | Mobile browsers | Supported but labelled "best on a laptop" until Stage 0 confirms phone performance |
| Setup | Download interrupted | Resumes from cache with Retry; each model cached separately |
| Setup | Storage full | "Not enough space to store the analysis model (~140 MB)" |
| Setup | User cancels download | Back to the consent screen; nothing broken |
| Mic | Permission denied | Browser-specific steps to re-enable; Start stays disabled |
| Mic | Input level flat (a dead mic, not just a quiet speaker) for 5 s | "We can't hear you. Check your microphone" shown during recording; normal silence while thinking never triggers it |
| Mic | Device unplugged mid-recording | Stop, then offer "Analyse what we have" or "Discard" |
| Recording | Reaches 3:00 | Stops and analyses automatically |
| Recording | Fewer than 15 words | Not graded message + Try again |
| Recording | Tab hidden | Recording continues |
| Analysis | Crash or hang | Timeout 60 s (WebGPU) or 180 s (WASM), then "Analysis failed. Try again"; worker restarts, cached models kept |
| Analysis | Overlay closed mid-analysis | Job cancelled; nothing kept |
| Content | Non-English speech | Below a transcription-confidence threshold: "This works best for answers in English" |
| Content | Reviewer edits `tips.hit` in Sanity | Rubric is derived at analysis time, so it updates automatically |

## Delivery, testing and success

v2 ships in three stages, each releasable on its own; Stage 0 must pass before Stage 1 UI work starts.

**Stage 0 outcome (2026-10-03):** failed as specified (prompting is unsupported, natural fillers are not transcribed, 3-minute analysis ~24 s, download ~300 MB) and continued with three agreed changes: chunked transcription during recording, hesitation detection, and a compact model profile. Stage 0b re-measures the compact profile and streaming speed.

1. **Stage 0: Spike (about 1 week).** Prove the two riskiest assumptions with real recordings.
    - Filler retention: 20 hand-labelled, filler-heavy answers. Pass = at least 80% of "um", "uh" and "like" detected. Fail → detect "um/uh" acoustically (voiced VAD segments with no matching word), then consider CrisperWhisper.
    - Speed: a 3-minute answer on an M1 or recent Windows laptop with and without WebGPU, plus a mid-range Android phone. Pass = under 15 s with WebGPU, under 60 s without.
2. **Stage 1: Core v2.** Overlay, three ratings, breakdown, highlighted transcript, playback, Try again and New question.
3. **Stage 2: Detailed feedback.** Optional on-device LLM paragraph for capable devices.

**Automated tests**, using the existing `node:test` style:

- Unit tests for `fluency`, `pacing`, `content` and `rate` with hand-written word and segment fixtures, covering every threshold boundary, the "like" context rules, the thinking-time allowance, and the not-graded case.
- A golden set of 10 seed questions × 3 answers (strong, partial, off-topic) with expected ratings. A strong answer rated Needs work, or an off-topic answer rated Strong, fails the build.
- Overlay tests: focus trap, Esc and Back confirmation, Try again and New question transitions, deck state unchanged after close (the reducer is unit-tested; overlay DOM behaviour is checked manually in the browser — no DOM test setup yet).

**Calibration:** before release, tune `thresholds.ts` until ratings agree with a human reviewer on at least 80% of the golden set plus about 20 real answers.

**Success criteria:**

| Metric | Target |
| --- | --- |
| Stop to results, reference laptop with WebGPU | 15 s or less |
| First-time setups completed (download + mic granted) | 90% |
| Dealt cards with an analysis attempt, among set-up users | 30% |
| Results followed by Try again | 25% |

Measuring these needs anonymous events only (`setup_completed`, `analysis_run` with duration, `try_again`), never transcripts, audio or scores.

**Risks and open questions:**

- [x] Whisper drops natural fillers and prompting is unsupported (Stage 0); Fluency adds VAD-based hesitations.
- [ ] Analytics provider is still open (Vercel Analytics or PostHog); success metrics depend on it.
- [ ] Self-hosting models (e.g. on Vercel Blob) instead of Hugging Face's CDN is a follow-up, not v2.
- [ ] Phone support level depends on Stage 0 timings.
