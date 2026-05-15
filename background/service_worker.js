chrome.runtime.onInstalled.addListener(() => {
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
    chrome.storage.sync.set(items);
  });
});
