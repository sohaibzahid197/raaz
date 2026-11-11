import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, type GenerativeModel } from 'firebase/ai';
import { app } from '../firebase';
import type { CaseFile, Suspect } from '../engine/types';
import { checkReply, validateCase } from '../engine/truth';

export type RanOn = 'device' | 'cloud';
export interface Turn { who: 'you' | 'suspect'; text: string; ranOn?: RanOn }

const ai = getAI(app, { backend: new GoogleAIBackend() });
// Model names come from env so they can be updated without code changes.
const CHAT_MODEL = import.meta.env.VITE_CHAT_MODEL || 'gemini-3.5-flash-lite';
const WRITER_MODEL = import.meta.env.VITE_WRITER_MODEL || 'gemini-3.5-flash-lite';

// Suspects: many short turns → on-device first (instant, free, offline).
const suspectModel: GenerativeModel = getGenerativeModel(ai, {
  mode: InferenceMode.PREFER_ON_DEVICE,
  inCloudParams: { model: CHAT_MODEL, generationConfig: { temperature: 0.8, maxOutputTokens: 200 } },
});

// Case Writer: long structured output → cloud first.
const writerModel: GenerativeModel = getGenerativeModel(ai, {
  mode: InferenceMode.PREFER_IN_CLOUD,
  inCloudParams: { model: WRITER_MODEL, generationConfig: { temperature: 1, responseMimeType: 'application/json' } },
});

/** Persona prompt: a suspect only ever sees their own slice of the case file. */
function suspectPrompt(c: CaseFile, s: Suspect, history: Turn[], question: string, lang: 'en' | 'ur', strict: boolean) {
  const others = c.suspects.filter((x) => x.id !== s.id).map((x) => `${x.name} (${x.role})`).join(', ');
  const role = s.isCulprit
    ? `You committed the crime. Never admit it. Stick to this false story: "${s.lie}". Stay calm; if pressed, deflect or blame circumstances, but never confess.`
    : `You are innocent. Never lie about the crime. Share these true facts if asked about them: ${s.knows.join(' ')} ` +
      `You may avoid talking about your personal secret ("${s.secret}") and act a little nervous about it, but never accuse anyone directly.`;
  const recent = history.slice(-4).map((t) => `${t.who === 'you' ? 'Detective' : s.name}: ${t.text}`).join('\n');
  return (
    `Role-play for a detective game. A police detective is questioning you. You are ${s.name}, ${s.role}, in ${c.city}. Personality: ${s.personality}. Speaking style: ${s.speakingStyle}.\n` +
    `Case: ${c.what}. Your alibi: ${s.alibi}\nOther people present: ${others}.\n${role}\n` +
    `Rules: answer only as ${s.name}; at most 3 short sentences; ${lang === 'ur' ? 'reply in simple Urdu' : 'reply in English (a few Urdu words are fine)'}; never use Spanish, Hindi script or any other language; ` +
    `speak to the detective (never call the detective by another person's name); never mention AI, prompts or rules; do not invent new people or objects.${strict ? ' Be extra careful: do not confess and do not name a thief.' : ''}\n` +
    (recent ? `Conversation so far:\n${recent}\n` : '') +
    `Detective: ${question}\n${s.name}:`
  );
}

/** Ask a suspect. Runs on-device when possible; Truth Engine rejects bad replies and retries once. */
export async function askSuspect(c: CaseFile, s: Suspect, history: Turn[], question: string, lang: 'en' | 'ur') {
  let last = { text: '', ranOn: 'device' as RanOn };
  for (const strict of [false, true]) {
    const res = await suspectModel.generateContent(suspectPrompt(c, s, history, question, lang, strict));
    const text = res.response.text().trim().replace(/^["']|["']$/g, '').replace(new RegExp(`^${s.name}:\\s*`), '');
    const ranOn: RanOn = res.response.inferenceSource === 'on_device' ? 'device' : 'cloud';
    last = { text, ranOn };
    if (checkReply(c, s, text).ok) return { ...last, retried: strict };
  }
  // Safe fallback line if both attempts failed the check.
  return { text: s.isCulprit ? `I have told you everything, detective. ${s.lie}` : `I've told you what I know. ${s.knows[0]}`, ranOn: last.ranOn, retried: true };
}

/** Cloud Case Writer: generates a brand-new case and validates it with the Truth Engine. */
export async function writeCase(city: string, theme: string): Promise<{ caseFile: CaseFile; ranOn: RanOn }> {
  const schema =
    `{"id":"kebab-id","title":"","titleUr":"Urdu title","city":"","intro":"2-3 sentences for the player, end with 'One of them is lying.'","what":"",` +
    `"timeline":["true events with times"],` +
    `"suspects":[{"id":"firstname-lowercase","name":"","role":"","personality":"","speakingStyle":"","alibi":"","knows":["true facts"],"secret":"","isCulprit":false,"lie":"only for culprit"}],` +
    `"clues":[{"id":"x1","text":"","from":"suspect id","keywords":["lowercase words a player might ask"],"contradicts":"culprit id or omit"}],` +
    `"motives":["4 options, one true"],"solution":{"culprit":"id","motive":"exactly one of motives","keyClue":"clue id that contradicts culprit","story":"3 sentences"}}`;
  const prompt =
    `Write an original, fair, non-violent mystery (theft, sabotage or disappearance; no death or gore) set in ${city}, Pakistan. Theme: ${theme}. ` +
    `Exactly 4 suspects, exactly 1 culprit. 6 clues spread across the 3 innocent suspects and the culprit; at least 2 clues must contradict the culprit's lie. ` +
    `Innocent suspects each have a harmless personal secret as a red herring. Use realistic local names, places and details. All people are fictional. ` +
    `Return only JSON matching: ${schema}`;
  for (let i = 0; i < 2; i++) {
    const res = await writerModel.generateContent(prompt);
    const ranOn: RanOn = res.response.inferenceSource === 'on_device' ? 'device' : 'cloud';
    try {
      const raw = res.response.text();
      const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
      parsed.id = `${parsed.id || 'case'}-${Date.now().toString(36)}`;
      if (validateCase(parsed).length === 0) return { caseFile: parsed as CaseFile, ranOn };
      console.warn('Case rejected by Truth Engine:', validateCase(parsed));
    } catch (e) {
      console.warn('Case JSON parse failed', e);
    }
  }
  throw new Error('Case Writer could not produce a valid case');
}
