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

export interface SubtitleLine {
  text: string;
  start: number;
  duration: number;
}

/**
 * Cleans raw subtitle text by stripping HTML tags, unescaping XML/HTML entities,
 * and normalizing internal line breaks and whitespace.
 */
export function cleanSubtitleText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parses YouTube JSON3 format (&fmt=json3) events into standard SubtitleLine segments.
 */
export function parseJsonSubtitles(data: any): SubtitleLine[] {
  const lines: SubtitleLine[] = [];
  if (!data) return lines;

  const events = data.events || [];
  for (const event of events) {
    if (!event.segs) continue;
    const startMs = event.tStartMs || 0;
    const durMs = event.dDurationMs || 0;
    const rawText = event.segs.map((s: any) => s.utf8 || "").join("");
    const text = cleanSubtitleText(rawText);
    if (text) {
      lines.push({
        text,
        start: startMs / 1000,
        duration: durMs / 1000
      });
    }
  }
  return lines;
}

/**
 * Parses YouTube Format 3 XML (<p t="startMs" d="durMs">) and Format 1 XML (<text start="s" dur="s">).
 */
export function parseTimedTextXml(xmlText: string): SubtitleLine[] {
  const lines: SubtitleLine[] = [];
  if (!xmlText || typeof xmlText !== "string") return lines;

  // Format 3 XML: <p t="startMs" d="durMs">...</p>
  const pRegex = /<p\s+t="(\d+)"(?:\s+d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/gi;
  let pMatch;
  while ((pMatch = pRegex.exec(xmlText)) !== null) {
    const startMs = parseInt(pMatch[1], 10);
    const durMs = pMatch[2] ? parseInt(pMatch[2], 10) : 0;
    const text = cleanSubtitleText(pMatch[3]);
    if (text) {
      lines.push({
        text,
        start: startMs / 1000,
        duration: durMs / 1000
      });
    }
  }

  // Format 1 XML: <text start="s" dur="s">...</text>
  if (lines.length === 0) {
    const textRegex = /<text\s+start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/gi;
    let tMatch;
    while ((tMatch = textRegex.exec(xmlText)) !== null) {
      const start = parseFloat(tMatch[1]);
      const duration = tMatch[2] ? parseFloat(tMatch[2]) : 0;
      const text = cleanSubtitleText(tMatch[3]);
      if (text) {
        lines.push({ text, start, duration });
      }
    }
  }

  return lines;
}

/**
 * Parses WebVTT / SRT cue blocks into SubtitleLine segments.
 */
export function parseWebVttSubtitles(vttText: string): SubtitleLine[] {
  const lines: SubtitleLine[] = [];
  if (!vttText || typeof vttText !== "string") return lines;

  const blocks = vttText.split(/\r?\n\s*\r?\n/);
  const timeRegex = /((?:\d{1,2}:)?\d{2}:\d{2}(?:[.,]\d{1,3})?)\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}(?:[.,]\d{1,3})?)/;

  for (const block of blocks) {
    const match = block.match(timeRegex);
    if (!match) continue;

    const parseTs = (ts: string): number => {
      const parts = ts.trim().replace(',', '.').split(':');
      if (parts.length === 3) {
        return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
      } else if (parts.length === 2) {
        return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
      }
      return parseFloat(parts[0]) || 0;
    };

    const startSec = parseTs(match[1]);
    const endSec = parseTs(match[2]);
    const duration = Math.max(0, endSec - startSec);

    const blockLines = block.split(/\r?\n/);
    const timeLineIndex = blockLines.findIndex(l => timeRegex.test(l));
    if (timeLineIndex === -1) continue;

    const rawText = blockLines.slice(timeLineIndex + 1).join(" ");
    const text = cleanSubtitleText(rawText);
    if (text) {
      lines.push({ text, start: startSec, duration });
    }
  }

  return lines;
}

/**
 * Formats subtitle lines into a human-readable timestamped script:
 * [00:00] First spoken line
 * [00:04] Second spoken line
 */
export function formatSubtitles(lines: SubtitleLine[]): string {
  if (!lines || lines.length === 0) return "";
  return lines
    .map(line => `[${formatSecondsToTimestamp(line.start)}] ${line.text}`)
    .join("\n");
}

/**
 * Calculates hook quality score (0-100) based on linguistic triggers,
 * length density, punctuation emphasis, and delivery pacing speed.
 */
export function calculateHookScore(hookText: string, wpm?: number, platform?: string): number {
  let score = 50;
  const words = (hookText || '').trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // 1. Length density constraint (Optimal hook is dense but punchy, e.g. 6 to 14 words)
  if (wordCount >= 6 && wordCount <= 14) {
    score += 15;
  } else if (wordCount > 0 && wordCount < 6) {
    score += 5;
  } else if (wordCount > 20) {
    score -= 10;
  } else {
    score += 8;
  }

  // 2. Behavioral high retention linguistic triggers scan
  const triggerWords = ["stop", "fail", "secret", "never", "hidden", "why", "how", "impossible", "hack", "mistake", "everyone", "wrong", "trap", "insane", "waste"];
  let detectedTriggersCount = 0;
  words.forEach(w => {
    const cleaned = w.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (triggerWords.includes(cleaned)) {
      detectedTriggersCount++;
    }
  });
  score += Math.min(25, detectedTriggersCount * 12);

  // 3. Punctuation emphasis / pattern attention check
  if (/[!?]/.test(hookText || '')) {
    score += 10;
  }

  // 4. Words per minute pacing check
  const pace = wpm || 145;
  if (platform === "tiktok") {
    if (pace >= 155 && pace <= 180) score += 15;
    else if (pace < 135) score -= 12;
    else score += 5;
  } else if (platform === "instagram") {
    if (pace >= 145 && pace <= 165) score += 15;
    else if (pace < 125) score -= 12;
    else score += 6;
  } else {
    // YouTube
    if (pace >= 135 && pace <= 155) score += 15;
    else if (pace > 175) score -= 10;
    else score += 6;
  }

  return Math.min(100, Math.max(12, score));
}


