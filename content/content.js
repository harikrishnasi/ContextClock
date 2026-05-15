console.log('ContextClock loaded');

let settings = {};
chrome.storage.sync.get({
  enableExtension: true,
  showBadge: true,
  showElapsedTime: true,
  positionTop: true,
  platformChatGPT: true,
  platformClaude: true,
  platformGemini: true,
  lastMessageTime_chatgpt: null,
  lastMessageTime_claude: null,
  lastMessageTime_gemini: null
}, (items) => {
  settings = items;
  init();
});

chrome.storage.onChanged.addListener((changes) => {
  for (let [key, { newValue }] of Object.entries(changes)) {
    settings[key] = newValue;
  }
});

function init() {
  if (!settings.enableExtension) return;

  const hostname = window.location.hostname;
  
  if (hostname.includes('chatgpt.com') && settings.platformChatGPT) {
    setupObserver(PLATFORMS.chatgpt);
  } else if (hostname.includes('claude.ai') && settings.platformClaude) {
    setupObserver(PLATFORMS.claude);
  } else if (hostname.includes('gemini.google.com') && settings.platformGemini) {
    setupObserver(PLATFORMS.gemini);
  }
}

const PLATFORMS = {
  chatgpt: {
    name: 'ChatGPT',
    getEditor: () => document.querySelector('#prompt-textarea'),
    getSendButton: () => document.querySelector('button[data-testid="send-button"]')
  },
  claude: {
    name: 'Claude',
    getEditor: () => document.querySelector('div[contenteditable="true"]'),
    getSendButton: () => document.querySelector('button[aria-label="Send Message"]')
  },
  gemini: {
    name: 'Gemini',
    getEditor: () => document.querySelector('rich-textarea div[contenteditable="true"]') || document.querySelector('div.ql-editor'),
    getSendButton: () => document.querySelector('button[aria-label="Send message"]') || document.querySelector('.send-button')
  }
};

let observer;
let currentEditor = null;
let currentButton = null;

function setupObserver(platform) {
  if (observer) observer.disconnect();
  
  attachListeners(platform);

  observer = new MutationObserver(() => {
    attachListeners(platform);
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

function attachListeners(platform) {
  const editor = platform.getEditor();
  const sendButton = platform.getSendButton();

  if (editor && editor !== currentEditor) {
    currentEditor = editor;
    editor.addEventListener('keydown', (e) => {
      // Allow sending with Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        handleSend(platform, editor);
      }
    }, { capture: true }); // Use capture to intercept before framework handles it
  }

  if (sendButton && sendButton !== currentButton) {
    currentButton = sendButton;
    sendButton.addEventListener('click', (e) => {
      handleSend(platform, currentEditor || platform.getEditor());
    }, { capture: true });
  }
}

function handleSend(platform, editor) {
  if (!editor || !settings.enableExtension) return;
  
  const text = editor.innerText || editor.textContent || '';
  // Check if editor is practically empty (maybe just linebreaks)
  if (text.trim().length === 0) return;

  const timestampStr = generateTimestamp(platform);
  
  if (settings.positionTop) {
    injectText(editor, timestampStr + '\n\n', true);
  } else {
    injectText(editor, '\n\n' + timestampStr, false);
  }

  const now = Date.now();
  const key = `lastMessageTime_${platform.name.toLowerCase()}`;
  chrome.storage.sync.set({ [key]: now });
  settings[key] = now;
}

function injectText(editor, textToInsert, atTop) {
  editor.focus();
  
  const selection = window.getSelection();
  const range = document.createRange();
  
  if (atTop) {
    range.selectNodeContents(editor);
    range.collapse(true); 
  } else {
    // Safely append inside the last paragraph/node to prevent AI editors from moving it to the top
    const targetNode = editor.lastChild || editor;
    range.selectNodeContents(targetNode);
    range.collapse(false);
  }
  
  selection.removeAllRanges();
  selection.addRange(range);

  // Insert the text using execCommand which often plays nicely with React/ProseMirror
  document.execCommand('insertText', false, textToInsert);
}

function generateTimestamp(platform) {
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
  const key = `lastMessageTime_${platform.name.toLowerCase()}`;
  const lastTime = settings[key];
  
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
