import { auth } from '../lib/firebase';

let cachedGuestToken: { token: string; exp: number } | null = null;

/**
 * Returns a valid Authorization Bearer token:
 * 1. If user is signed in to Firebase, returns their authenticated Firebase ID token.
 * 2. Otherwise, fetches or reuses a short-lived HMAC-signed guest token from /api/auth/guest-token.
 */
export async function getAuthOrGuestToken(): Promise<string> {
  // If user is logged into Firebase, always prefer their verified ID token
  if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) return idToken;
    } catch (e) {
      console.warn('[authSession] Could not retrieve Firebase ID token:', e);
    }
  }

  // Check in-memory cache for guest token
  if (cachedGuestToken && cachedGuestToken.exp > Date.now() + 60_000) {
    return cachedGuestToken.token;
  }

  // Check sessionStorage
  try {
    const stored = sessionStorage.getItem('axe_guest_token');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.exp && parsed.exp > Date.now() + 60_000 && parsed.token) {
        cachedGuestToken = parsed;
        return parsed.token;
      }
    }
  } catch {}

  // Request a fresh HMAC-signed guest token from the backend
  try {
    const res = await fetch('/api/auth/guest-token', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        cachedGuestToken = { token: data.token, exp: data.exp || (Date.now() + 3600_000) };
        try {
          sessionStorage.setItem('axe_guest_token', JSON.stringify(cachedGuestToken));
        } catch {}
        return data.token;
      }
    }
  } catch (err) {
    console.error('[authSession] Failed to retrieve HMAC guest token:', err);
  }

  return '';
}
