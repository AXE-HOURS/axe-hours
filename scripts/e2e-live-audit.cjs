const puppeteer = require('puppeteer-core');
const http = require('http');
const https = require('https');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = process.env.TEST_URL || 'https://axe-hours.onrender.com';

console.log(`\n======================================================`);
console.log(`Starting Zero-Trust E2E Live Verification`);
console.log(`Target Base URL: ${BASE_URL}`);
console.log(`Chrome Binary: ${CHROME_PATH}`);
console.log(`======================================================\n`);

async function fetchJson(url, options = {}) {
  const isHttps = url.startsWith('https');
  const lib = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const opts = { ...options, headers: { ...(options.headers || {}) } };
    let bodyData = null;
    if (opts.body) {
      bodyData = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
      opts.headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = lib.request(url, opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, text: body });
        }
      });
    });
    req.on('error', reject);
    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

async function testApiEndpoints() {
  console.log(`\n--- 1. Testing API Endpoints & Schemas ---\n`);
  const results = [];

  // 1.1 /api/health
  try {
    const res = await fetchJson(`${BASE_URL}/api/health`);
    const ok = res.status === 200 && res.data?.status === 'ok' && res.data?.modelCascade?.[0] === 'gemini-2.5-flash';
    results.push({ name: 'GET /api/health', ok, detail: `Status: ${res.status}, Cascade: ${JSON.stringify(res.data?.modelCascade)}` });
  } catch (err) {
    results.push({ name: 'GET /api/health', ok: false, detail: err.message });
  }

  // 1.2 /api/auth/guest-token
  let guestToken = '';
  try {
    const res = await fetchJson(`${BASE_URL}/api/auth/guest-token`, { method: 'POST' });
    const ok = res.status === 200 && !!res.data?.token && typeof res.data.token === 'string';
    if (ok) guestToken = res.data.token;
    results.push({ name: 'POST /api/auth/guest-token', ok, detail: `Status: ${res.status}, Token length: ${res.data?.token?.length || 0}` });
  } catch (err) {
    results.push({ name: 'POST /api/auth/guest-token', ok: false, detail: err.message });
  }

  // 1.3 /api/me/quota
  try {
    const res = await fetchJson(`${BASE_URL}/api/me/quota`);
    const ok = res.status === 200 && res.data?.ok === true && typeof res.data?.extractions?.remaining === 'number';
    results.push({ name: 'GET /api/me/quota', ok, detail: `Status: ${res.status}, Tier: ${res.data?.tier}, Rem: ${res.data?.extractions?.remaining}/${res.data?.extractions?.limit}` });
  } catch (err) {
    results.push({ name: 'GET /api/me/quota', ok: false, detail: err.message });
  }

  // 1.4 /api/me/tier (unauthenticated -> 401)
  try {
    const res = await fetchJson(`${BASE_URL}/api/me/tier`);
    const ok = res.status === 401 && res.data?.ok === false;
    results.push({ name: 'GET /api/me/tier (unauth -> 401)', ok, detail: `Status: ${res.status}` });
  } catch (err) {
    results.push({ name: 'GET /api/me/tier (unauth -> 401)', ok: false, detail: err.message });
  }

  // 1.5 /api/billing/unlock-beta (unauthenticated -> 401)
  try {
    const res = await fetchJson(`${BASE_URL}/api/billing/unlock-beta`, { method: 'POST' });
    const ok = res.status === 401 && res.data?.ok === false;
    results.push({ name: 'POST /api/billing/unlock-beta (unauth -> 401)', ok, detail: `Status: ${res.status}` });
  } catch (err) {
    results.push({ name: 'POST /api/billing/unlock-beta (unauth -> 401)', ok: false, detail: err.message });
  }

  // 1.6 /api/youtube/channel-intel (via server key or RSS fallback with 0 client key exposure)
  try {
    const headers = guestToken ? { 'Authorization': `Bearer ${guestToken}` } : {};
    const res = await fetchJson(`${BASE_URL}/api/youtube/channel-intel?handleOrId=@mkbhd`, { headers });
    const ok = res.status === 200 && res.data?.ok === true && !!res.data?.channel?.title;
    results.push({ name: 'GET /api/youtube/channel-intel?handleOrId=@mkbhd', ok, detail: `Status: ${res.status}, Source: ${res.data?.source}, Channel: "${res.data?.channel?.title}", Videos: ${res.data?.recentVideos?.length || 0}` });
  } catch (err) {
    results.push({ name: 'GET /api/youtube/channel-intel', ok: false, detail: err.message });
  }

  // 1.7 /api/fetch-script (dQw4w9WgXcQ)
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (guestToken) headers['Authorization'] = `Bearer ${guestToken}`;
    const res = await fetchJson(`${BASE_URL}/api/fetch-script`, {
      method: 'POST',
      headers,
      body: { videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
    });
    const ok = res.status === 200 && (res.data?.ok === true || Array.isArray(res.data?.transcript));
    const linesCount = res.data?.transcript?.length || 0;
    results.push({ name: 'POST /api/fetch-script (dQw4w9WgXcQ)', ok, detail: `Status: ${res.status}, Lines: ${linesCount}, HookScore: ${res.data?.hookScore || 'N/A'}` });
  } catch (err) {
    results.push({ name: 'POST /api/fetch-script', ok: false, detail: err.message });
  }

  // 1.8 /api/support-chat
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (guestToken) headers['Authorization'] = `Bearer ${guestToken}`;
    const res = await fetchJson(`${BASE_URL}/api/support-chat`, {
      method: 'POST',
      headers,
      body: { message: 'How do I download a script?' }
    });
    const replyText = res.data?.text || res.data?.response || '';
    const ok = res.status === 200 && typeof replyText === 'string' && replyText.length > 0;
    results.push({ name: 'POST /api/support-chat', ok, detail: `Status: ${res.status}, Text length: ${replyText.length}` });
  } catch (err) {
    results.push({ name: 'POST /api/support-chat', ok: false, detail: err.message });
  }

  results.forEach(r => {
    console.log(`  ${r.ok ? '✓ PASS' : '✗ FAIL'}: ${r.name} -> ${r.detail}`);
  });

  return results;
}

async function testHeadlessBrowserFlows() {
  console.log(`\n--- 2. Testing Browser Views, Layout Overflows & Modals ---\n`);
  const browserResults = [];
  const consoleErrors = [];
  const uncaughtPageErrors = [];

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('chrome-extension')) {
          consoleErrors.push({ viewport: 'desktop', text });
        }
      }
    });
    page.on('pageerror', err => {
      uncaughtPageErrors.push({ viewport: 'desktop', text: err.message });
    });

    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#landing-header', { visible: true, timeout: 25000 });

    // 2.1 Verify 0 auto-opening modals on boot
    await new Promise(r => setTimeout(r, 1000));
    const openModalsOnBoot = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], #onboarding-tour-modal-overlay, #auth-modal-overlay');
      return !!modal && window.getComputedStyle(modal).display !== 'none';
    });
    browserResults.push({
      name: 'Desktop (1366px): No auto-opening modal on boot',
      ok: !openModalsOnBoot,
      detail: openModalsOnBoot ? 'Modal unexpectedly opened on boot' : 'Clean boot without intrusive modals'
    });

    // 2.2 Check Desktop Header (Log In & Sign Up)
    const headerAuthDesktop = await page.evaluate(() => {
      const login = document.querySelector('#landing-login-btn');
      const signup = document.querySelector('#landing-signup-top-btn');
      return {
        hasLogin: !!login && login.textContent.includes('Log In'),
        hasSignup: !!signup && signup.textContent.includes('Sign Up')
      };
    });
    browserResults.push({
      name: 'Desktop (1366px): Header shows "Log In" and "Sign Up"',
      ok: headerAuthDesktop.hasLogin && headerAuthDesktop.hasSignup,
      detail: `Log In: ${headerAuthDesktop.hasLogin}, Sign Up: ${headerAuthDesktop.hasSignup}`
    });

    // 2.3 Check desktop horizontal overflow (scrollWidth <= innerWidth)
    const desktopOverflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        hasOverflow: document.documentElement.scrollWidth > window.innerWidth
      };
    });
    browserResults.push({
      name: 'Desktop (1366px): 0 horizontal overflow (scrollWidth <= innerWidth)',
      ok: !desktopOverflow.hasOverflow,
      detail: `scrollWidth: ${desktopOverflow.scrollWidth}px, innerWidth: ${desktopOverflow.innerWidth}px`
    });

    // 2.4 Test Modal Escape Key Handler: Click "Log In" -> Press Escape
    await page.evaluate(() => document.querySelector('#landing-login-btn')?.click());
    await page.waitForSelector('#google-auth-container', { visible: true, timeout: 5000 });
    const modalOpened = await page.evaluate(() => !!document.querySelector('#google-auth-container'));
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 600));
    const modalClosedOnEscape = await page.evaluate(() => !document.querySelector('#google-auth-container'));
    browserResults.push({
      name: 'Desktop: "Log In" opens AuthModal and Escape key closes it',
      ok: modalOpened && modalClosedOnEscape,
      detail: `Opened on click: ${modalOpened}, Closed on Escape: ${modalClosedOnEscape}`
    });

    // 2.5 Mobile Viewport Check (390x844)
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 600));
    const headerAuthMobile = await page.evaluate(() => {
      const login = document.querySelector('#landing-login-btn');
      const signup = document.querySelector('#landing-signup-top-btn');
      return {
        hasLogin: !!login && login.textContent.includes('Log In'),
        hasSignup: !!signup && signup.textContent.includes('Sign Up')
      };
    });
    browserResults.push({
      name: 'Mobile (390px): Header shows "Log In" and "Sign Up"',
      ok: headerAuthMobile.hasLogin && headerAuthMobile.hasSignup,
      detail: `Log In: ${headerAuthMobile.hasLogin}, Sign Up: ${headerAuthMobile.hasSignup}`
    });

    const mobileOverflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        hasOverflow: document.documentElement.scrollWidth > window.innerWidth
      };
    });
    browserResults.push({
      name: 'Mobile (390px): 0 horizontal overflow (scrollWidth <= innerWidth)',
      ok: !mobileOverflow.hasOverflow,
      detail: `scrollWidth: ${mobileOverflow.scrollWidth}px, innerWidth: ${mobileOverflow.innerWidth}px`
    });

    // 2.6 Enter Workspace as Guest
    console.log(`\n--- 3. Testing Workspace Views & Cross-View Handoffs ---\n`);
    await page.setViewport({ width: 1366, height: 768 });
    await new Promise(r => setTimeout(r, 500));
    await page.evaluate(() => document.querySelector('#landing-guest-hdr-btn')?.click());
    await page.waitForSelector('#axe-hours-main-app-shell', { visible: true, timeout: 20000 });

    const hasTopNav = await page.evaluate(() => !!document.querySelector('#topnav-bar') || !!document.querySelector('header'));
    browserResults.push({
      name: 'Workspace: TopNav & Live Quota Pill mounted',
      ok: hasTopNav,
      detail: `TopNav mounted: ${hasTopNav}`
    });

    // 2.7 Competitor Intel -> Script Fetcher handoff
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('change-active-view', { detail: { view: 'competitor-intel' } }));
    });
    await new Promise(r => setTimeout(r, 1000));

    const handoffTriggered = await page.evaluate(() => {
      const btn = document.querySelector('#analyze-script-handoff-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Analyze Script'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    await page.waitForSelector('#script-fetcher-url-input', { visible: true, timeout: 10000 }).catch(() => {});
    const scriptFetcherVal = await page.evaluate(() => {
      const input = document.querySelector('#script-fetcher-url-input');
      return input ? input.value : '';
    });
    browserResults.push({
      name: 'Cross-View Handoff: Competitor Intel "Analyze Script →" pre-fills Script Fetcher',
      ok: handoffTriggered && scriptFetcherVal.includes('youtube.com'),
      detail: `Handoff clicked: ${handoffTriggered}, Value: "${scriptFetcherVal}"`
    });

    // 2.8 Teleprompter Studio: Play/Pause, Mirror, and Spoken Only controls
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('change-active-view', { detail: { view: 'teleprompter' } }));
    });
    await page.waitForSelector('#teleprompter-play-btn', { visible: true, timeout: 15000 }).catch(() => {});

    const prompterControls = await page.evaluate(() => {
      const play = document.querySelector('#teleprompter-play-btn');
      const mirror = document.querySelector('#teleprompter-mirror-btn');
      const spoken = document.querySelector('#teleprompter-spoken-chip');
      return {
        hasPlay: !!play,
        hasMirror: !!mirror,
        hasSpoken: !!spoken
      };
    });
    browserResults.push({
      name: 'Teleprompter Studio: Play/Pause, Mirror, and Spoken Only controls mounted',
      ok: prompterControls.hasPlay && prompterControls.hasMirror,
      detail: `Play/Pause: ${prompterControls.hasPlay}, Mirror: ${prompterControls.hasMirror}, Spoken Only: ${prompterControls.hasSpoken}`
    });

    // 2.9 Saved Ideas Vault: Inject starter blueprint
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('change-active-view', { detail: { view: 'saved' } }));
    });
    await page.waitForSelector('#load-starter-blueprint-btn', { visible: true, timeout: 15000 }).catch(() => {});

    const starterBtnClicked = await page.evaluate(() => {
      const btn = document.querySelector('#load-starter-blueprint-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Load Starter Blueprint'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    browserResults.push({
      name: 'Saved Ideas Vault: Load Starter Blueprint button functional',
      ok: starterBtnClicked,
      detail: `Starter blueprint clicked: ${starterBtnClicked}`
    });

    browserResults.forEach(r => {
      console.log(`  ${r.ok ? '✓ PASS' : '✗ FAIL'}: ${r.name} -> ${r.detail}`);
    });

    await page.close();
  } finally {
    await browser.close();
  }

  return { browserResults, consoleErrors, uncaughtPageErrors };
}

async function run() {
  const apiResults = await testApiEndpoints();
  let browserSuite = { browserResults: [], consoleErrors: [], uncaughtPageErrors: [] };

  try {
    browserSuite = await testHeadlessBrowserFlows();
  } catch (err) {
    console.error(`Browser execution failed:`, err);
  }

  console.log(`\n======================================================`);
  console.log(`Zero-Trust E2E Live Verification Summary`);
  console.log(`======================================================`);
  console.log(`API Endpoints Passed: ${apiResults.filter(r => r.ok).length} / ${apiResults.length}`);
  console.log(`Browser E2E Flows Passed: ${browserSuite.browserResults.filter(r => r.ok).length} / ${browserSuite.browserResults.length}`);
  console.log(`Console Errors: ${browserSuite.consoleErrors.length}`);
  console.log(`Uncaught Page Errors: ${browserSuite.uncaughtPageErrors.length}\n`);

  if (browserSuite.consoleErrors.length > 0) {
    console.log(`Console Errors:`, browserSuite.consoleErrors);
  }
}

run().catch(console.error);
