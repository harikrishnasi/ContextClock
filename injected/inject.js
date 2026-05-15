// ContextClock — Page Context Injector
// Intercepts Claude's fetch calls and stamps the message at network level

(function () {
  console.log('[ContextClock] Fetch interceptor active');
  let settings = {};

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.type === 'CONTEXT_CLOCK_SYNC') {
      settings = event.data.settings;
    }
  });

  function generateTimestamp() {
    const now = new Date();
    const hours = now.getHours();
    
    let period = 'Night';
    if (hours >= 5 && hours < 12) period = 'Morning';
    else if (hours >= 12 && hours < 17) period = 'Afternoon';
    else if (hours >= 17 && hours < 21) period = 'Evening';

    const dateOpts = { month: 'short', day: 'numeric', year: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', dateOpts);
    
    const timeOpts = { hour: 'numeric', minute: '2-digit', hour12: true };
    const timeStr = now.toLocaleTimeString('en-US', timeOpts);

    let elapsedStr = '';
    const lastTime = settings.lastMessageTime_claude;
    
    if (settings.showElapsedTime && lastTime) {
      const elapsedMs = now.getTime() - lastTime;
      const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
      const elapsedHours = Math.floor(elapsedMinutes / 60);
      const elapsedDays = Math.floor(elapsedHours / 24);
      
      if (elapsedDays > 0) {
        elapsedStr = ` · Last message: ${elapsedDays} days ago`;
      } else if (elapsedHours > 0) {
        elapsedStr = ` · Last message: ${elapsedHours} hours ago`;
      } else if (elapsedMinutes > 0) {
        elapsedStr = ` · Last message: ${elapsedMinutes} minutes ago`;
      } else {
        elapsedStr = ` · Last message: just now`;
      }
    }

    return `[${period} · ${dateStr} · ${timeStr}${elapsedStr}]`;
  }

  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    let [url, options] = args;

    try {
      if (
        settings.enableExtension && 
        settings.platformClaude &&
        typeof url === 'string' &&
        url.includes('/completion') &&
        options?.method === 'POST' &&
        options?.body
      ) {
        const body = JSON.parse(options.body);

        // Claude sends the message as `prompt` — not messages array
        if (body.prompt && typeof body.prompt === 'string') {
          console.log('[ContextClock] Intercepted POST to /completion');
          const timestampStr = generateTimestamp();
          const prefix = settings.positionTop ? timestampStr + '\n\n' : '';
          const suffix = settings.positionTop ? '' : '\n\n' + timestampStr;

          body.prompt = prefix + body.prompt + suffix;
          options = { ...options, body: JSON.stringify(body) };
          console.log('[ContextClock] Timestamp injected successfully into body.prompt');
          
          // Notify content script that a message was successfully intercepted and pass the string
          window.postMessage({ type: 'CONTEXT_CLOCK_SENT', timestampStr: timestampStr }, '*');
        }
      }
    } catch (_) {}

    return originalFetch.apply(this, [url, options]);
  };
})();
