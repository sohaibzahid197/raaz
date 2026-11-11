# Raaz (راز) — Every suspect is an AI. One of them is lying.

**Tagline (Devpost, max 200 chars):**
A detective game where every suspect is a live AI, interrogated on-device with Gemini Nano, while the cloud writes endless new mysteries — and a Truth Engine makes sure the AI never cheats.

**Play:** https://raaz-4ce63.web.app (desktop Chrome for on-device AI) · **Android:** APK in repo · **Code:** _GitHub link_

---

## Inspiration
Most AI apps make the model the hero. We wanted a game where the model has to *lie convincingly, on purpose, and still play fair*.

Detective fiction is huge in Pakistan and South Asia, from Ibn-e-Safi novels to TV crime dramas. But there is almost no interactive mystery set in our own bazaars, havelis and markets, in our own languages.

AI mystery games already exist. They all have the same two problems:
1. **The AI cheats.** It confesses when pushed, forgets its alibi, or makes up a different story every time.
2. **Every question costs a server call.** An interrogation is dozens of short turns, which is slow and expensive at scale.

Hybrid inference fixes the second problem. A Truth Engine fixes the first.

## What it does
You are a detective in Lahore or Karachi. Four suspects, one crime, one liar.

- **Interrogate suspects in free text, in English or Urdu.** Each suspect is a separate AI persona with its own personality, speaking style, alibi and secret.
- **The culprit lies and holds the lie under pressure.** Innocent suspects tell the truth but get nervous about harmless personal secrets (red herrings).
- **Clues unlock from what you ask.** Ask the right suspect about the right time, place or object, and the clue goes into your **Notebook**.
- **Contradictions light up.** When a clue breaks someone's story, their card turns red: ⚠ Contradiction.
- **Accuse:** pick the suspect, the motive and your proof. You're scored out of 110, with a bonus for solving in 12 questions or fewer. Ranks run from Constable to Master Detective.
- **Infinite cases:** the cloud **Case Writer** creates a brand-new fair mystery for any city and theme in about 6–10 seconds.
- **Every reply shows where it ran:** 🔒 On-device or ☁️ Cloud.
- **Works offline:** installable PWA. The 3 built-in cases and on-device suspects play with no internet.

## How we built it — the hybrid design
We split the work by what each side is best at:

| Task | Where | Why |
|---|---|---|
| Suspect interrogation (many short turns) | **On-device**: Gemini Nano via Firebase AI Logic, `InferenceMode.PREFER_ON_DEVICE` | Instant, free per turn, private, works offline |
| Writing a whole new case (long structured JSON) | **Cloud**: Gemini Flash-Lite, `PREFER_IN_CLOUD` | Needs a bigger model and world knowledge |
| Device without Nano | Automatic cloud fallback | Every player gets the full game |

`response.inferenceSource` drives the 🔒/☁️ badge on every message, so the hybrid split is visible, not hidden.

**Stack**
- **Web:** React + TypeScript + Vite, `firebase/ai` hybrid inference, installable PWA (Workbox) for offline play.
- **Android:** native Kotlin + Jetpack Compose, `firebase-ai` + `firebase-ai-ondevice` (Gemini Nano via AICore when available).
- **Firebase:** AI Logic (Gemini Developer API), App Check (reCAPTCHA in production, so the API can't be abused), Hosting.
- **Cost: $0.** Spark plan, free Gemini Developer API tier, and most turns run on the device.

## The Truth Engine (what makes it fair)
LLMs drift, so in Raaz **the facts live in code, not in the model.**

- **Need-to-know prompts:** each suspect only receives *its own* slice of the case file. An innocent suspect literally does not know who did it.
- **Every reply is checked before you see it.** It's rejected if the suspect:
  - confesses
  - breaks character ("as an AI…")
  - is innocent and names the culprit
  - is innocent and talks about the culprit when none of its own facts do (this stops invented hints)
  - runs too long
  
  A rejected reply is retried with a stricter prompt, then replaced by a safe in-character line.
- **Clues and contradictions are deterministic.** The model never decides what you've found.
- **Cloud-written cases must pass validation before you can play them:**
  - exactly 4 suspects and 1 culprit
  - the culprit has a lie
  - at least one clue contradicts that lie, so every case is *solvable*
  - every reference in the case is valid
- **Same rules everywhere:** the Truth Engine is shared logic, ported to Kotlin so Android follows the same rules, and covered by **19 unit tests** (14 web + 5 Android).

## Challenges we ran into
- **Small models drift.** Nano sometimes switched languages, and an innocent suspect once "helpfully" placed the culprit at the scene, even using his surname to get around the name check. Each failure became a Truth Engine rule plus a test.
- **Fairness of generated cases.** Early generated cases had no clue that broke the culprit's story, which made them unsolvable. Validation now rejects and regenerates those.
- **Latency.** The first on-device question loads the model; after that, replies are fast. Choosing Flash-Lite for the Case Writer cut a full case from over a minute to under 10 seconds.
- **Securing a public $0 app.** We kept debug tokens out of the production bundle (and verified that in the build) and used reCAPTCHA-backed App Check on the live site.

## Accomplishments we're proud of
- A **real hybrid split with a reason behind it**, not a toggle: chatty, private, offline work on the device; heavy creative generation in the cloud.
- An AI that **lies on purpose and still plays fair**.
- **Two platforms:** web PWA plus a native Android app with the same rules.
- **Bilingual (English/Urdu)** and set in real Pakistani places.
- Runs at **zero cost**.

## What we learned
- On-device models are excellent at **short, persona-bound turns**, the exact shape of an interrogation.
- Guardrails belong in **deterministic code with tests**, not only in prompts.
- Showing users *where* the AI ran (🔒/☁️) builds trust.

## What's next
- Voice interrogation (speech in Urdu and English).
- Shared daily case: everyone gets the same mystery, with a leaderboard.
- Classroom mode for critical-thinking and English/Urdu practice.
- iOS app.
- More cities and regional languages (Punjabi, Sindhi, Pashto).

## Built with
firebase-ai-logic, gemini-nano, gemini, chrome-built-in-ai, firebase-app-check, firebase-hosting, react, typescript, vite, pwa, workbox, kotlin, jetpack-compose, android, vitest, junit
