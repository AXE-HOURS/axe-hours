/**
 * Standardized AI Model Labels for UI display and backend engine reference.
 */

// Preference order for dynamic model discovery cascade
export const PREFERRED_MODEL_ORDER = [
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite'
] as const;

export const DEFAULT_FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite'
];

export const AI_MODEL_DISPLAY_NAME = 'Gemini Flash';
export const AI_MODEL_ENGINE_NAME = 'gemini-2.5-flash';
