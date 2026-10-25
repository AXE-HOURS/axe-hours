/**
 * Unified Video URL Validator & Video ID Extractor
 * Supports YouTube (/watch?v=, youtu.be/, /shorts/, /embed/, /live/, /v/),
 * Instagram (/reel/, /reels/, /p/),
 * and TikTok (/video/\d+, vm.tiktok.com, vt.tiktok.com, /t/)
 */

export interface VideoUrlValidationResult {
  isValid: boolean;
  platform?: 'youtube' | 'instagram' | 'tiktok';
  videoId?: string;
  errorMessage?: string;
  toastMessage?: string;
}

/**
 * Extracts standard 11-character YouTube video ID from various link formats.
 */
export function extractYoutubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const regExp = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/i;
  const match = trimmed.match(regExp);
  if (match && match[1] && match[1].length === 11) {
    return match[1];
  }
  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    const v = parsed.searchParams.get('v');
    if (v && v.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
      return v;
    }
  } catch {}
  return null;
}

/**
 * Validates candidate video URL and enforces direct video links over channel/profile links.
 */
export function validateVideoUrl(rawUrl: string): VideoUrlValidationResult {
  let trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      errorMessage: 'Please provide a direct video, Short, or Reel URL (e.g., https://youtube.com/watch?v=...)'
    };
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      errorMessage: 'Please provide a direct video, Short, or Reel URL (e.g., https://youtube.com/watch?v=...)'
    };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
  const pathname = parsed.pathname;

  // 1. YouTube Validation
  if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname === 'youtu.be') {
    // Explicitly reject non-video links: channels, handles, search, feed
    if (
      pathname.startsWith('/channel/') ||
      pathname.startsWith('/c/') ||
      pathname.startsWith('/user/') ||
      pathname.startsWith('/@') ||
      pathname.startsWith('/results') ||
      pathname.startsWith('/feed/') ||
      pathname === '/' ||
      pathname === ''
    ) {
      return {
        isValid: false,
        errorMessage: 'Please provide a direct YouTube video or Short URL (e.g., https://youtube.com/watch?v=dQw4w9WgXcQ or https://youtube.com/shorts/...)',
        toastMessage: 'Invalid Video Link: Channel and profile links are not supported.'
      };
    }

    const videoId = extractYoutubeVideoId(trimmed);
    if (!videoId || videoId.length !== 11) {
      return {
        isValid: false,
        errorMessage: 'Invalid YouTube video link. YouTube video IDs must be exactly 11 characters (e.g., https://youtube.com/watch?v=dQw4w9WgXcQ)',
        toastMessage: 'Invalid Video Link: YouTube video IDs must be exactly 11 characters.'
      };
    }

    return { isValid: true, platform: 'youtube', videoId };
  }

  // 2. Instagram Validation
  if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) {
    if (
      pathname.includes('/reel/') ||
      pathname.includes('/reels/') ||
      pathname.includes('/p/')
    ) {
      return { isValid: true, platform: 'instagram' };
    }
    return {
      isValid: false,
      errorMessage: 'Please provide a direct Instagram Reel URL (e.g., https://www.instagram.com/reel/C3xL...)',
      toastMessage: 'Invalid Video Link: Please provide a direct Instagram Reel URL.'
    };
  }

  // 3. TikTok Validation
  if (
    hostname === 'tiktok.com' ||
    hostname.endsWith('.tiktok.com') ||
    hostname === 'vm.tiktok.com' ||
    hostname === 'vt.tiktok.com'
  ) {
    const isDirectVideo =
      /\/video\/\d+/.test(pathname) ||
      hostname === 'vm.tiktok.com' ||
      hostname === 'vt.tiktok.com' ||
      pathname.startsWith('/t/');

    if (isDirectVideo) {
      return { isValid: true, platform: 'tiktok' };
    }

    // Profile or user link without video ID
    return {
      isValid: false,
      errorMessage: 'Please provide a direct TikTok video URL (e.g., https://www.tiktok.com/@creator/video/1234567890123456789)',
      toastMessage: 'Invalid Video Link: TikTok profile links are not supported. Please link a specific video.'
    };
  }

  return {
    isValid: false,
    errorMessage: 'Please provide a direct video, Short, or Reel URL (e.g., https://youtube.com/watch?v=...)',
    toastMessage: 'Unsupported video platform. Please provide a YouTube, TikTok, or Instagram link.'
  };
}

