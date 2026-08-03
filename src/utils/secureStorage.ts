/**
 * Secure Storage Utility for API Keys and Credentials
 * Ensures plain-text keys are not written to persistent localStorage unless encoded,
 * and supports session-only storage mechanisms.
 */

export function encodeStorageKey(key: string): string {
  if (!key) return "";
  try {
    return btoa(key);
  } catch (e) {
    return key;
  }
}

export function decodeStorageKey(val: string): string {
  if (!val) return "";
  try {
    const decoded = atob(val);
    // A standard Gemini API key starts with "AIzaSy"
    if (decoded.startsWith("AIzaSy")) {
      return decoded;
    }
  } catch (e) {
    // Not Base64 encoded or failed to parse, return raw value
  }
  return val;
}

/**
 * Retrieves the Gemini API key securely checking sessionStorage first, then localStorage (decoding if necessary)
 */
export function getSecureGeminiKey(uid: string): string {
  const sessionKey = sessionStorage.getItem(`axe_hours_gemini_key_${uid}`) || sessionStorage.getItem("axe_hours_gemini_key");
  if (sessionKey) return sessionKey;

  const localKey = localStorage.getItem(`axe_hours_gemini_key_${uid}`) || localStorage.getItem("axe_hours_gemini_key");
  if (localKey) {
    return decodeStorageKey(localKey);
  }
  return "";
}

/**
 * Saves the Gemini API key based on the rememberMe preference
 */
export function saveSecureGeminiKey(uid: string, key: string, rememberMe: boolean): void {
  // Clear any existing keys from both spaces to avoid sync drift
  localStorage.removeItem(`axe_hours_gemini_key_${uid}`);
  localStorage.removeItem("axe_hours_gemini_key");
  sessionStorage.removeItem(`axe_hours_gemini_key_${uid}`);
  sessionStorage.removeItem("axe_hours_gemini_key");

  // Save the remember choice state
  localStorage.setItem(`axe_hours_gemini_key_remember_${uid}`, rememberMe ? "true" : "false");

  if (!key.trim()) return;

  if (rememberMe) {
    const encoded = encodeStorageKey(key);
    localStorage.setItem(`axe_hours_gemini_key_${uid}`, encoded);
    if (uid === "guest") {
      localStorage.setItem("axe_hours_gemini_key", encoded);
    }
  } else {
    sessionStorage.setItem(`axe_hours_gemini_key_${uid}`, key);
    if (uid === "guest") {
      sessionStorage.setItem("axe_hours_gemini_key", key);
    }
  }
}

/**
 * Checks whether the user has opted to remember their key on this device
 */
export function getRememberMePreference(uid: string): boolean {
  const pref = localStorage.getItem(`axe_hours_gemini_key_remember_${uid}`);
  // Default to true if not set (for backwards compatibility), but allow user to opt out
  return pref !== "false";
}

/**
 * Thoroughly wipes all stored API key records from sessionStorage and localStorage
 */
export function wipeAllKeyRecords(uid: string): void {
  localStorage.removeItem(`axe_hours_gemini_key_${uid}`);
  localStorage.removeItem("axe_hours_gemini_key");
  localStorage.removeItem(`axe_hours_gemini_key_remember_${uid}`);
  
  sessionStorage.removeItem(`axe_hours_gemini_key_${uid}`);
  sessionStorage.removeItem("axe_hours_gemini_key");
}
