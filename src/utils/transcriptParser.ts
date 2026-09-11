/**
 * Transcript Parsing & Normalization Utility
 * Handles multi-line manual input and external Whisper speech-to-text outputs.
 * Normalizes diverse timestamp formats ([00:01:12], 01:12, 0:05 -, etc.)
 * and synthesizes incremental line offsets for un-timestamped text.
 */

// Flexible regex matching timestamp prefixes with optional brackets, hyphens, colons:
// e.g., [00:01:12], [01:12], 01:12 -, 0:05:, 00:01:12, etc.
export const TIMESTAMP_REGEX = /^(?:\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–—:]?\s*)?(.*)$/;

export interface ParsedTranscriptLine {
  timestamp: string;
  text: string;
  isSynthesized: boolean;
  startSeconds: number;
}

export interface ParseTranscriptResult {
  formattedTranscript: string;
  lines: ParsedTranscriptLine[];
  hasNativeTimestamps: boolean;
  totalWords: number;
  hookText: string;
  pacingSpeed: string;
}

/**
 * Formats a numeric seconds value into standard mm:ss or hh:mm:ss.
 */
export function formatSecondsToTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Parses a timestamp string (e.g., "01:12", "00:01:12", "1:05") into total seconds.
 */
export function parseTimestampToSeconds(ts: string): number {
  if (!ts) return 0;
  const clean = ts.replace(/[\[\]]/g, '').trim();
  const parts = clean.split(':').map(p => parseInt(p, 10));
  if (parts.length === 3) {
    return (parts[0] * 3600) + (parts[1] * 60) + (parts[2] || 0);
  }
  if (parts.length === 2) {
    return (parts[0] * 60) + (parts[1] || 0);
  }
  return 0;
}

/**
 * Normalizes multi-line manual or Whisper transcript input.
 * - Splits on linebreaks (\n+).
 * - Tests for timestamp prefixes using TIMESTAMP_REGEX.
 * - If no timestamps are present in user-provided text, synthesizes incremental line offsets.
 */
export function parseManualTranscript(rawInput: string): ParseTranscriptResult {
  const cleanInput = (rawInput || '').trim();
  if (!cleanInput) {
    return {
      formattedTranscript: '',
      lines: [],
      hasNativeTimestamps: false,
      totalWords: 0,
      hookText: '',
      pacingSpeed: '0 words/min'
    };
  }

  // 1. Split on linebreaks (\n+)
  let rawLines = cleanInput.split(/\n+/).map(l => l.trim()).filter(Boolean);

  // If user pasted a single continuous block (> 150 chars) without linebreaks, split into sentences
  if (rawLines.length === 1 && rawLines[0].length > 150) {
    const sentences = rawLines[0].match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g);
    if (sentences && sentences.length > 1) {
      rawLines = sentences.map(s => s.trim()).filter(Boolean);
    }
  }

  // 2. Parse lines with TIMESTAMP_REGEX
  const parsedPass1: { rawTimestamp?: string; text: string }[] = rawLines.map(line => {
    const match = line.match(TIMESTAMP_REGEX);
    const rawTimestamp = match?.[1];
    let text = (match?.[2] || line).trim();
    // Clean up any remaining leading punctuation or divider artifacts
    text = text.replace(/^[:\s\-–—]+/, '').trim();
    return { rawTimestamp, text };
  }).filter(item => item.text.length > 0);

  const hasNativeTimestamps = parsedPass1.some(item => Boolean(item.rawTimestamp));

  let runningSeconds = 0;
  const resultLines: ParsedTranscriptLine[] = [];

  for (let i = 0; i < parsedPass1.length; i++) {
    const item = parsedPass1[i];
    const wordsInLine = item.text.split(/\s+/).filter(Boolean).length;
    // Estimate spoken line duration based on natural spoken pace (~2.5 words/second, min 3s, max 15s)
    const lineDuration = Math.max(3, Math.min(15, Math.round(wordsInLine / 2.5)));

    if (hasNativeTimestamps) {
      if (item.rawTimestamp) {
        const sec = parseTimestampToSeconds(item.rawTimestamp);
        runningSeconds = sec + lineDuration;
        resultLines.push({
          timestamp: item.rawTimestamp,
          text: item.text,
          isSynthesized: false,
          startSeconds: sec
        });
      } else {
        // Intermediate un-timestamped line: interpolate incremental offset from current running timer
        const currentSec = runningSeconds;
        runningSeconds += lineDuration;
        resultLines.push({
          timestamp: formatSecondsToTimestamp(currentSec),
          text: item.text,
          isSynthesized: true,
          startSeconds: currentSec
        });
      }
    } else {
      // Synthesize incremental line offsets when no native timestamps are present
      const startSec = runningSeconds;
      runningSeconds += lineDuration;
      resultLines.push({
        timestamp: formatSecondsToTimestamp(startSec),
        text: item.text,
        isSynthesized: true,
        startSeconds: startSec
      });
    }
  }

  // Formatted multi-line transcript: "[00:00] First sentence\n[00:04] Second sentence"
  const formattedTranscript = resultLines
    .map(line => `[${line.timestamp}] ${line.text}`)
    .join('\n');

  const allWords = cleanInput.split(/\s+/).filter(Boolean);
  const totalWords = allWords.length;
  const hookText = allWords.slice(0, 25).join(' ') + (allWords.length > 25 ? '...' : '');

  // Pacing speed calculation
  const totalDurationMin = Math.max(0.2, runningSeconds / 60);
  const calculatedWpm = Math.round(totalWords / totalDurationMin);
  const pacingSpeed = `${calculatedWpm} words/min (${hasNativeTimestamps ? 'Preserved Timestamps' : 'Synthesized Timestamps'})`;

  return {
    formattedTranscript,
    lines: resultLines,
    hasNativeTimestamps,
    totalWords,
    hookText,
    pacingSpeed
  };
}

