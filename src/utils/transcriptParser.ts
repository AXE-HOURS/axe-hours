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
 * - Native YouTube Timedtext (Direct browser + corsproxy.io)
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
    console.warn('[resolveTranscriptClientSide] No videoId or clientDelegationUrl provided.');
    return null;
  }

  // -------------------------------------------------------------
  // NATIVE: Direct YouTube Timedtext Endpoint (Residential IP)
  // -------------------------------------------------------------
  if (videoId) {
    const directUrl = 'https://www.youtube.com/api/timedtext?v=' + videoId + '&lang=en&fmt=json3';
    const asrUrl = 'https://www.youtube.com/api/timedtext?v=' + videoId + '&lang=en&kind=asr&fmt=json3';

    // 1. Direct browser fetch with mode: 'cors'
    for (const url of [directUrl, asrUrl]) {
      try {
        onProgress?.('Querying native YouTube timedtext stream...');
        console.log(`[resolveTranscriptClientSide] Direct native call: ${url}`);
        const res = await fetch(url, { mode: 'cors', signal: AbortSignal.timeout(4500) });
        if (res.ok) {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            const lines = parseJsonSubtitles(data);
            if (lines.length > 0) {
              console.log(`[resolveTranscriptClientSide] Direct call succeeded (${url}): ${lines.length} lines`);
              return lines;
            }
          } catch (_) {
            const lines = parseTimedTextXml(text);
            if (lines.length > 0) return lines;
          }
        }
      } catch (err) {
        console.warn(`[resolveTranscriptClientSide] Direct fetch failed (${url}):`, err);
      }
    }

    // 2. Cascade to corsproxy.io
    for (const targetUrl of [directUrl, asrUrl]) {
      try {
        onProgress?.('Querying native timedtext via corsproxy.io...');
        const proxyUrl = 'https://corsproxy.io/?url=' + encodeURIComponent(targetUrl);
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            const lines = parseJsonSubtitles(data);
            if (lines.length > 0) {
              console.log(`[resolveTranscriptClientSide] corsproxy.io succeeded: ${lines.length} lines`);
              return lines;
            }
          } catch (_) {
            const lines = parseTimedTextXml(text);
            if (lines.length > 0) return lines;
          }
        }
      } catch (err) {
        console.warn(`[resolveTranscriptClientSide] corsproxy.io failed for ${targetUrl}:`, err);
      }
    }
  }

  if (!videoId) return null;

  // -------------------------------------------------------------
  // TIER 1: Lemnoslife Transcript Engine
  // https://yt.lemnoslife.com/videos?part=transcript&id=${videoId}
  // -------------------------------------------------------------
  try {
    onProgress?.('Tier 1: Querying Lemnoslife Transcript Engine...');
    const lemnosUrl = `https://yt.lemnoslife.com/videos?part=transcript&id=${videoId}`;
    console.log(`[resolveTranscriptClientSide] Tier 1 - Lemnoslife: ${lemnosUrl}`);

    const lemnosEndpoints = [
      lemnosUrl,
      `https://corsproxy.io/?url=${encodeURIComponent(lemnosUrl)}`
    ];

    for (const ep of lemnosEndpoints) {
      try {
        const res = await fetch(ep, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const data = await res.json();
          const lines = parseLemnoslifeResponse(data);
          if (lines.length > 0) {
            console.log(`[resolveTranscriptClientSide] Tier 1 (Lemnoslife) succeeded: ${lines.length} lines`);
            return lines;
          }
        }
      } catch (err) {
        console.warn(`[resolveTranscriptClientSide] Lemnoslife attempt failed (${ep}):`, err);
      }
    }
  } catch (err) {
    console.warn('[resolveTranscriptClientSide] Tier 1 Lemnoslife failed:', err);
  }

  // -------------------------------------------------------------
  // TIER 2: Piped V1 Instances
  // api.piped.private.coffee, pipedapi.tokhmi.xyz, pipedapi.kavin.rocks
  // Extract subtitles where code === 'en'
  // -------------------------------------------------------------
  const pipedInstances = [
    `https://api.piped.private.coffee/streams/${videoId}`,
    `https://pipedapi.tokhmi.xyz/streams/${videoId}`,
    `https://pipedapi.kavin.rocks/streams/${videoId}`
  ];

  for (const endpoint of pipedInstances) {
    try {
      onProgress?.('Tier 2: Resolving transcript via Piped V1 Instances...');
      console.log(`[resolveTranscriptClientSide] Tier 2 - Querying Piped: ${endpoint}`);
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        const subtitles = data.subtitles;
        if (Array.isArray(subtitles) && subtitles.length > 0) {
          const enTrack = subtitles.find((s: any) => 
            s.code === 'en' || 
            s.code?.startsWith('en') || 
            s.name?.toLowerCase().includes('english')
          ) || subtitles[0];

          if (enTrack?.url) {
            const subRes = await fetch(enTrack.url, { signal: AbortSignal.timeout(5000) });
            if (subRes.ok) {
              const subText = await subRes.text();
              let lines = parseWebVttSubtitles(subText);
              if (lines.length === 0) {
                try {
                  const jsonData = JSON.parse(subText);
                  lines = parseJsonSubtitles(jsonData);
                } catch (_) {
                  lines = parseTimedTextXml(subText);
                }
              }
              if (lines.length > 0) {
                console.log(`[resolveTranscriptClientSide] Tier 2 succeeded via ${endpoint}: ${lines.length} lines`);
                return lines;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[resolveTranscriptClientSide] Tier 2 instance failed (${endpoint}):`, err);
    }
  }

  // -------------------------------------------------------------
  // TIER 3: Subtitles API
  // https://subtitles-for-youtube.fly.dev/subtitles/${videoId}
  // -------------------------------------------------------------
  try {
    onProgress?.('Tier 3: Querying Subtitles API...');
    const flyUrl = `https://subtitles-for-youtube.fly.dev/subtitles/${videoId}`;
    console.log(`[resolveTranscriptClientSide] Tier 3 - Subtitles API: ${flyUrl}`);

    const flyEndpoints = [
      flyUrl,
      `https://corsproxy.io/?url=${encodeURIComponent(flyUrl)}`
    ];

    for (const ep of flyEndpoints) {
      try {
        const res = await fetch(ep, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const text = await res.text();
          let parsedData: any = null;
          try {
            parsedData = JSON.parse(text);
          } catch (_) {}

          const lines = parseSubtitlesApiResponse(parsedData, text);
          if (lines.length > 0) {
            console.log(`[resolveTranscriptClientSide] Tier 3 (Subtitles API) succeeded: ${lines.length} lines`);
            return lines;
          }
        }
      } catch (err) {
        console.warn(`[resolveTranscriptClientSide] Subtitles API attempt failed (${ep}):`, err);
      }
    }
  } catch (err) {
    console.warn('[resolveTranscriptClientSide] Tier 3 Subtitles API failed:', err);
  }

  // -------------------------------------------------------------
  // DELEGATED TIMEDTEXT URL (from Innertube Watch Metadata)
  // -------------------------------------------------------------
  if (clientDelegationUrl) {
    try {
      onProgress?.('Attempting direct residential fetch from timedtext URL...');
      let directUrl = clientDelegationUrl;
      if (directUrl.includes('fmt=')) {
        directUrl = directUrl.replace(/fmt=[^&]+/, 'fmt=json3');
      } else {
        directUrl += (directUrl.includes('?') ? '&' : '?') + 'fmt=json3';
      }

      try {
        const directRes = await fetch(directUrl);
        if (directRes.ok) {
          const directText = await directRes.text();
          try {
            const data = JSON.parse(directText);
            const lines = parseJsonSubtitles(data);
            if (lines.length > 0) return lines;
          } catch (_) {
            const lines = parseTimedTextXml(directText);
            if (lines.length > 0) return lines;
          }
        }
      } catch (_) {}

      // Fallback via corsproxy.io on delegation URL
      try {
        const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(directUrl)}`;
        const pRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
        if (pRes.ok) {
          const pText = await pRes.text();
          try {
            const data = JSON.parse(pText);
            const lines = parseJsonSubtitles(data);
            if (lines.length > 0) return lines;
          } catch (_) {
            const lines = parseTimedTextXml(pText);
            if (lines.length > 0) return lines;
          }
        }
      } catch (_) {}
    } catch (err) {
      console.warn('[resolveTranscriptClientSide] Direct delegation fetch failed:', err);
    }
  }

  // -------------------------------------------------------------
  // WATCH PAGE CORS SCRAPER (corsproxy.io only)
  // -------------------------------------------------------------
  try {
    onProgress?.('Final Stage: Extracting caption tracks via Watch Page Proxy...');
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(watchUrl)}`;

    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const html = await res.text();
      if (html) {
        const match = html.match(/"captionTracks"\s*:\s*(\[.*?\])/) || 
                      html.match(/"captionTracks"\s*:\s*(\[[\s\S]*?\])/);
        if (match) {
          let tracks: any[] = [];
          try {
            tracks = JSON.parse(match[1]);
          } catch (_) {
            const startIdx = html.indexOf('"captionTracks"');
            if (startIdx > -1) {
              const openBracket = html.indexOf('[', startIdx);
              const closeBracket = html.indexOf(']', openBracket);
              if (openBracket > -1 && closeBracket > openBracket) {
                tracks = JSON.parse(html.slice(openBracket, closeBracket + 1));
              }
            }
          }

          if (Array.isArray(tracks) && tracks.length > 0) {
            const enTrack = tracks.find((t: any) => 
              t.languageCode === 'en' || 
              t.languageCode?.startsWith('en') || 
              t.vssId?.includes('.en') || 
              t.name?.simpleText?.toLowerCase().includes('english')
            ) || tracks[0];

            if (enTrack?.baseUrl) {
              let jsonUrl = enTrack.baseUrl;
              if (jsonUrl.includes('fmt=')) {
                jsonUrl = jsonUrl.replace(/fmt=[^&]+/, 'fmt=json3');
              } else {
                jsonUrl += (jsonUrl.includes('?') ? '&' : '?') + 'fmt=json3';
              }

              // Direct browser fetch
              try {
                const subRes = await fetch(jsonUrl);
                if (subRes.ok) {
                  const subText = await subRes.text();
                  try {
                    const jsonData = JSON.parse(subText);
                    const lines = parseJsonSubtitles(jsonData);
                    if (lines.length > 0) return lines;
                  } catch (_) {
                    const lines = parseTimedTextXml(subText);
                    if (lines.length > 0) return lines;
                  }
                }
              } catch (_) {}

              // Fallback via corsproxy.io on track URL
              const subProxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(jsonUrl)}`;
              const subProxyRes = await fetch(subProxyUrl, { signal: AbortSignal.timeout(6000) });
              if (subProxyRes.ok) {
                const subText = await subProxyRes.text();
                try {
                  const jsonData = JSON.parse(subText);
                  const lines = parseJsonSubtitles(jsonData);
                  if (lines.length > 0) return lines;
                } catch (_) {
                  const lines = parseTimedTextXml(subText);
                  if (lines.length > 0) return lines;
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[resolveTranscriptClientSide] Watch page scraper failed:', err);
  }

  return null;
}


