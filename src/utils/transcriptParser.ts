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
 * Automated Client-Side Transcript Resolver
 * Cascades across 3 robust residential client pathways when backend datacenter IP hits HTTP 403:
 * - Stage 1: Piped API Gateway (pipedapi.kavin.rocks, api.piped.private.coffee)
 * - Stage 2: Invidious Public Instances (inv.nadeko.net, invidious.nerdvpn.de)
 * - Stage 3: CORS Proxy to Watch Page (api.allorigins.win, corsproxy.io)
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
  // TIER 1: Direct Native YouTube Timedtext Endpoint (Residential IP)
  // Executes directly from the user's browser, bypassing datacenter 403 blocks
  // -------------------------------------------------------------
  if (videoId) {
    const directUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`;
    const asrUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=json3`;

    // 1. Direct browser fetch
    for (const url of [directUrl, asrUrl]) {
      try {
        onProgress?.('Tier 1: Querying direct native YouTube timedtext...');
        console.log(`[resolveTranscriptClientSide] Tier 1 - Direct native call: ${url}`);
        const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
        if (res.ok) {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            const lines = parseJsonSubtitles(data);
            if (lines.length > 0) {
              console.log(`[resolveTranscriptClientSide] Tier 1 succeeded directly (${url}): ${lines.length} lines`);
              return lines;
            }
          } catch (_) {
            const lines = parseTimedTextXml(text);
            if (lines.length > 0) return lines;
          }
        }
      } catch (err) {
        console.warn(`[resolveTranscriptClientSide] Tier 1 direct fetch failed (${url}):`, err);
      }
    }

    // 2. Cascade to corsproxy.io if direct client call triggers CORS
    for (const targetUrl of [asrUrl, directUrl]) {
      try {
        onProgress?.('Tier 1: Querying native timedtext via corsproxy.io...');
        const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
        console.log(`[resolveTranscriptClientSide] Tier 1 - Querying corsproxy.io: ${proxyUrl}`);
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            const lines = parseJsonSubtitles(data);
            if (lines.length > 0) {
              console.log(`[resolveTranscriptClientSide] Tier 1 succeeded via corsproxy.io: ${lines.length} lines`);
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

  // -------------------------------------------------------------
  // TIER 2: Delegated Timedtext URL (from Innertube Watch Metadata)
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

      // Try AllOrigins and corsproxy.io proxy on delegation URL
      for (const proxyBase of ['https://api.allorigins.win/raw?url=', 'https://corsproxy.io/?url=']) {
        try {
          const proxyUrl = `${proxyBase}${encodeURIComponent(directUrl)}`;
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
      }
    } catch (err) {
      console.warn('[resolveTranscriptClientSide] Direct delegation fetch failed, escalating:', err);
    }
  }

  if (!videoId) return null;

  // -------------------------------------------------------------
  // TIER 3: Piped API Gateway
  // -------------------------------------------------------------
  const pipedInstances = [
    `https://pipedapi.kavin.rocks/streams/${videoId}`,
    `https://api.piped.private.coffee/streams/${videoId}`
  ];

  for (const endpoint of pipedInstances) {
    try {
      onProgress?.('Stage 1: Resolving transcript via Piped API Gateway...');
      console.log(`[resolveTranscriptClientSide] Stage 1 - Querying Piped: ${endpoint}`);
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
                console.log(`[resolveTranscriptClientSide] Stage 1 succeeded via ${endpoint}: ${lines.length} lines`);
                return lines;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[resolveTranscriptClientSide] Stage 1 instance failed (${endpoint}):`, err);
    }
  }

  // -------------------------------------------------------------
  // STAGE 2: Invidious Public Instances
  // -------------------------------------------------------------
  const invidiousInstances = [
    `https://inv.nadeko.net/api/v1/captions/${videoId}?label=English`,
    `https://invidious.nerdvpn.de/api/v1/captions/${videoId}?label=English`,
    `https://inv.nadeko.net/api/v1/captions/${videoId}`,
    `https://invidious.nerdvpn.de/api/v1/captions/${videoId}`,
    `https://inv.tux.pizza/api/v1/captions/${videoId}`
  ];

  for (const endpoint of invidiousInstances) {
    try {
      onProgress?.('Stage 2: Resolving transcript via Invidious Public Instances...');
      console.log(`[resolveTranscriptClientSide] Stage 2 - Querying Invidious: ${endpoint}`);
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const text = await res.text();
        // Check if endpoint returned VTT content directly
        if (text.includes('-->') || text.startsWith('WEBVTT')) {
          const lines = parseWebVttSubtitles(text);
          if (lines.length > 0) {
            console.log(`[resolveTranscriptClientSide] Stage 2 succeeded via direct VTT (${endpoint}): ${lines.length} lines`);
            return lines;
          }
        }

        // Try parsing as JSON captions list
        try {
          const data = JSON.parse(text);
          const captions = Array.isArray(data) ? data : data.captions;
          if (Array.isArray(captions) && captions.length > 0) {
            const enTrack = captions.find((c: any) => 
              c.label?.toLowerCase().includes('english') || 
              c.language_code === 'en' || 
              c.language_code?.startsWith('en')
            ) || captions[0];

            if (enTrack?.url) {
              const baseUrl = endpoint.split('/api/v1/')[0];
              const subUrl = enTrack.url.startsWith('http') ? enTrack.url : `${baseUrl}${enTrack.url}`;
              const subRes = await fetch(subUrl, { signal: AbortSignal.timeout(5000) });
              if (subRes.ok) {
                const subText = await subRes.text();
                let lines = parseWebVttSubtitles(subText);
                if (lines.length === 0) {
                  lines = parseTimedTextXml(subText);
                }
                if (lines.length > 0) {
                  console.log(`[resolveTranscriptClientSide] Stage 2 succeeded via ${subUrl}: ${lines.length} lines`);
                  return lines;
                }
              }
            }
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn(`[resolveTranscriptClientSide] Stage 2 instance failed (${endpoint}):`, err);
    }
  }

  // -------------------------------------------------------------
  // STAGE 3: CORS Proxy to Watch Page
  // -------------------------------------------------------------
  try {
    onProgress?.('Stage 3: Extracting caption tracks via Watch Page CORS Proxy...');
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const proxyUrls = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(watchUrl)}`,
      `https://corsproxy.io/?url=${encodeURIComponent(watchUrl)}`
    ];

    for (const proxyUrl of proxyUrls) {
      try {
        console.log(`[resolveTranscriptClientSide] Stage 3 - Fetching watch page via proxy: ${proxyUrl}`);
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const html = await res.text();
        if (!html) continue;

        // Regex extract "captionTracks":\s*(\[.*?\])
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

              // Direct browser fetch (residential IP)
              try {
                const subRes = await fetch(jsonUrl);
                if (subRes.ok) {
                  const subText = await subRes.text();
                  try {
                    const jsonData = JSON.parse(subText);
                    const lines = parseJsonSubtitles(jsonData);
                    if (lines.length > 0) {
                      console.log(`[resolveTranscriptClientSide] Stage 3 direct fetch succeeded: ${lines.length} lines`);
                      return lines;
                    }
                  } catch (_) {
                    const lines = parseTimedTextXml(subText);
                    if (lines.length > 0) return lines;
                  }
                }
              } catch (_) {}

              // Fallback via CORS proxy on track URL
              const subProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(jsonUrl)}`;
              const subProxyRes = await fetch(subProxyUrl, { signal: AbortSignal.timeout(6000) });
              if (subProxyRes.ok) {
                const subText = await subProxyRes.text();
                try {
                  const jsonData = JSON.parse(subText);
                  const lines = parseJsonSubtitles(jsonData);
                  if (lines.length > 0) {
                    console.log(`[resolveTranscriptClientSide] Stage 3 proxy fetch succeeded: ${lines.length} lines`);
                    return lines;
                  }
                } catch (_) {
                  const lines = parseTimedTextXml(subText);
                  if (lines.length > 0) return lines;
                }
              }
            }
          }
        }
      } catch (proxyErr) {
        console.warn(`[resolveTranscriptClientSide] Stage 3 proxy attempt failed (${proxyUrl}):`, proxyErr);
      }
    }
  } catch (err) {
    console.warn('[resolveTranscriptClientSide] Stage 3 watch page extraction failed:', err);
  }

  return null;
}


