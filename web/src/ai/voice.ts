// Voice interrogation: speech in, speech out. Uses the browser's built-in Web Speech API (free, no server).
type Lang = 'en' | 'ur';
const locale = (l: Lang) => (l === 'ur' ? 'ur-PK' : 'en-US');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Rec: any = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
export const canListen = !!Rec;
export const canSpeak = typeof speechSynthesis !== 'undefined';

/** Listen once and resolve with the transcript ('' if nothing heard). */
export function listen(lang: Lang): { done: Promise<string>; stop: () => void } {
  const r = new Rec();
  r.lang = locale(lang);
  r.interimResults = false;
  r.maxAlternatives = 1;
  const done = new Promise<string>((resolve) => {
    let text = '';
    r.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => { text = e.results[0][0].transcript; };
    r.onerror = () => resolve('');
    r.onend = () => resolve(text.trim());
  });
  r.start();
  return { done, stop: () => r.stop() };
}

/** Pick a voice for the language; male/female varied by suspect so each sounds different. */
function pickVoice(lang: Lang, seed: number): SpeechSynthesisVoice | undefined {
  const all = speechSynthesis.getVoices();
  const want = lang === 'ur' ? ['ur', 'hi'] : ['en-IN', 'en-GB', 'en'];
  for (const w of want) {
    const vs = all.filter((v) => v.lang.toLowerCase().startsWith(w.toLowerCase()));
    if (vs.length) return vs[seed % vs.length];
  }
  return undefined;
}

export function speak(text: string, lang: Lang, seed = 0) {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = locale(lang);
  const v = pickVoice(lang, seed);
  if (v) u.voice = v;
  u.pitch = 0.85 + (seed % 4) * 0.1; // each suspect gets a slightly different voice
  u.rate = 0.98;
  speechSynthesis.speak(u);
}

export const stopSpeaking = () => canSpeak && speechSynthesis.cancel();
