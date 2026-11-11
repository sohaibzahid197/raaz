// Raaz case file schema. The case file is the single source of truth.
// Suspects only ever see their own slice of it.

export interface Suspect {
  id: string;
  name: string;
  role: string;          // e.g. "Shop assistant"
  personality: string;   // short, for the persona
  speakingStyle: string; // e.g. "polite, mixes Urdu words"
  alibi: string;         // what they say they were doing
  knows: string[];       // true facts this suspect knows and will share if asked
  secret: string;        // personal secret they try to hide (red herring for innocents)
  isCulprit: boolean;
  /** Culprit only: the false story they tell. */
  lie?: string;
}

export interface Clue {
  id: string;
  text: string;
  /** Asking this suspect about any of these words reveals the clue. */
  from: string;          // suspect id, or "scene"
  keywords: string[];
  /** If set, this clue proves the given suspect's statement false. */
  contradicts?: string;  // suspect id
}

export interface CaseFile {
  id: string;
  title: string;
  titleUr: string;
  city: string;
  intro: string;         // shown to the player
  what: string;          // what happened (item stolen etc.)
  timeline: string[];    // true timeline (hidden from player)
  suspects: Suspect[];
  clues: Clue[];
  motives: string[];     // options shown at accusation; first entry is NOT special
  solution: { culprit: string; motive: string; keyClue: string; story: string };
}
