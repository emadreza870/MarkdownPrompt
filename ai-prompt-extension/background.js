// باز کردن Side Panel هنگام کلیک روی آیکون افزونه
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// گوش دادن به پیام‌ها از Side Panel و Content Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'insertPrompt') {
    // ارسال متن پرامپت به Content Script برای تزریق در صفحه
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'insertText',
          text: request.text
        });
      }
    });
  }
  
  if (request.action === 'getCurrentUrl') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendResponse({ url: tabs[0].url });
      } else {
        sendResponse({ url: null });
      }
    });
    return true; // برای پاسخ ناهمگام
  }
});
