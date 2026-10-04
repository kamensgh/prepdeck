# v2 Stage 0 results

Measured 2026-10-03 on the lab bench (`/lab/speech`), MacBook with WebGPU, Chrome. Six runs over four recordings (25–73 s), filler prompt on and off.

## Decision

**FAIL as specified; continue with three plan changes** agreed with the product owner on 2026-10-03:

1. **Speed:** transcribe in ~25 s chunks while the user records (plan amendment Tasks 8c–8d).
2. **Fillers:** keep counting the word fillers Whisper transcribes, and add **hesitations**: voiced time no word accounts for, located with VAD (Task 8b).
3. **Download:** add a compact quantisation profile and A/B it against the current one (Task 4b), then set the setup copy to the measured size.

## Filler retention

| Recording | Deliberate fillers? | Whisper kept um/uh? | Prompt on vs off |
| --- | --- | --- | --- |
| Run 1/2: self-intro, 73 s | No (natural speech) | None transcribed | Byte-identical |
| Run 3: company, 72 s | No | None transcribed | — |
| Run 4: "um um um like…", 25 s | Yes | All kept (9 um, 1 uh) | — |
| Run 5/6: casual, 34 s | Some | 6 um kept | Byte-identical |

- **The filler prompt is a no-op.** Transformers.js has no `get_prompt_ids` on the Whisper tokenizer, and the `prompt_ids` generation option is commented out in its source. `USE_FILLER_PROMPT` is set to `false`.
- **Natural hesitations are absorbed into stretched words**, not dropped silently: in run 1, "And" spans 17.24–22.36 s (5.1 s), "Zego" 2.9 s and "about" 3.0 s, while VAD shows continuous speech across most of those spans.
- The recall percentages the bench printed are not valid: the same short hand label was used for every run, so each run shows exactly one labelled um/uh/like.

## Speed (Stop → words + segments, WebGPU, whole recording at once)

| Audio | Whisper s | VAD s | Total s |
| --- | --- | --- | --- |
| 25 s | 1.2 | 0.2 | 1.4 |
| 34 s | 4.3 | 0.2 | 4.5 |
| 72 s | 7.5 | 1.2 | 8.8 |
| 73 s | 6.9–8.8 | 1.2–2.7 | 9.7–10.0 |

About 0.13 s per audio second, so a 3-minute answer would take ~24 s: **fails** the 15 s target. Chunked transcription during recording leaves only the last chunk (≤ 25 s of audio, ~3 s) after Stop.

## Pauses

VAD-based pause detection works where word timings fail: run 1's 3.2 s silence (18.72–21.89 s) sits inside the single word "And" (17.24–22.36 s), so word gaps alone would miss it. This confirms the spec's choice of VAD for pauses.

## Download

Measured from the browser cache: **~300 MB**, not ~100 MB.

| File | Current | Smallest sensible option |
| --- | --- | --- |
| Whisper encoder | fp32 78.6 MB | fp16 39.4 MB (WebGPU with shader-f16) / q8 22.1 MB (WASM) |
| Whisper decoder (merged) | q4 118.0 MB | q4f16 65.4 MB / q8 51.2 MB |
| MiniLM | fp32 86.2 MB | q8 21.9 MB |
| Tokenizer + ONNX runtime | ~8 MB | ~8 MB |

The compact profile is ~135 MB on WebGPU with f16 and ~103 MB on WASM. Transcript quality must be A/B checked on the same recordings before switching (Task 4b).

## Other findings

- Model id that loaded: `onnx-community/whisper-base.en_timestamped`. Models load in 12.3 s on WebGPU after download.
- Cache name: `transformers-cache`. `crossOriginIsolated` is `true` after client-side navigation.
- VAD needed `modelURL` + `ortConfig` (vad-web 0.0.31 has no `baseAssetPath` on `NonRealTimeVAD`).
- Whisper emits punctuation-only tokens (`...`) as words; they must be dropped before counting words.
- Transcription errors on an accented intro ("Zegico", "nuts with", "get in -shot") are moderate; content grading via embeddings should tolerate them, to be confirmed in calibration.

## Still to measure (Stage 0b)

- Compact vs quality profile on the same recordings (Task 4b).
- Stop → results with streaming on a 3-minute answer (Task 8d lab check).
- No-WebGPU laptop, mid-range Android phone, and 2 non-English answers.
