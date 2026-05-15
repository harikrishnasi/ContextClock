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

function syncSettingsToInjected() {
  window.postMessage({
    type: 'CONTEXT_CLOCK_SYNC',
    settings: settings
  }, '*');
}

chrome.storage.onChanged.addListener((changes) => {
  for (let [key, { newValue }] of Object.entries(changes)) {
    settings[key] = newValue;
  }
  syncSettingsToInjected();
});

function init() {
  if (!settings.enableExtension) return;

  const hostname = window.location.hostname;
  
  if (hostname.includes('chatgpt.com') && settings.platformChatGPT) {
    setupObserver(PLATFORMS.chatgpt);
  } else if (hostname.includes('claude.ai') && settings.platformClaude) {

    
    // Send initial settings
    setTimeout(syncSettingsToInjected, 100);
    
    // Listen for successful send from fetch interceptor to update timer and visually update UI
    window.addEventListener('message', (event) => {
      if (event.source !== window || !event.data) return;
      if (event.data.type === 'CONTEXT_CLOCK_SENT') {
        const now = Date.now();
        chrome.storage.sync.set({ lastMessageTime_claude: now });
        settings.lastMessageTime_claude = now;
        syncSettingsToInjected();

        // Visually update the UI so the user sees the timestamp immediately
        if (event.data.timestampStr) {
          let attempts = 0;
          const injectVisual = setInterval(() => {
            attempts++;
            if (attempts > 40) { // Give up after 2 seconds
              clearInterval(injectVisual);
              return;
            }

            const userMessages = document.querySelectorAll('[data-testid="user-message"]');
            if (userMessages.length > 0) {
              const lastMessage = userMessages[userMessages.length - 1];
              const textContainer = lastMessage.querySelector('.whitespace-pre-wrap') || lastMessage.querySelector('div') || lastMessage;
              
              // Only inject if the bubble doesn't already have our exact timestamp string
              // If lastMessage is still the PREVIOUS message, it will skip and keep polling until Claude renders the new one!
              if (!textContainer.innerText.includes(event.data.timestampStr) && !textContainer.querySelector('span[data-cc-injected]')) {
                 clearInterval(injectVisual); // Success, stop polling!

                 const span = document.createElement('span');
                 span.setAttribute('data-cc-injected', 'true');
                 span.style.opacity = '0.6'; // Make it look like subtle metadata
                 span.innerText = event.data.timestampStr;
                 
                 let br1 = document.createElement('br');
                 let br2 = document.createElement('br');
                 
                 if (settings.positionTop) {
                   textContainer.prepend(br1, br2);
                   textContainer.prepend(span);
                 } else {
                   textContainer.appendChild(br1);
                   textContainer.appendChild(br2);
                   textContainer.appendChild(span);
                 }

                 // Cleanup once Claude's backend syncs the text
                 const cleanup = setInterval(() => {
                   if (!span.isConnected) {
                     clearInterval(cleanup);
                   } else {
                     let container = span.closest('[data-testid="user-message"]') || span.parentNode;
                     if (container) {
                       const text = container.textContent;
                       const str = event.data.timestampStr;
                       if (text.indexOf(str) !== -1 && text.indexOf(str) !== text.lastIndexOf(str)) {
                         span.remove();
                         if (br1.isConnected) br1.remove();
                         if (br2.isConnected) br2.remove();
                         clearInterval(cleanup);
                       }
                     }
                   }
                 }, 300);
                 
                 setTimeout(() => clearInterval(cleanup), 30000); // fallback
              }
            }
          }, 50); // fast polling every 50ms
        }
      }
    });
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
    getEditor: () => document.querySelector('[data-testid="chat-input"]'),
    getSendButton: () => document.querySelector('button[aria-label="Send Message"]') || document.querySelector('button[aria-label="Send message"]'),
    inject: (editor, textToInsert, atTop) => {
      editor.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      
      if (atTop) {
        range.setStart(editor.firstChild || editor, 0);
        range.collapse(true);
      } else {
        let targetNode = editor;
        while (targetNode.lastChild) {
          targetNode = targetNode.lastChild;
        }
        if (targetNode.nodeType === Node.TEXT_NODE) {
          range.setStart(targetNode, targetNode.length);
          range.collapse(true);
        } else if (targetNode.nodeName === 'BR') {
          range.setStartAfter(targetNode);
          range.collapse(true);
        } else {
          range.selectNodeContents(targetNode);
          range.collapse(false);
        }
      }
      
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('insertText', false, textToInsert);
    }
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
    injectText(platform, editor, timestampStr + '\n\n', true);
  } else {
    injectText(platform, editor, '\n\n' + timestampStr, false);
  }

  const now = Date.now();
  const key = `lastMessageTime_${platform.name.toLowerCase()}`;
  chrome.storage.sync.set({ [key]: now });
  settings[key] = now;
}

function injectText(platform, editor, textToInsert, atTop) {
  if (platform.inject) {
    platform.inject(editor, textToInsert, atTop);
    return;
  }

  editor.focus();
  
  const selection = window.getSelection();
  const range = document.createRange();
  
  if (atTop) {
    range.selectNodeContents(editor);
    range.collapse(true); 
  } else {
    // Safely find the deepest last node to prevent AI editors (ProseMirror) from rejecting the insertion
    let targetNode = editor;
    while (targetNode.lastChild) {
      targetNode = targetNode.lastChild;
    }
    
    if (targetNode.nodeType === Node.TEXT_NODE) {
      range.setStart(targetNode, targetNode.length);
      range.collapse(true);
    } else if (targetNode.nodeName === 'BR') {
      range.setStartAfter(targetNode);
      range.collapse(true);
    } else {
      range.selectNodeContents(targetNode);
      range.collapse(false);
    }
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
