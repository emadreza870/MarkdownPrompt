// متغیرهای سراسری
let currentPromptId = null;
let autoSaveTimeout = null;

// تشخیص تم سیستم و اعمال آن
function detectSystemTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

// اعمال تم به صفحه
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('theme', theme);
}

// بارگذاری تم ذخیره شده یا تشخیص خودکار
function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    applyTheme(detectSystemTheme());
  }
}

// تبدیل HTML به Markdown ساده
function htmlToMarkdown(html) {
  let text = html;
  
  // حذف تگ‌های اضافی
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  text = text.replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_');
  text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  text = text.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```');
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  text = text.replace(/<table[^>]*>(.*?)<\/table>/gis, '[جدول]\n');
  
  // حذف تمام تگ‌های باقی‌مانده
  text = text.replace(/<[^>]*>/g, '');
  
  // پاک‌سازی فاصله‌های اضافی
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.trim();
  
  return text;
}

// استخراج متن ساده از HTML برای پیش‌نمایش
function extractPlainText(html) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
}

// ذخیره پرامپت در chrome.storage
async function savePrompt() {
  const editor = document.getElementById('editor');
  const content = editor.innerHTML;
  
  if (!content.trim() || content === '<br>') {
    alert('لطفاً ابتدا متنی را وارد کنید.');
    return;
  }
  
  const plainText = extractPlainText(content);
  const title = plainText.split('\n')[0].substring(0, 50) || 'پرامپت بدون عنوان';
  const markdown = htmlToMarkdown(content);
  
  const promptData = {
    id: Date.now().toString(),
    title: title,
    content: content,
    markdown: markdown,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  try {
    const result = await chrome.storage.local.get(['prompts']);
    const prompts = result.prompts || [];
    prompts.unshift(promptData); // اضافه کردن به ابتدای لیست
    
    await chrome.storage.local.set({ prompts });
    
    // پاک کردن ویرایشگر پس از ذخیره
    editor.innerHTML = '';
    
    // به‌روزرسانی لیست پرامپت‌ها
    loadPromptsList();
    
    // نمایش پیام موفقیت
    showNotification('پرامپت با موفقیت ذخیره شد!');
  } catch (error) {
    console.error('خطا در ذخیره پرامپت:', error);
    alert('خطا در ذخیره پرامپت. لطفاً دوباره تلاش کنید.');
  }
}

// ذخیره خودکار (بدون کلیک کاربر)
function autoSave() {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    savePrompt();
  }, 2000); // ذخیره پس از 2 ثانیه عدم فعالیت
}

// بارگذاری لیست پرامپت‌های ذخیره شده
async function loadPromptsList() {
  const listContainer = document.getElementById('promptsList');
  
  try {
    const result = await chrome.storage.local.get(['prompts']);
    const prompts = result.prompts || [];
    
    if (prompts.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <p>هیچ پرامپتی ذخیره نشده است.</p>
          <p>اولین پرامپت خود را بنویسید و ذخیره کنید!</p>
        </div>
      `;
      return;
    }
    
    listContainer.innerHTML = '';
    prompts.forEach(prompt => {
      const item = document.createElement('div');
      item.className = 'prompt-item';
      item.dataset.id = prompt.id;
      
      const date = new Date(prompt.createdAt).toLocaleDateString('fa-IR');
      const plainText = extractPlainText(prompt.content);
      
      item.innerHTML = `
        <h3>${escapeHtml(prompt.title)}</h3>
        <p>${escapeHtml(plainText.substring(0, 100))}${plainText.length > 100 ? '...' : ''}</p>
        <div class="prompt-date">📅 ${date}</div>
      `;
      
      item.addEventListener('click', () => openPromptModal(prompt));
      listContainer.appendChild(item);
    });
  } catch (error) {
    console.error('خطا در بارگذاری پرامپت‌ها:', error);
    listContainer.innerHTML = '<div class="empty-state">خطا در بارگذاری پرامپت‌ها</div>';
  }
}

// باز کردن مودال برای نمایش/ویرایش پرامپت
function openPromptModal(prompt) {
  currentPromptId = prompt.id;
  const modal = document.getElementById('promptModal');
  const modalEditor = document.getElementById('modalEditor');
  
  document.getElementById('modalTitle').textContent = prompt.title;
  modalEditor.innerHTML = prompt.content;
  
  modal.classList.add('show');
  
  // تنظیم دکمه‌ها
  document.getElementById('updateBtn').onclick = () => updatePrompt(prompt.id);
  document.getElementById('deleteBtn').onclick = () => deletePrompt(prompt.id);
  document.getElementById('copyMdBtn').onclick = () => copyMarkdown(prompt.markdown);
  document.getElementById('downloadMdBtn').onclick = () => downloadMarkdownFile(prompt.title, prompt.markdown);
}

// بستن مودال
function closeModal() {
  const modal = document.getElementById('promptModal');
  modal.classList.remove('show');
  currentPromptId = null;
}

// به‌روزرسانی پرامپت
async function updatePrompt(id) {
  const modalEditor = document.getElementById('modalEditor');
  const content = modalEditor.innerHTML;
  
  if (!content.trim()) {
    alert('محتوا نمی‌تواند خالی باشد.');
    return;
  }
  
  const plainText = extractPlainText(content);
  const title = plainText.split('\n')[0].substring(0, 50) || 'پرامپت بدون عنوان';
  const markdown = htmlToMarkdown(content);
  
  try {
    const result = await chrome.storage.local.get(['prompts']);
    const prompts = result.prompts || [];
    
    const index = prompts.findIndex(p => p.id === id);
    if (index !== -1) {
      prompts[index] = {
        ...prompts[index],
        title: title,
        content: content,
        markdown: markdown,
        updatedAt: new Date().toISOString()
      };
      
      await chrome.storage.local.set({ prompts });
      closeModal();
      loadPromptsList();
      showNotification('پرامپت با موفقیت به‌روزرسانی شد!');
    }
  } catch (error) {
    console.error('خطا در به‌روزرسانی پرامپت:', error);
    alert('خطا در به‌روزرسانی پرامپت.');
  }
}

// حذف پرامپت
async function deletePrompt(id) {
  if (!confirm('آیا مطمئن هستید که می‌خواهید این پرامپت را حذف کنید؟')) {
    return;
  }
  
  try {
    const result = await chrome.storage.local.get(['prompts']);
    const prompts = result.prompts || [];
    
    const updatedPrompts = prompts.filter(p => p.id !== id);
    await chrome.storage.local.set({ prompts: updatedPrompts });
    
    closeModal();
    loadPromptsList();
    showNotification('پرامپت حذف شد.');
  } catch (error) {
    console.error('خطا در حذف پرامپت:', error);
    alert('خطا در حذف پرامپت.');
  }
}

// کپی Markdown به کلیپ‌بورد
async function copyMarkdown(markdown) {
  try {
    await navigator.clipboard.writeText(markdown);
    showNotification('متن Markdown کپی شد!');
  } catch (error) {
    console.error('خطا در کپی:', error);
    alert('خطا در کپی متن.');
  }
}

// دانلود فایل Markdown
function downloadMarkdownFile(title, markdown) {
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_')}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showNotification('فایل MD دانلود شد.');
}

// تزریق متن به صفحه چت
async function injectPromptToPage(markdown) {
  try {
    // ارسال پیام به background script برای تزریق متن
    await chrome.runtime.sendMessage({
      action: 'insertPrompt',
      text: markdown
    });
    showNotification('پرامپت آماده تزریق است. روی دکمه کنار باکس چت کلیک کنید.');
  } catch (error) {
    console.error('خطا در تزریق پرامپت:', error);
    alert('خطا در تزریق پرامپت. مطمئن شوید در سایت هوش مصنوعی هستید.');
  }
}

// نمایش نوتیفیکیشن
function showNotification(message) {
  // ایجاد المان نوتیفیکیشن
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--primary-color);
    color: white;
    padding: 12px 24px;
    border-radius: 25px;
    font-size: 0.9rem;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    animation: slideUp 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 2500);
}

// فرار دادن کاراکترهای HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// راه‌اندازی ویرایشگر با دستورات سفارشی
function setupEditor() {
  const editor = document.getElementById('editor');
  const toolbarButtons = document.querySelectorAll('.toolbar button');
  
  toolbarButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const command = button.dataset.command;
      const value = button.dataset.value || null;
      
      if (command === 'insertTable') {
        insertTable();
      } else if (command === 'code') {
        insertCode();
      } else {
        document.execCommand(command, false, value);
      }
      
      editor.focus();
    });
  });
  
  // گوش دادن به تغییرات برای ذخیره خودکار
  editor.addEventListener('input', autoSave);
}

// درج جدول
function insertTable() {
  const table = `
    <table style="width:100%; border-collapse: collapse;">
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">ستون ۱</td>
        <td style="border: 1px solid #ddd; padding: 8px;">ستون ۲</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">داده ۱</td>
        <td style="border: 1px solid #ddd; padding: 8px;">داده ۲</td>
      </tr>
    </table>
    <p><br></p>
  `;
  document.execCommand('insertHTML', false, table);
}

// درج بلوک کد
function insertCode() {
  const code = `<pre><code>کد خود را اینجا وارد کنید...</code></pre><p><br></p>`;
  document.execCommand('insertHTML', false, code);
}

// راه‌اندازی رویدادها
document.addEventListener('DOMContentLoaded', () => {
  // بارگذاری تم
  loadTheme();
  
  // راه‌اندازی ویرایشگر
  setupEditor();
  
  // بارگذاری لیست پرامپت‌ها
  loadPromptsList();
  
  // دکمه تغییر تم
  document.getElementById('themeBtn').addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  });
  
  // دکمه ذخیره
  document.getElementById('saveBtn').addEventListener('click', savePrompt);
  
  // دکمه پاک کردن
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('آیا مطمئن هستید که می‌خواهید ویرایشگر را پاک کنید؟')) {
      document.getElementById('editor').innerHTML = '';
    }
  });
  
  // بستن مودال با کلیک روی X
  document.querySelector('.close-btn').addEventListener('click', closeModal);
  
  // بستن مودال با کلیک بیرون از آن
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('promptModal');
    if (e.target === modal) {
      closeModal();
    }
  });
});
