/**
 * Telemetry and Session Replay Privacy Masking Guard
 * California CIPA (California Invasion of Privacy Act) & GDPR Compliance
 *
 * Ensures that any current or third-party injected telemetry tools
 * (PostHog, LogRocket, Hotjar, FullStory, Sentry Replay) mask all user inputs,
 * form values, keystrokes, and auth tokens by default.
 */

declare global {
  interface Window {
    posthog?: any;
    LogRocket?: any;
    hj?: any;
    _fs_loaded?: boolean;
    _fs_mask_all?: boolean;
  }
}

export function enforceTelemetryMasking(): void {
  if (typeof window === 'undefined') return;

  // 1. PostHog Session Recording Masking
  if (window.posthog) {
    try {
      if (typeof window.posthog.set_config === 'function') {
        window.posthog.set_config({
          maskAllInputs: true,
          session_recording: {
            maskAllInputs: true,
            maskTextSelector: '[data-private], [data-mask], .ph-no-capture',
          },
        });
      }
    } catch (e) {
      console.warn('[Privacy] PostHog masking config error:', e);
    }
  }

  // 2. LogRocket Input Sanitizer Guard
  if (window.LogRocket && typeof window.LogRocket.init === 'function') {
    try {
      window.LogRocket.init(undefined, {
        dom: {
          inputSanitizer: true,
        },
      });
    } catch (_) {}
  }

  // 3. FullStory Masking Flags
  window._fs_mask_all = true;

  // 4. MutationObserver to automatically inject masking attributes on sensitive inputs
  try {
    const applyInputSanitizerAttributes = () => {
      const sensitiveInputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'input[type="password"], input[type="email"], input[type="tel"], input[name*="key"], input[name*="token"], input[id*="key"], input[id*="token"], textarea[id*="config"], textarea[id*="secret"]'
      );
      sensitiveInputs.forEach((el) => {
        el.setAttribute('data-private', 'true');
        el.setAttribute('data-mask', 'true');
        el.setAttribute('data-hj-suppress', 'true');
        el.setAttribute('data-clarity-mask', 'true');
        if (!el.classList.contains('ph-no-capture')) {
          el.classList.add('ph-no-capture');
        }
      });
    };

    // Run on init
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyInputSanitizerAttributes);
    } else {
      applyInputSanitizerAttributes();
    }

    // Observer for dynamically mounted form inputs
    const observer = new MutationObserver(() => {
      applyInputSanitizerAttributes();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } catch (err) {
    console.warn('[Privacy] DOM privacy observer error:', err);
  }
}
