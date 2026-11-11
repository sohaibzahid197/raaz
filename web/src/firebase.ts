import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const env = { VITE_FB_API_KEY: import.meta.env.VITE_FB_API_KEY, VITE_FB_AUTH_DOMAIN: import.meta.env.VITE_FB_AUTH_DOMAIN, VITE_FB_PROJECT_ID: import.meta.env.VITE_FB_PROJECT_ID, VITE_FB_APP_ID: import.meta.env.VITE_FB_APP_ID, VITE_FB_STORAGE_BUCKET: import.meta.env.VITE_FB_STORAGE_BUCKET, VITE_FB_SENDER_ID: import.meta.env.VITE_FB_SENDER_ID, VITE_APPCHECK_SITE_KEY: import.meta.env.VITE_APPCHECK_SITE_KEY, DEV: import.meta.env.DEV };

export const app = initializeApp({
  apiKey: env.VITE_FB_API_KEY,
  authDomain: env.VITE_FB_AUTH_DOMAIN,
  projectId: env.VITE_FB_PROJECT_ID,
  appId: env.VITE_FB_APP_ID,
  storageBucket: env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FB_SENDER_ID,
});

// App Check protects the cloud Gemini API.
// Production: reCAPTCHA (Fraud Defense) site key (VITE_APPCHECK_SITE_KEY), free and public by design.
// Local dev only: a registered debug token, never shipped in a production build.
const debugToken: string | undefined = import.meta.env.DEV ? import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || undefined : undefined;
if (env.DEV) {
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
