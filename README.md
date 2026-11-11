# Raaz (راز) — AI Detective

A detective game set in Pakistan where **every suspect is an AI**, and one of them is lying.
Built for **#BuildHybridAI** with Firebase AI Logic hybrid inference.

## Why hybrid
| Job | Where it runs | Why |
|---|---|---|
| Questioning suspects (many short turns) | **On-device** (Gemini Nano in Chrome) 🔒, cloud fallback | Instant, free, private, works offline |
| Writing a brand-new case (long JSON) | **Cloud** (Gemini Flash-Lite) ☁️ | Needs a bigger model |

Every reply shows a 🔒 / ☁️ badge so you can see where it ran (`response.inferenceSource`).

## The Truth Engine
LLMs drift, so the facts live in code, not the model (`web/src/engine/truth.ts`):
- Each suspect only sees **its own slice** of the case file.
- Replies are checked: no confessions, no breaking character, innocents can't name the culprit, ≤ 90 words. Bad replies are retried, then replaced by a safe line.
- Clues are revealed by keyword, and the notebook flags **contradictions** against the culprit's lie.
- Cloud-written cases are rejected unless they are **fair**: 4 suspects, 1 culprit with a lie, a clue that contradicts it.
- Scoring: culprit 60 + motive 20 + key clue 20 + 10 bonus for ≤ 12 questions.

## Features
- 3 offline starter cases (Lahore, Karachi, a haveli) + unlimited cloud-written cases
- English / اردو
- Installable PWA, plays offline
- Notebook, hints, accusation and reveal

## Run it
```bash
cd web
cp .env.example .env   # fill in your Firebase web config
npm install
npm run dev
npm test               # 13 Truth Engine tests
```
Firebase setup: enable **AI Logic** (Gemini Developer API), **App Check**, **Anonymous Auth**. Spark (free) plan is enough.
For on-device AI use desktop Chrome with the Prompt API / Gemini Nano available.

## Cost
$0: Spark plan, Gemini Developer API free tier, on-device inference for most turns.

## License
Apache-2.0. All cases and people are fictional.

## Android
`android/` is a native Kotlin + Jetpack Compose app using `firebase-ai` with `firebase-ai-ondevice`
(`InferenceMode.PREFER_ON_DEVICE`): Gemini Nano via AICore on supported phones, cloud otherwise.
The Truth Engine is ported to Kotlin (`Truth.kt`) and shares the same case files (`assets/cases.json`).
```bash
cd android
./gradlew testDebugUnitTest assembleDebug
```
Put your own `app/google-services.json` in place first. On first launch the debug App Check
provider logs a token to Logcat; add it in Firebase → App Check → Manage debug tokens.
