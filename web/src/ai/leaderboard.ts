import { collection, doc, getDocs, limit, orderBy, query, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, ensureSignedIn } from '../firebase';

export interface Entry { name: string; points: number; questions: number }
/** Daily board: boards/daily-YYYY-MM-DD. Class board: boards/class-CODE-YYYY-MM-DD. */
export const boardId = (day: string, classCode?: string | null) => (classCode ? `class-${classCode}-${day}` : `daily-${day}`);

export async function submitScore(board: string, e: Entry): Promise<boolean> {
  const uid = await ensureSignedIn();
  if (!uid) return false;
  // One entry per player per board (doc id = uid); security rules validate shape and range.
  await setDoc(doc(db, 'boards', board, 'scores', uid), { ...e, name: e.name.slice(0, 20), at: serverTimestamp() });
  return true;
}

export async function topScores(board: string, n = 10): Promise<Entry[]> {
  const snap = await getDocs(query(collection(db, 'boards', board, 'scores'), orderBy('points', 'desc'), orderBy('questions', 'asc'), limit(n)));
  return snap.docs.map((d) => d.data() as Entry);
}
