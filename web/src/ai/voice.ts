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

export type Gender = 'female' | 'male';

// Browsers don't expose a voice's gender, so we match well-known voice names.
const FEMALE = /female|samantha|karen|moira|tessa|veena|lekha|kanya|victoria|allison|ava|susan|zira|heera|kalpana|swara|catherine|martha|kathy|nicky|serena|fiona|neerja|uzma|salma|flo|sandy|shelley|grandma/i;
const MALE = /\bmale|daniel|rishi|alex|fred|aaron|arthur|gordon|ralph|thomas|oliver|david|mark|ravi|hemant|prabhat|madhur|asad|george|rocko|reed|eddy|albert|junior|grandpa/i;
const MALE_A_NAMES = /^(mustafa|raza|hamza|musa|taha|yahya|isa|murtaza|mujtaba|ata|baba|abba|dada|chacha|mama)$/i;

/** Gender for a suspect: from the case file, else guessed from the first name (older AI-written cases). */
export function genderOf(s: { name: string; gender?: Gender }): Gender {
  if (s.gender === 'female' || s.gender === 'male') return s.gender;
  const words = s.name.toLowerCase().replace(/'[^']*'|\([^)]*\)/g, ' ').split(/\s+/).filter(Boolean);
  if (words.some((w) => /^(dadi|nani|ammi|amma|begum|bibi|apa|baji|khala|phuppo|mrs|miss|ms)$/.test(w))) return 'female';
  const first = words.find((w) => !/^(uncle|captain|dr|mr|chacha|haji|sheikh|syed)$/.test(w)) ?? '';
  return /(a|ah|ee|i)$/.test(first) && !MALE_A_NAMES.test(first) && !/^(ali|ghazi|qazi|hadi|wali|sami|nabi)$/.test(first) ? 'female' : 'male';
}

/** Pick a voice for the language and gender; vary between voices so suspects sound different. */
function pickVoice(lang: Lang, gender: Gender, seed: number): SpeechSynthesisVoice | undefined {
  const all = speechSynthesis.getVoices();
  const want = lang === 'ur' ? ['ur', 'hi'] : ['en-IN', 'en-GB', 'en'];
  const match = gender === 'female' ? FEMALE : MALE;
  const other = gender === 'female' ? MALE : FEMALE;
  for (const w of want) {
    const vs = all.filter((v) => v.lang.toLowerCase().startsWith(w.toLowerCase()));
    const exact = vs.filter((v) => match.test(v.name) && !(gender === 'female' && /\bmale/i.test(v.name.replace(/female/i, ''))));
    // Prefer voices installed on the device: network voices can fail silently and fall back to a default voice.
    const local = exact.filter((v) => v.localService);
    const pool = local.length ? local : exact;
    if (pool.length) return pool[seed % pool.length];
  }
  // No named match: any voice for the language that isn't clearly the other gender (pitch does the rest).
  for (const w of want) {
    const vs = all.filter((v) => v.lang.toLowerCase().startsWith(w.toLowerCase()) && !other.test(v.name));
    if (vs.length) return vs[seed % vs.length];
  }
  return undefined;
}

export function speak(text: string, lang: Lang, seed = 0, gender: Gender = 'male') {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = locale(lang);
  const v = pickVoice(lang, gender, seed);
  if (v) u.voice = v;
  // Small per-suspect variation, centred higher for women and lower for men.
  u.pitch = (gender === 'female' ? 1.15 : 0.85) + (seed % 3) * 0.07;
  u.rate = 0.98;
  speechSynthesis.speak(u);
}

export const stopSpeaking = () => canSpeak && speechSynthesis.cancel();
