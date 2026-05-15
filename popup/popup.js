document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    enableExtension: document.getElementById('enableExtension'),
    showBadge: document.getElementById('showBadge'),
    showElapsedTime: document.getElementById('showElapsedTime'),
    positionTop: document.getElementById('positionTop'),
    platformChatGPT: document.getElementById('platformChatGPT'),
    platformClaude: document.getElementById('platformClaude'),
    platformGemini: document.getElementById('platformGemini')
  };

  const themeBtn = document.getElementById('themeToggleBtn');

  // Load saved settings
  chrome.storage.sync.get({
    enableExtension: true,
    showBadge: true,
    showElapsedTime: true,
    positionTop: true,
    platformChatGPT: true,
    platformClaude: true,
    platformGemini: true,
    theme: 'dark'
  }, (items) => {
    Object.keys(elements).forEach(key => {
      if (elements[key]) {
        elements[key].checked = items[key];
      }
    });
    updateSelectAllState();

    if (items.theme === 'light') {
      document.body.classList.add('light-theme');
    }
  });

  const selectAll = document.getElementById('selectAllPlatforms');
  
  function updateSelectAllState() {
    if (selectAll) {
      selectAll.checked = elements.platformChatGPT.checked && 
                          elements.platformClaude.checked && 
                          elements.platformGemini.checked;
    }
  }

  if (selectAll) {
    selectAll.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      ['platformChatGPT', 'platformClaude', 'platformGemini'].forEach(key => {
        elements[key].checked = isChecked;
        chrome.storage.sync.set({ [key]: isChecked });
      });
    });
  }

  // Save settings when toggled
  Object.keys(elements).forEach(key => {
    if (elements[key]) {
      elements[key].addEventListener('change', (e) => {
        chrome.storage.sync.set({
          [key]: e.target.checked
        });
        if (key.startsWith('platform')) {
          updateSelectAllState();
        }
      });
    }
  });

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-theme');
      chrome.storage.sync.set({ theme: isLight ? 'light' : 'dark' });
    });
  }
});
