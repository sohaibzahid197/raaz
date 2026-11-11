import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const env = import.meta.env;

export const app = initializeApp({
  apiKey: env.VITE_FB_API_KEY,
  authDomain: env.VITE_FB_AUTH_DOMAIN,
  projectId: env.VITE_FB_PROJECT_ID,
  appId: env.VITE_FB_APP_ID,
  storageBucket: env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FB_SENDER_ID,
});

// App Check protects the cloud Gemini API. The hackathon accepts debug tokens.
// Set VITE_APPCHECK_DEBUG_TOKEN (registered in the Firebase console) or a
// reCAPTCHA site key in VITE_APPCHECK_SITE_KEY.
const debugToken: string | undefined = env.VITE_APPCHECK_DEBUG_TOKEN || undefined;
if (debugToken || env.DEV) {
  (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken || true;
}
initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(env.VITE_APPCHECK_SITE_KEY || 'debug-only'),
  isTokenAutoRefreshEnabled: true,
});

export const auth = getAuth(app);
export const db = getFirestore(app);

export async function ensureSignedIn(): Promise<string | null> {
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    return (await signInAnonymously(auth)).user.uid;
  } catch {
    return null;
  }
}
