# Raaz — Demo Video Script (target 2:45, keep under 3:00)

**Setup before recording**
- Desktop Chrome on your Mac (Gemini Nano works here), window about 1440 px wide, zoom 110%.
- Open the live site https://raaz-4ce63.web.app and do one warm-up question first, so Nano is already loaded.
- Do **not** reuse a finished case: clear site data or use a fresh profile so the notebook starts empty.
- Have the Android emulator or your phone ready for shot 7.
- Record with QuickTime (File → New Screen Recording) and your mic, or record the voice separately and lay it over.
- Speak slowly. Every claim below has been checked to be true.

---

### 0:00–0:15 · Hook
**Screen:** home page, slow zoom on the tagline "Every suspect is an AI. One of them is lying."
**Voice:**
> "Four suspects. One stolen locket. Every suspect is an AI, and one of them has been told to lie to you. This is Raaz: a detective game built on Firebase hybrid AI."

### 0:15–0:35 · The case
**Screen:** click **The Anarkali Locket**. Show the typewriter case file, then the 4 suspect cards.
**Voice:**
> "Anarkali Bazaar, Lahore. A 300-year-old Mughal locket vanished during a seven-minute power cut. I can question anyone, in my own words, in English or Urdu."

### 0:35–1:05 · Interrogation runs on the device
**Screen:** open **Sana**. Type: *"When was the power cut?"* Zoom in on the **🔒 On-device** badge.
Then type: *"Who was at the back counter when the lights came back?"* The clue drops into the notebook.
**Voice:**
> "Each answer runs on my laptop with Gemini Nano, through Firebase AI Logic in prefer-on-device mode. You see the lock on every reply. Interrogation is dozens of short turns, so on-device makes it instant, private and free. And it keeps working offline."

### 1:05–1:30 · The liar
**Screen:** go back to the board: Farhan's card is now **red: ⚠ Contradiction**. Open **Farhan**, ask *"Where were you during the power cut?"* He holds his lie. Then ask *"Did you take the locket?"* He denies it calmly.
**Voice:**
> "Sana's answer just broke Farhan's alibi, and the notebook flags it. Farhan is the culprit, and the AI is holding his lie under pressure. It won't confess, however hard I push."

### 1:30–1:55 · The Truth Engine
**Screen:** split view or a quick cut to code: `truth.ts` (`checkReply`), then the terminal running `npm test` with **14 passed**.
**Voice:**
> "Small models drift, so in Raaz the facts live in code. Each suspect only knows its own part of the case. Every reply is checked before you see it: no confessions, no breaking character, and no innocent suspect inventing hints. Cases have to be fair, and it's all covered by unit tests."

### 1:55–2:15 · Accuse and score
**Screen:** **Make an accusation** → Farhan → *Gambling debt* → the back-counter clue → **Accuse** → **110/110 · Master Detective**, then the story reveal.
**Voice:**
> "Suspect, motive, proof. Solved."

### 2:15–2:35 · The cloud writes new cases
**Screen:** home → **Write a new case**, choose **Karachi** and type a theme, for example *"a rickshaw rally"*. A new case appears in about 8 seconds with the ☁️ badge.
**Voice:**
> "When you run out of cases, the cloud takes over. Writing a full mystery needs a bigger model, so the Case Writer runs on Gemini in the cloud. Then the Truth Engine checks the case is solvable before you can play it. That's the hybrid split: chat on the device, creation in the cloud."

### 2:35–2:45 · Android and offline
**Screen:** 3 seconds of the Android app (Bilal answering, ☁️ badge). Then the browser with DevTools → Network → **Offline**: reload, the game still opens, and a suspect answers 🔒.
**Voice:**
> "There's also a native Android app with the same rules, and it falls back to the cloud on phones without Nano. On the web it's installable and plays offline."

### 2:45–2:55 · Close
**Screen:** logo with the URL `raaz-4ce63.web.app`.
**Voice:**
> "Raaz. Built with Firebase AI Logic for zero cost. One of them is lying. Can you find out who?"

---

**Tips for winning polish**
- Add captions (judges often watch muted). CapCut auto-captions are free.
- Add a quiet tabla or suspense track under the voice: YouTube Audio Library, free.
- Cut all waiting time. If a reply takes several seconds, speed up that clip.
- Make the 🔒 / ☁️ badges big on screen (zoom in when editing). That's the hybrid story judges look for.
- Upload to YouTube as **Unlisted** or **Public** (follow the rules once they're posted) and paste the link into Devpost.
