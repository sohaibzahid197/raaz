import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { STARTER_CASES } from './engine/cases';
import { contradictions, revealClues, scoreAccusation, type Score } from './engine/truth';
import type { CaseFile, Suspect } from './engine/types';
import { askSuspect, writeCase, type RanOn, type Turn } from './ai/hybrid';
import { canListen, canSpeak, listen, speak, stopSpeaking } from './ai/voice';
import { boardId, submitScore, topScores, type Entry } from './ai/leaderboard';
import { dailyCase, dayKey, normalizeClassCode, reasoningReport } from './engine/daily';

type Lang = 'en' | 'ur';
type Screen = 'home' | 'board' | 'talk' | 'accuse' | 'result';

const L = {
  en: {
    tag: 'Every suspect is an AI. One of them is lying.', cases: 'Case files', play: 'Open case', newCase: 'Write a new case',
    writing: 'The Case Writer is at work…', city: 'City', theme: 'Theme', online: 'Online', offline: 'Offline: interrogations still work',
    suspects: 'Suspects', notebook: 'Notebook', noClues: 'Ask suspects questions. Clues appear here.', contradiction: 'Contradiction',
    accuse: 'Make an accusation', ask: 'Ask', askPh: 'Ask a question…', back: '← Back', thinking: 'thinking…',
    who: 'Who did it?', motive: 'Motive', proof: 'Your proof', submit: 'Accuse', solved: 'Case solved', wrong: 'Wrong suspect',
    story: 'What really happened', again: 'Back to case files', questions: 'Questions asked', device: 'On-device', cloud: 'Cloud',
    starter: 'Built-in (offline)', generated: 'Written by Case Writer', writeErr: 'Case Writer needs internet. Starter cases still work offline.',
    hints: ['Where were you when it happened?', 'Who else was there?', 'What did you see?'],
    today: "Today's case", todaySub: 'Same mystery for everyone today. Top detectives make the board.', board: 'Leaderboard',
    noScores: 'No scores yet. Be the first.', classroom: 'Classroom mode', classSub: 'Teachers: give students a class code. Everyone plays today\'s case and you see the class board and each student\'s reasoning.',
    name: 'Your name', code: 'Class code (optional)', viewClass: 'Show class board', badCode: 'Use 4–8 letters or numbers.',
    listen: 'Speak your question', listening: 'Listening…', voiceOn: 'Voice on', voiceOff: 'Voice off',
    report: 'Detective skills', post: 'Post score to board', posted: 'Score posted', postErr: 'Could not post (offline?)',
  },
  ur: {
    tag: 'ہر مشتبہ ایک اے آئی ہے۔ ان میں سے ایک جھوٹ بول رہا ہے۔', cases: 'کیس فائلیں', play: 'کیس کھولیں', newCase: 'نیا کیس لکھیں',
    writing: 'کیس رائٹر کام کر رہا ہے…', city: 'شہر', theme: 'موضوع', online: 'آن لائن', offline: 'آف لائن: پوچھ گچھ پھر بھی چلتی ہے',
    suspects: 'مشتبہ', notebook: 'نوٹ بک', noClues: 'سوال پوچھیں، سراغ یہاں آئیں گے۔', contradiction: 'تضاد',
    accuse: 'الزام لگائیں', ask: 'پوچھیں', askPh: 'سوال لکھیں…', back: 'واپس →', thinking: 'سوچ رہا ہے…',
    who: 'کس نے کیا؟', motive: 'وجہ', proof: 'ثبوت', submit: 'الزام', solved: 'کیس حل', wrong: 'غلط مشتبہ',
    story: 'اصل میں کیا ہوا', again: 'کیس فائلوں پر واپس', questions: 'سوالات', device: 'فون پر', cloud: 'کلاؤڈ',
    starter: 'بلٹ اِن (آف لائن)', generated: 'کیس رائٹر کا لکھا ہوا', writeErr: 'کیس رائٹر کو انٹرنیٹ چاہیے۔ پرانے کیس آف لائن چلتے ہیں۔',
    hints: ['واقعے کے وقت آپ کہاں تھے؟', 'اور کون موجود تھا؟', 'آپ نے کیا دیکھا؟'],
    today: 'آج کا کیس', todaySub: 'آج سب کے لیے ایک ہی معمہ۔ بہترین جاسوس بورڈ پر۔', board: 'لیڈر بورڈ',
    noScores: 'ابھی کوئی سکور نہیں۔ پہلے آپ بنیں۔', classroom: 'کلاس روم موڈ', classSub: 'استاد طلبہ کو کلاس کوڈ دیں۔ سب آج کا کیس کھیلیں اور آپ کلاس بورڈ اور ہر طالب علم کی سوچ دیکھیں۔',
    name: 'آپ کا نام', code: 'کلاس کوڈ (اختیاری)', viewClass: 'کلاس بورڈ دیکھیں', badCode: '4 سے 8 حروف یا ہندسے۔',
    listen: 'بول کر پوچھیں', listening: 'سن رہا ہے…', voiceOn: 'آواز آن', voiceOff: 'آواز بند',
    report: 'جاسوسی مہارتیں', post: 'سکور بورڈ پر بھیجیں', posted: 'سکور بھیج دیا', postErr: 'نہیں بھیج سکے (آف لائن؟)',
  },
};

function Badge({ on, t }: { on?: RanOn; t: typeof L.en }) {
  if (!on) return null;
  return <span className={`badge badge-${on}`}>{on === 'device' ? `🔒 ${t.device}` : `☁️ ${t.cloud}`}</span>;
}

const ls = (k: string, d = '') => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

function Board({ title, rows, t }: { title: string; rows: Entry[] | null; t: typeof L.en }) {
  return (
    <section className="card board">
      <h3>🏆 {title}</h3>
      {rows === null ? <p className="muted small">…</p> : rows.length === 0 ? <p className="muted small">{t.noScores}</p> : (
        <ol>{rows.map((r, i) => <li key={i}><span>{r.name}</span><b>{r.points}</b><span className="muted small">{r.questions} Q</span></li>)}</ol>
      )}
    </section>
  );
}

const loadGenerated = (): CaseFile[] => {
  try { return JSON.parse(localStorage.getItem('raaz.generated') || '[]'); } catch { return []; }
};

export default function App() {
  const [lang, setLang] = useState<Lang>('en');
  const t = L[lang];
  const [online, setOnline] = useState(navigator.onLine);
  const [screen, setScreen] = useState<Screen>('home');
  const [generated, setGenerated] = useState<CaseFile[]>(loadGenerated);
  const [cf, setCf] = useState<CaseFile | null>(null);
  const [talks, setTalks] = useState<Record<string, Turn[]>>({});
  const [found, setFound] = useState<string[]>([]);
  const [asked, setAsked] = useState(0);
  const [current, setCurrent] = useState<Suspect | null>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);
  const [writeMsg, setWriteMsg] = useState('');
  const [city, setCity] = useState('Karachi');
  const [theme, setTheme] = useState('a rickshaw rally');
  const [acc, setAcc] = useState({ suspectId: '', motive: '', clueId: '' });
  const [score, setScore] = useState<Score | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const today = dayKey();
  const daily = useMemo(() => dailyCase(STARTER_CASES, today), [today]);
  const [isDaily, setIsDaily] = useState(false);
  const [player, setPlayer] = useState(() => ls('raaz.name'));
  const [codeInput, setCodeInput] = useState(() => ls('raaz.class'));
  const classCode = normalizeClassCode(codeInput);
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [classRows, setClassRows] = useState<Entry[] | null>(null);
  const [posted, setPosted] = useState<'' | 'ok' | 'err'>('');
  const [voice, setVoice] = useState(() => ls('raaz.voice') === '1');
  const [hearing, setHearing] = useState(false);

  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false);
    addEventListener('online', up); addEventListener('offline', down);
    return () => { removeEventListener('online', up); removeEventListener('offline', down); };
  }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [talks, busy]);

  useEffect(() => {
    if (screen !== 'home' || !online) return;
    topScores(boardId(today)).then(setRows).catch(() => setRows([]));
  }, [screen, online, today]);
  function loadClass() {
    if (!classCode) return;
    lsSet('raaz.class', classCode);
    setClassRows(null);
    topScores(boardId(today, classCode)).then(setClassRows).catch(() => setClassRows([]));
  }

  const flags = useMemo(() => (cf ? contradictions(cf, found) : []), [cf, found]);
  const flagged = new Set(flags.map((f) => f.suspectId));

  function open(c: CaseFile, dailyMode = false) {
    setIsDaily(dailyMode); setPosted(''); stopSpeaking();
    setCf(c); setTalks({}); setFound([]); setAsked(0); setScore(null); setAcc({ suspectId: '', motive: '', clueId: '' }); setScreen('board');
  }

  async function send(text: string) {
    if (!cf || !current || !text.trim() || busy) return;
    const hist = talks[current.id] || [];
    const withQ = [...hist, { who: 'you' as const, text }];
    setTalks({ ...talks, [current.id]: withQ }); setQ(''); setBusy(true); setAsked((n) => n + 1);
    const newClues = revealClues(cf, current.id, text, found);
    try {
      const r = await askSuspect(cf, current, hist, text, lang);
      setTalks((tk) => ({ ...tk, [current.id]: [...withQ, { who: 'suspect', text: r.text, ranOn: r.ranOn }] }));
      if (voice) speak(r.text, lang, cf.suspects.indexOf(current));
    } catch (e) {
      console.warn(e);
      setTalks((tk) => ({ ...tk, [current.id]: [...withQ, { who: 'suspect', text: '…' }] }));
    }
    if (newClues.length) setFound((f) => [...f, ...newClues.map((c) => c.id)]);
    setBusy(false);
  }

  async function hear() {
    if (hearing) return;
    setHearing(true); stopSpeaking();
    const text = await listen(lang).done;
    setHearing(false);
    if (text) send(text);
  }

  async function post() {
    if (!score || !player.trim()) return;
    lsSet('raaz.name', player.trim());
    try {
      const e = { name: player.trim(), points: score.points, questions: Math.max(1, asked) };
      await submitScore(boardId(today), e);
      if (classCode) await submitScore(boardId(today, classCode), e);
      setPosted('ok');
      topScores(boardId(today)).then(setRows).catch(() => setRows([]));
      if (classCode) topScores(boardId(today, classCode)).then(setClassRows).catch(() => setClassRows([]));
    } catch (err) { console.warn(err); setPosted('err'); }
  }

  async function newCase() {
    setWriting(true); setWriteMsg('');
    try {
      const { caseFile } = await writeCase(city, theme);
      const list = [caseFile, ...generated].slice(0, 10);
      setGenerated(list); localStorage.setItem('raaz.generated', JSON.stringify(list));
      open(caseFile);
    } catch (e) {
      console.warn(e); setWriteMsg(t.writeErr);
    }
    setWriting(false);
  }

  function accuse() {
    if (!cf) return;
    setScore(scoreAccusation(cf, acc, asked)); setScreen('result');
  }

  return (
    <div className="app" dir={lang === 'ur' ? 'rtl' : 'ltr'}>
      <header>
        <button className="logo" onClick={() => setScreen('home')}>
          <span className="logo-ur">راز</span><span className="logo-en">RAAZ</span>
        </button>
        <div className="head-right">
          <span className={`net ${online ? 'on' : 'off'}`}>{online ? `● ${t.online}` : `○ ${t.offline}`}</span>
          <button className="ghost" onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}>{lang === 'en' ? 'اردو' : 'English'}</button>
        </div>
      </header>

      {screen === 'home' && (
        <main>
          <p className="tagline">{t.tag}</p>
          <button className="case-card today" onClick={() => open(daily, true)}>
            <span className="muted small">⭐ {t.today} · {today}</span>
            <span className="case-ur">{daily.titleUr}</span>
            <b>{daily.title}</b>
            <span className="muted">{t.todaySub}</span>
          </button>
          {online && <Board title={`${t.board} · ${today}`} rows={rows} t={t} />}
          <h2>{t.cases}</h2>
          <div className="cases">
            {[...generated, ...STARTER_CASES].map((c) => (
              <button key={c.id} className="case-card" onClick={() => open(c)}>
                <span className="case-ur">{c.titleUr}</span>
                <b>{c.title}</b>
                <span className="muted">{c.city} · {STARTER_CASES.includes(c) ? t.starter : `☁️ ${t.generated}`}</span>
              </button>
            ))}
          </div>
          <section className="card writer">
            <h3>☁️ {t.newCase}</h3>
            <div className="row">
              <label>{t.city}<select value={city} onChange={(e) => setCity(e.target.value)}>
                {['Karachi', 'Lahore', 'Islamabad', 'Peshawar', 'Multan', 'Hunza', 'Quetta'].map((x) => <option key={x}>{x}</option>)}
              </select></label>
              <label>{t.theme}<input value={theme} onChange={(e) => setTheme(e.target.value)} /></label>
            </div>
            <button className="primary" disabled={!online || writing} onClick={newCase}>{writing ? t.writing : t.newCase}</button>
            {writeMsg && <p className="warn">{writeMsg}</p>}
          </section>
          <section className="card">
            <h3>🎓 {t.classroom}</h3>
            <p className="muted small">{t.classSub}</p>
            <div className="row">
              <label>{t.name}<input value={player} maxLength={20} onChange={(e) => setPlayer(e.target.value)} /></label>
              <label>{t.code}<input value={codeInput} maxLength={8} onChange={(e) => setCodeInput(e.target.value)} placeholder="LHR7B" /></label>
            </div>
            {codeInput && !classCode && <p className="warn">{t.badCode}</p>}
            <button className="primary" disabled={!classCode || !online} onClick={loadClass}>{t.viewClass}</button>
            {classCode && classRows && <Board title={`${t.classroom} · ${classCode}`} rows={classRows} t={t} />}
          </section>
        </main>
      )}

      {cf && screen === 'board' && (
        <main>
          <section className="casefile">
            <span className="stamp">CASE FILE</span>
            <h1>{cf.title} <span className="case-ur">{cf.titleUr}</span></h1>
            <p>{cf.intro}</p>
          </section>
          <h2>{t.suspects}</h2>
          <div className="suspects">
            {cf.suspects.map((s) => (
              <button key={s.id} className={`suspect ${flagged.has(s.id) ? 'flag' : ''}`} onClick={() => { setCurrent(s); setScreen('talk'); }}>
                <span className="avatar">{s.name[0]}</span>
                <b>{s.name}</b><span className="muted">{s.role}</span>
                {flagged.has(s.id) && <span className="flag-tag">⚠ {t.contradiction}</span>}
                <span className="muted small">{(talks[s.id]?.length || 0) / 2 | 0} Q</span>
              </button>
            ))}
          </div>
          <Notebook cf={cf} found={found} flags={flags} t={t} />
          <button className="primary danger" onClick={() => setScreen('accuse')}>{t.accuse}</button>
        </main>
      )}

      {cf && current && screen === 'talk' && (
        <main className="talk">
          <div className="talk-head">
            <button className="ghost" onClick={() => setScreen('board')}>{t.back}</button>
            <div><b>{current.name}</b><div className="muted small">{current.role}</div></div>
            {canSpeak && <button className="ghost" onClick={() => { const v = !voice; setVoice(v); lsSet('raaz.voice', v ? '1' : '0'); if (!v) stopSpeaking(); }}>{voice ? `🔊 ${t.voiceOn}` : `🔈 ${t.voiceOff}`}</button>}
            <span className="avatar">{current.name[0]}</span>
          </div>
          <div className="chat">
            <p className="muted small alibi">“{current.alibi}”</p>
            {(talks[current.id] || []).map((m, i) => (
              <div key={i} className={`msg ${m.who}`}>
                <p>{m.text}</p>{m.who === 'suspect' && <Badge on={m.ranOn} t={t} />}
              </div>
            ))}
            {busy && <div className="msg suspect"><p className="muted">{current.name.split(' ')[0]} {t.thinking}</p></div>}
            <div ref={chatEnd} />
          </div>
          {!(talks[current.id]?.length) && (
            <div className="hints">{t.hints.map((h) => <button key={h} className="chip" onClick={() => send(h)}>{h}</button>)}</div>
          )}
          <form className="ask" onSubmit={(e) => { e.preventDefault(); send(q); }}>
            {canListen && <button type="button" className={`mic ${hearing ? 'on' : ''}`} title={t.listen} aria-label={t.listen} onClick={hear} disabled={busy}>{hearing ? '●' : '🎤'}</button>}
            <input value={q} placeholder={hearing ? t.listening : t.askPh} onChange={(e) => setQ(e.target.value)} disabled={busy || hearing} />
            <button className="primary" disabled={busy || !q.trim()}>{t.ask}</button>
          </form>
        </main>
      )}

      {cf && screen === 'accuse' && (
        <main>
          <button className="ghost" onClick={() => setScreen('board')}>{t.back}</button>
          <h2>{t.who}</h2>
          <div className="suspects">
            {cf.suspects.map((s) => (
              <button key={s.id} className={`suspect ${acc.suspectId === s.id ? 'picked' : ''}`} onClick={() => setAcc({ ...acc, suspectId: s.id })}>
                <span className="avatar">{s.name[0]}</span><b>{s.name}</b>
              </button>
            ))}
          </div>
          <h2>{t.motive}</h2>
          <div className="chips">{cf.motives.map((m) => <button key={m} className={`chip ${acc.motive === m ? 'picked' : ''}`} onClick={() => setAcc({ ...acc, motive: m })}>{m}</button>)}</div>
          <h2>{t.proof}</h2>
          {found.length === 0 && <p className="muted">{t.noClues}</p>}
          <div className="chips col">{cf.clues.filter((c) => found.includes(c.id)).map((c) => (
            <button key={c.id} className={`chip ${acc.clueId === c.id ? 'picked' : ''}`} onClick={() => setAcc({ ...acc, clueId: c.id })}>{c.text}</button>
          ))}</div>
          <button className="primary danger" disabled={!acc.suspectId || !acc.motive} onClick={accuse}>{t.submit}</button>
        </main>
      )}

      {cf && score && screen === 'result' && (
        <main>
          <section className={`card result ${score.culprit ? 'win' : 'lose'}`}>
            <h1>{score.culprit ? `✔ ${t.solved}` : `✘ ${t.wrong}`}</h1>
            <p className="big">{score.points}/{score.max} · {score.rank}</p>
            <p className="muted">{t.questions}: {asked} · {t.motive} {score.motive ? '✔' : '✘'} · {t.proof} {score.clue ? '✔' : '✘'}</p>
          </section>
          <section className="card report">
            <h3>🧠 {t.report}</h3>
            {reasoningReport(cf, acc, score, asked, found).map((k) => (
              <div key={k.key} className="skill"><b>{k.label}</b><span className="stars">{'★'.repeat(k.stars)}{'☆'.repeat(3 - k.stars)}</span><p className="muted small">{k.tip}</p></div>
            ))}
          </section>
          {isDaily && online && (
            <section className="card">
              <div className="row">
                <label>{t.name}<input value={player} maxLength={20} onChange={(e) => setPlayer(e.target.value)} /></label>
                <label>{t.code}<input value={codeInput} maxLength={8} onChange={(e) => setCodeInput(e.target.value)} /></label>
              </div>
              <button className="primary" disabled={!player.trim() || posted === 'ok' || (!!codeInput && !classCode)} onClick={post}>{posted === 'ok' ? `✔ ${t.posted}` : t.post}</button>
              {posted === 'err' && <p className="warn">{t.postErr}</p>}
              {posted === 'ok' && <Board title={`${t.board} · ${today}`} rows={rows} t={t} />}
              {posted === 'ok' && classCode && <Board title={`${t.classroom} · ${classCode}`} rows={classRows} t={t} />}
            </section>
          )}
          <section className="casefile">
            <span className="stamp">{t.story}</span>
            <p>{cf.solution.story}</p>
          </section>
          <button className="primary" onClick={() => setScreen('home')}>{t.again}</button>
        </main>
      )}

      <footer>Raaz · Firebase AI Logic hybrid inference · fictional cases</footer>
    </div>
  );
}

function Notebook({ cf, found, flags, t }: { cf: CaseFile; found: string[]; flags: { suspectId: string; clueId: string }[]; t: typeof L.en }) {
  const flaggedClues = new Set(flags.map((f) => f.clueId));
  return (
    <section className="notebook">
      <h2>📓 {t.notebook} ({found.length}/{cf.clues.length})</h2>
      {found.length === 0 && <p className="muted">{t.noClues}</p>}
      <ul>
        {cf.clues.filter((c) => found.includes(c.id)).map((c) => (
          <li key={c.id} className={flaggedClues.has(c.id) ? 'hot' : ''}>
            {c.text}
            {flaggedClues.has(c.id) && (
              <span className="flag-tag">⚠ {t.contradiction}: {cf.suspects.find((s) => s.id === c.contradicts)?.name}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
