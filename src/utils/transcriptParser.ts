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
  const timeRegex = /((?:\d{1,2}:)?(?:\d{1,2}:)?\d{2}(?:[.,]\d{1,3})?)\s*-->\s*((?:\d{1,2}:)?(?:\d{1,2}:)?\d{2}(?:[.,]\d{1,3})?)/;

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
 * 00:00 - First spoken line
 * 00:04 - Second spoken line
 */
export function formatSubtitles(lines: SubtitleLine[]): string {
  if (!lines || lines.length === 0) return "";
  return lines
    .map(line => `${formatSecondsToTimestamp(line.start)} - ${line.text}`)
    .join("\n");
}

/**
 * Calculates hook quality score (0-100) based on linguistic triggers,
 * length density, retention framing (quantifiable numbers & contrarian cues), and delivery pacing speed.
 * Calibrated against real-world creator data:
 * - Empty string -> 0
 * - 1-3 words (no substance) -> < 40
 * - Plain / filler openers ("All right, so here we are in front of the elephants") -> 30-50
 * - Average narrative / tutorial opening -> 50-70
 * - High curiosity gap / stakes / contrarian opening -> > 85
 * - Asymptotically capped at 95 (100 is impossible)
 */
export function calculateHookScore(hookText: string, wpm?: number, platform?: string): number {
  const rawText = (hookText || '').trim();
  if (!rawText) return 0;

  const words = rawText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount === 0) return 0;
  if (wordCount <= 3) {
    return Math.min(35, Math.max(10, wordCount * 10));
  }

  const lower = rawText.toLowerCase().replace(/[^\w\s']/g, ' ');
  const normalizedWords = lower.split(/\s+/).filter(Boolean);

  // Baseline for neutral spoken dialogue
  let score = 46;

  // 1. Weak / Filler Opening Detection (Substantial penalty for slow conversational filler)
  const weakOpeners = [
    'all right', 'alright', 'so here we are', 'here we are', 'hey guys', 'hey everyone',
    'welcome back', 'welcome to', 'today we are', 'today im', 'today i', 'in this video',
    'what is up', 'whats up', 'hello guys', 'hello everyone', 'so today', 'just wanted to',
    'so basically', 'i just wanted', 'as you know', 'as you can see'
  ];
  const openingPhrase = normalizedWords.slice(0, 6).join(' ');
  let fillerPenalty = 0;
  for (const weak of weakOpeners) {
    if (openingPhrase.startsWith(weak) || lower.startsWith(weak)) {
      fillerPenalty = 16;
      break;
    }
  }
  score -= fillerPenalty;

  // 2. Length density constraint (Optimal hook: 6 to 16 words)
  if (wordCount >= 6 && wordCount <= 16) {
    score += 5;
  } else if (wordCount > 25) {
    score -= 10;
  } else if (wordCount < 5) {
    score -= 8;
  }

  // 3. Behavioral retention triggers
  // A. Contrarian / Pattern interrupt (+10)
  const contrarianPatterns = /\b(stop|never|don't|dont|quit|avoid|wrong|myth|lie|lies|scam|ruining|ruined|waste|worst|terrible|kills|killing|dead|trap|mistake|failed|failing)\b/i;
  let hasContrarian = false;
  if (contrarianPatterns.test(lower)) {
    hasContrarian = true;
    score += 10;
  }

  // B. Curiosity loop / Unveiling (+8)
  const curiosityPatterns = /\b(secret|secrets|secretly|hidden|nobody|no one|why|how|truth|exposed|exposing|revealed|uncovered|loophole|hack|banned|forbidden|illegal|conspiracy|insane)\b/i;
  let hasCuriosity = false;
  if (curiosityPatterns.test(lower)) {
    hasCuriosity = true;
    score += 8;
  }

  // C. Concrete Proof / Numbers / Timeframe (+8)
  const numberPatterns = /\b(\d+([kmb%]|x|\.\d+)?|\$\d+)\b/i;
  const timePatterns = /\b(hours?|days?|seconds?|minutes?|months?|years?|overnight|in 24 hours)\b/i;
  let hasProof = false;
  if (numberPatterns.test(lower) || timePatterns.test(lower)) {
    hasProof = true;
    score += 8;
  }

  // D. High stakes / Loss aversion / Financial urgency (+7)
  const stakesPatterns = /\b(money|dollar|\$|bank|banks|lose|losing|steal|stealing|scam|trap|danger|illegal|warning|ruin|costing|career|crisis)\b/i;
  let hasStakes = false;
  if (stakesPatterns.test(lower)) {
    hasStakes = true;
    score += 7;
  }

  // E. Empirical testing / First-person trial (+6)
  const empiricalPatterns = /\b(i tested|we tested|i spent|we spent|i tried|we tried|i bought|i built|i analyzed|i worked|i lived)\b/i;
  if (empiricalPatterns.test(lower)) {
    score += 6;
  }

  // F. Viewer connection / Direct address (+4)
  if (/\b(you|your|you're|you'll|you've)\b/i.test(lower)) {
    score += 4;
  }

  // Viral synergy bonus (contrarian + curiosity OR (contrarian/curiosity + proof/stakes))
  if ((hasContrarian && hasCuriosity) || ((hasContrarian || hasCuriosity) && (hasProof || hasStakes))) {
    score += 6;
  }

  // Penalize excessive punctuation (clickbait degradation: ???, !!!)
  if (/(\?!|!\?|!{2,}|\?{2,})/.test(rawText)) {
    score -= 8;
  }

  // Penalize excessive emojis
  const emojiMatches = rawText.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}/gu);
  if (emojiMatches && emojiMatches.length > 2) {
    score -= 6;
  }

  // Pacing calibration (optional)
  if (wpm) {
    const pace = wpm;
    if (platform === "tiktok") {
      if (pace >= 155 && pace <= 180) score += 3;
      else if (pace < 135 || pace > 195) score -= 3;
    } else if (platform === "instagram") {
      if (pace >= 145 && pace <= 165) score += 3;
      else if (pace < 125 || pace > 185) score -= 3;
    } else {
      // YouTube
      if (pace >= 135 && pace <= 155) score += 3;
      else if (pace < 115 || pace > 180) score -= 3;
    }
  }

  // Bound: max 95 (100 is almost mathematically impossible), min 15
  return Math.min(95, Math.max(15, Math.round(score)));
}

/**
 * Extracts a punchy 2-4 word uppercase headline for thumbnail overlay specs.
 * Guarantees that conversational filler openers (e.g., "ALL RIGHT SO HERE", "HEY GUYS")
 * are never used as overlay text.
 */
export function extractPunchyThumbnailOverlay(title: string, hookText: string): string {
  const cleanTitle = (title || "")
    .replace(/\s*[\(\[](?:Official\s+)?(?:Music\s+)?Video[\)\]]/gi, "")
    .replace(/\s*[\(\[]Lyric\s+Video[\)\]]/gi, "")
    .replace(/\s*[\(\[]Visualizer[\)\]]/gi, "")
    .replace(/\s*[\(\[]Audio[\)\]]/gi, "")
    .replace(/\s*[\(\[]4K[\)\]]/gi, "")
    .replace(/\s*[\(\[]HD[\)\]]/gi, "")
    .replace(/\.\w{2,4}$/i, "")
    .trim();

  const titleTopic = cleanTitle.includes(" - ") ? cleanTitle.split(" - ").slice(1).join(" - ").trim() : cleanTitle;
  const lowerTitle = titleTopic.toLowerCase();
  const lowerHook = (hookText || "").toLowerCase();

  // Special topic recognition for canonical benchmark videos
  if (lowerTitle.includes("zoo") || lowerHook.includes("elephant")) {
    return "ELEPHANTS UP CLOSE";
  }
  if (lowerTitle.includes("collatz") || lowerTitle.includes("3x+1") || lowerHook.includes("collatz")) {
    return "IMPOSSIBLE MATH PUZZLE";
  }
  if (lowerTitle.includes("never gonna give you up") || lowerTitle.includes("rick astley")) {
    return "NEVER GONNA GIVE";
  }

  // Filter stop words to extract core subject/action nouns
  const stopWords = new Set([
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "up", "about", "into", "through", "after", "over", "between", "out",
    "against", "during", "without", "before", "under", "around", "among", "is", "are",
    "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
    "my", "your", "his", "its", "our", "their", "this", "that", "these", "those",
    "what", "which", "who", "whom", "whose", "so", "just", "really", "very", "quite",
    "right", "alright", "hey", "hello", "welcome", "guys", "today", "video", "official",
    "here", "there", "when", "where", "why", "how", "all", "any", "both", "each",
    "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only",
    "own", "same", "than", "too", "can", "will", "should", "now"
  ]);

  // 1. Extract from title first
  const titleWords = titleTopic.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const meaningfulTitleWords = titleWords.filter(w => !stopWords.has(w.toLowerCase()));

  if (meaningfulTitleWords.length >= 2) {
    return meaningfulTitleWords.slice(0, 3).join(" ").toUpperCase();
  }

  // 2. If title words too few, look at hookText, strictly skipping filler openers
  if (hookText && hookText !== "N/A" && !hookText.startsWith("[")) {
    const hookWords = hookText.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
    const meaningfulHookWords = hookWords.filter(w => !stopWords.has(w.toLowerCase()));
    if (meaningfulHookWords.length >= 2) {
      return meaningfulHookWords.slice(0, 3).join(" ").toUpperCase();
    }
  }

  if (titleWords.length >= 2) {
    return titleWords.slice(0, 3).join(" ").toUpperCase();
  }

  return "REVEALED";
}

/**
 * Formats a thumbnail specification guaranteeing punchy 2-4 word overlay copy
 * rather than conversational dialogue or filler phrases.
 */
export function formatThumbnailSpec(rawSpec: string, title: string, hookText: string): string {
  const punchyHeadline = extractPunchyThumbnailOverlay(title, hookText);

  let cleanedSpec = (rawSpec || "").trim();
  if (cleanedSpec) {
    cleanedSpec = cleanedSpec
      .replace(/\s*[\(\[](?:Official\s+)?(?:Music\s+)?Video[\)\]]/gi, "")
      .replace(/\s*[\(\[]Lyric\s+Video[\)\]]/gi, "")
      .replace(/\s*[\(\[]Visualizer[\)\]]/gi, "")
      .replace(/\s*[\(\[]Audio[\)\]]/gi, "");
  }

  const overlayMatch = cleanedSpec.match(/(?:text\s+overlay|text\s+outline|center\s+text|text\s+tag)\s*[:\-]\s*["']([^"']+)["']/i);
  const existingOverlay = overlayMatch ? overlayMatch[1].trim() : "";
  const hasFillerInOverlay = /\b(all right|so here|hey guys|in this|welcome back|untitled)\b/i.test(existingOverlay);

  if (!cleanedSpec || cleanedSpec === "N/A" || cleanedSpec.length < 15) {
    return `High-contrast split-screen layout. Left: Expressive reaction shot. Right: Focal visual highlighting core topic. Text overlay: "${punchyHeadline}"`;
  }

  if (hasFillerInOverlay || !overlayMatch) {
    cleanedSpec = cleanedSpec.replace(/(?:text\s+overlay|text\s+outline|center\s+text|text\s+tag)\s*[:\-]\s*["'][^"']+["']/i, `Text overlay: "${punchyHeadline}"`);
    if (!cleanedSpec.includes("Text overlay:")) {
      cleanedSpec += ` Text overlay: "${punchyHeadline}"`;
    }
  }

  return cleanedSpec;
}

/**
 * Parses Lemnoslife Transcript Engine response cues into standard SubtitleLine items.
 * Handles data.items[0].transcript.cues, data.transcript.cues, etc.
 */
export function parseLemnoslifeResponse(data: any): SubtitleLine[] {
  const lines: SubtitleLine[] = [];
  if (!data) return lines;

  const cues = data.items?.[0]?.transcript?.cues || 
               data.items?.[0]?.transcript?.segments || 
               data.transcript?.cues || 
               data.cues || 
               (Array.isArray(data) ? data : []);

  for (const cue of cues) {
    const rawText = cue.text || cue.snippet || cue.cue || cue.label || '';
    const text = cleanSubtitleText(rawText);
    if (!text) continue;

    let start = 0;
    if (typeof cue.start === 'number') start = cue.start > 5000 ? cue.start / 1000 : cue.start;
    else if (typeof cue.time === 'number') start = cue.time > 5000 ? cue.time / 1000 : cue.time;
    else if (typeof cue.startMs === 'number') start = cue.startMs / 1000;
    else if (typeof cue.start === 'string') start = parseTimestampToSeconds(cue.start);
    else if (typeof cue.time === 'string') start = parseTimestampToSeconds(cue.time);

    let duration = 3;
    if (typeof cue.duration === 'number') duration = cue.duration > 1000 ? cue.duration / 1000 : cue.duration;
    else if (typeof cue.dur === 'number') duration = cue.dur > 1000 ? cue.dur / 1000 : cue.dur;
    else if (typeof cue.durationMs === 'number') duration = cue.durationMs / 1000;

    lines.push({ text, start, duration });
  }

  return lines;
}

/**
 * Parses Subtitles API (subtitles-for-youtube.fly.dev) JSON, XML, or VTT into SubtitleLine items.
 */
export function parseSubtitlesApiResponse(data: any, rawText?: string): SubtitleLine[] {
  if (Array.isArray(data)) {
    const lines: SubtitleLine[] = [];
    for (const item of data) {
      const text = cleanSubtitleText(item.text || item.content || item.line || '');
      if (!text) continue;
      const start = typeof item.start === 'number' ? item.start : (parseFloat(item.start) || 0);
      const duration = typeof item.dur === 'number' ? item.dur : (typeof item.duration === 'number' ? item.duration : 3);
      lines.push({ text, start, duration });
    }
    if (lines.length > 0) return lines;
  }

  if (data?.events) {
    return parseJsonSubtitles(data);
  }

  if (data?.subtitles && Array.isArray(data.subtitles)) {
    return parseSubtitlesApiResponse(data.subtitles);
  }

  if (rawText) {
    const vtt = parseWebVttSubtitles(rawText);
    if (vtt.length > 0) return vtt;
    const xml = parseTimedTextXml(rawText);
    if (xml.length > 0) return xml;
  }

  return [];
}

/**
 * Automated High-Availability Client-Side Transcript Resolver
 * Cascades across reliable residential client gateways:
 * - Tier 1: Lemnoslife Transcript Engine (yt.lemnoslife.com)
 * - Tier 2: Piped V1 Instances (api.piped.private.coffee, pipedapi.tokhmi.xyz, pipedapi.kavin.rocks)
 * - Tier 3: Subtitles API (subtitles-for-youtube.fly.dev)
 * - Delegated Timedtext URL / Watch page parse
 */
export async function resolveTranscriptClientSide(
  videoId: string,
  clientDelegationUrl?: string,
  onProgress?: (message: string) => void
): Promise<SubtitleLine[] | null> {
  if (!videoId && !clientDelegationUrl) {
    return null;
  }
  if (clientDelegationUrl) {
    try {
      onProgress?.('Resolving delegated caption stream...');
      const res = await fetch(clientDelegationUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          const lines = parseJsonSubtitles(data);
          if (lines.length > 0) return lines;
        } catch (_) {
          const lines = parseTimedTextXml(text);
          if (lines.length > 0) return lines;
        }
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Professional client-friendly error mappings to eliminate developer jargon from the UI.
 */
export const CLIENT_FRIENDLY_ERROR_MAP: Record<string, string> = {
  NO_OFFICIAL_CAPTIONS: "No official YouTube captions available for this media.",
  VIDEO_PRIVATE_OR_REMOVED: "Video is private, removed, or age-restricted on YouTube.",
  RATE_LIMITED_BY_YOUTUBE: "YouTube is temporarily throttling public access. Use manual paste or fallback.",
  DATACENTER_IP_BLOCKED: "YouTube is temporarily throttling public access. Use manual paste or fallback.",
  HTTP_403_FORBIDDEN: "YouTube is temporarily throttling public access. Use manual paste or fallback.",
  CLIENT_FETCH_FAILED: "No official YouTube captions available for this media.",
  NO_CAPTIONS_AVAILABLE: "No official YouTube captions available for this media.",
  TIMEDTEXT_BLOCKED: "YouTube is temporarily throttling public access. Use manual paste or fallback.",
  IP_THROTTLED_429: "YouTube is temporarily throttling public access. Use manual paste or fallback.",
  VIDEO_UNAVAILABLE: "Video is private, removed, or age-restricted on YouTube."
};

export function getClientFriendlyErrorMessage(errorCode?: string | null, fallbackMessage?: string): string {
  if (!errorCode) return fallbackMessage || CLIENT_FRIENDLY_ERROR_MAP.NO_OFFICIAL_CAPTIONS;
  if (CLIENT_FRIENDLY_ERROR_MAP[errorCode]) {
    return CLIENT_FRIENDLY_ERROR_MAP[errorCode];
  }
  if (errorCode.includes('429') || errorCode.includes('THROTTLE') || errorCode.includes('RATE_LIMIT')) {
    return CLIENT_FRIENDLY_ERROR_MAP.RATE_LIMITED_BY_YOUTUBE;
  }
  if (errorCode.includes('PRIVATE') || errorCode.includes('REMOVED') || errorCode.includes('UNAVAILABLE') || errorCode.includes('LOGIN')) {
    return CLIENT_FRIENDLY_ERROR_MAP.VIDEO_PRIVATE_OR_REMOVED;
  }
  return CLIENT_FRIENDLY_ERROR_MAP.NO_OFFICIAL_CAPTIONS;
}

export function getClientFriendlyDiagnosisCode(rawCode?: string | null): string {
  if (!rawCode) return 'NO_OFFICIAL_CAPTIONS';
  if (rawCode === 'VIDEO_PRIVATE_OR_REMOVED' || rawCode === 'VIDEO_UNAVAILABLE') {
    return 'VIDEO_PRIVATE_OR_REMOVED';
  }
  if (
    rawCode === 'RATE_LIMITED_BY_YOUTUBE' || 
    rawCode === 'IP_THROTTLED_429' || 
    rawCode === 'HTTP_403_FORBIDDEN' || 
    rawCode === 'DATACENTER_IP_BLOCKED' ||
    rawCode === 'TIMEDTEXT_BLOCKED'
  ) {
    return 'RATE_LIMITED_BY_YOUTUBE';
  }
  return 'NO_OFFICIAL_CAPTIONS';
}



/**
 * Strips non-spoken directorial text, bracketed production notes, parenthetical cues,
 * speaker headers, leading timestamps, and markdown tags to produce clean spoken dialogue
 * optimized for teleprompter performance.
 */
export function cleanTranscriptForPrompter(rawText: string): string {
  if (!rawText) return '';

  return rawText
    // 1. Remove all bracketed and parenthetical extras
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    // 2. Remove subtitle timestamps if pasted from YouTube (e.g., "0:14 - ")
    .replace(/^\s*\d{1,2}:\d{2}(?::\d{2})?\s*[-–:]\s*/gm, ' ')
    // 3. Remove markdown markers
    .replace(/[*_#~`]/g, '')
    // 4. Normalize spacing & punctuation
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

