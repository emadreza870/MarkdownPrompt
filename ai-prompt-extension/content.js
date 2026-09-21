// Content Script برای تزریق متن پرامپت به صفحه چت و افزودن دکمه تزریق

let injectedButton = null;

// گوش دادن به پیام‌ها از Side Panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'insertText') {
    // ذخیره متن برای تزریق هنگام کلیک کاربر
    window.pendingPromptText = request.text;
    
    // ایجاد یا نمایش دکمه تزریق کنار باکس چت
    createOrShowInjectButton();
    
    sendResponse({ success: true });
  }
  return true;
});

// ایجاد دکمه تزریق کنار باکس تایپ
function createOrShowInjectButton() {
  // حذف دکمه قبلی اگر وجود دارد
  if (injectedButton) {
    injectedButton.remove();
  }
  
  // پیدا کردن باکس تایپ در سایت‌های مختلف
  const textarea = findTextarea();
  
  if (!textarea) {
    console.log('باکس تایپ پیدا نشد.');
    return;
  }
  
  // ایجاد دکمه تزریق
  injectedButton = document.createElement('button');
  injectedButton.id = 'ai-prompt-inject-btn';
  injectedButton.innerHTML = '📥 پرامپت';
  injectedButton.title = 'تزریق پرامپت ذخیره شده';
  
  // استایل‌دهی به دکمه
  Object.assign(injectedButton.style, {
    position: 'absolute',
    left: '12px',
    bottom: '12px',
    zIndex: '1000',
    padding: '8px 16px',
    backgroundColor: '#4a90e2',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    fontFamily: 'Tahoma, Segoe UI, sans-serif',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  });
  
  // افکت هاور
  injectedButton.addEventListener('mouseenter', () => {
    injectedButton.style.backgroundColor = '#357abd';
    injectedButton.style.transform = 'scale(1.05)';
  });
  
  injectedButton.addEventListener('mouseleave', () => {
    injectedButton.style.backgroundColor = '#4a90e2';
    injectedButton.style.transform = 'scale(1)';
  });
  
  // رویداد کلیک برای تزریق متن
  injectedButton.addEventListener('click', () => {
    if (window.pendingPromptText) {
      injectTextToTextarea(window.pendingPromptText);
      showTemporaryNotification('پرامپت تزریق شد!');
      
      // مخفی کردن دکمه پس از تزریق
      injectedButton.style.display = 'none';
      window.pendingPromptText = null;
    }
  });
  
  // قرار دادن دکمه کنار باکس تایپ
  const parent = textarea.parentElement;
  if (parent) {
    parent.style.position = 'relative';
    parent.appendChild(injectedButton);
  }
}

// پیدا کردن باکس تایپ در سایت‌های مختلف هوش مصنوعی
function findTextarea() {
  const url = window.location.href;
  
  // ChatGPT
  if (url.includes('chat.openai.com')) {
    return document.querySelector('textarea[name="prompt"]') || 
           document.querySelector('textarea[placeholder*="Message"]') ||
           document.querySelector('textarea');
  }
  
  // Gemini
  if (url.includes('gemini.google.com')) {
    return document.querySelector('textarea[aria-label]') ||
           document.querySelector('textarea[placeholder*="پیام"]') ||
           document.querySelector('textarea');
  }
  
  // Claude
  if (url.includes('claude.ai')) {
    return document.querySelector('textarea[placeholder*="Message"]') ||
           document.querySelector('textarea');
  }
  
  // Grok (x.com)
  if (url.includes('grok.x.ai') || url.includes('x.com/i/grok')) {
    return document.querySelector('textarea[placeholder*="Ask anything"]') ||
           document.querySelector('textarea[placeholder*="بپرس"]') ||
           document.querySelector('textarea');
  }
  
  // جستجوی عمومی
  return document.querySelector('textarea');
}

// تزریق متن به باکس تایپ
function injectTextToTextarea(text) {
  const textarea = findTextarea();
  
  if (!textarea) {
    alert('باکس تایپ پیدا نشد. لطفاً مطمئن شوید در صفحه چت هستید.');
    return;
  }
  
  // تمرکز روی باکس تایپ
  textarea.focus();
  
  // روش‌های مختلف برای تنظیم مقدار textarea
  try {
    // روش ۱: استفاده از Object.defineProperty
    Object.defineProperty(textarea, 'value', {
      value: text,
      configurable: true,
      writable: true
    });
    
    // روش ۲: dispatch events برای فعال‌سازی React/Vue
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    
    // روش ۳: شبیه‌سازی ورودی کاربر
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    ).set;
    
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(textarea, text);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // روش ۴: تنظیم مستقیم (fallback)
    if (!textarea.value) {
      textarea.value = text;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    console.log('متن با موفقیت تزریق شد.');
  } catch (error) {
    console.error('خطا در تزریق متن:', error);
    // تلاش نهایی
    textarea.value = text;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// نمایش نوتیفیکیشن موقت
function showTemporaryNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  
  Object.assign(notification.style, {
    position: 'fixed',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#4a90e2',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '25px',
    fontSize: '14px',
    fontWeight: '500',
    fontFamily: 'Tahoma, Segoe UI, sans-serif',
    zIndex: '9999',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    animation: 'slideUp 0.3s ease'
  });
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 2500);
}

// اضافه کردن انیمیشن به صفحه
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
  
  #ai-prompt-inject-btn:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
  }
`;
document.head.appendChild(style);

// بررسی تغییر URL برای SPAها
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // اگر متنی برای تزریق وجود دارد، دکمه را دوباره ایجاد کن
    if (window.pendingPromptText) {
      setTimeout(createOrShowInjectButton, 500);
    }
  }
}).observe(document, { subtree: true, childList: true });

console.log('AI Prompt Extension Content Script loaded.');
