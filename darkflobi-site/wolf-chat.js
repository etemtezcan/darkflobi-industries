// wolf-chat.js - Terminal-style chat widget for talking to the wolf
(function() {
  const RATE_LIMIT_KEY = 'wolf_chat_count';
  const RATE_LIMIT_TIME_KEY = 'wolf_chat_time';
  const MAX_MESSAGES = 20; // per hour
  
  // Check client-side rate limiting
  function checkRateLimit() {
    const now = Date.now();
    const lastTime = parseInt(localStorage.getItem(RATE_LIMIT_TIME_KEY) || '0');
    let count = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || '0');
    
    // Reset after 1 hour
    if (now - lastTime > 3600000) {
      count = 0;
      localStorage.setItem(RATE_LIMIT_TIME_KEY, now.toString());
    }
    
    if (count >= MAX_MESSAGES) {
      return false;
    }
    
    localStorage.setItem(RATE_LIMIT_KEY, (count + 1).toString());
    if (!lastTime) {
      localStorage.setItem(RATE_LIMIT_TIME_KEY, now.toString());
    }
    return true;
  }

  // Create styles
  const style = document.createElement('style');
  style.textContent = `
    #wolf-chat-toggle {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      background: #000;
      border: 2px solid #39ff14;
      color: #39ff14;
      font-family: 'Space Mono', 'Courier New', monospace;
      font-size: 14px;
      padding: 12px 20px;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 0 20px rgba(57,255,20,0.3);
    }
    #wolf-chat-toggle:hover {
      background: #39ff14;
      color: #000;
      box-shadow: 0 0 30px rgba(57,255,20,0.6);
    }
    
    #wolf-chat-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      width: 380px;
      height: 500px;
      background: #0a0a0c;
      border: 2px solid #39ff14;
      font-family: 'Space Mono', 'Courier New', monospace;
      display: none;
      flex-direction: column;
      box-shadow: 0 0 30px rgba(57,255,20,0.3);
    }
    #wolf-chat-container.open { display: flex; }
    
    #wolf-chat-header {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(57,255,20,0.3);
      background: rgba(57,255,20,0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #wolf-chat-header span {
      color: #39ff14;
      font-size: 13px;
    }
    #wolf-chat-header .pulse {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #39ff14;
      border-radius: 50%;
      margin-right: 8px;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 5px #39ff14; }
      50% { opacity: 0.5; box-shadow: 0 0 10px #39ff14; }
    }
    #wolf-chat-close {
      background: none;
      border: none;
      color: #39ff14;
      font-size: 20px;
      cursor: pointer;
      padding: 0 5px;
      line-height: 1;
    }
    #wolf-chat-close:hover { color: #fff; }
    
    #wolf-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }
    
    .wolf-msg {
      margin-bottom: 12px;
      font-size: 13px;
      line-height: 1.5;
    }
    .wolf-msg.wolf { color: #39ff14; }
    .wolf-msg.user { color: #00ffff; }
    .wolf-msg.system { color: #ff2d95; }
    .wolf-msg .prefix { opacity: 0.6; }
    
    #wolf-chat-loading {
      color: #39ff14;
      padding: 0 12px;
      opacity: 0.6;
      display: none;
    }
    #wolf-chat-loading.visible { display: block; }
    #wolf-chat-loading .cursor {
      animation: blink 0.7s infinite;
    }
    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }
    
    #wolf-chat-form {
      padding: 10px;
      border-top: 1px solid rgba(57,255,20,0.3);
      display: flex;
      gap: 8px;
      align-items: center;
    }
    #wolf-chat-form span {
      color: #39ff14;
    }
    #wolf-chat-input {
      flex: 1;
      background: transparent;
      border: none;
      color: #39ff14;
      font-family: inherit;
      font-size: 13px;
      outline: none;
    }
    #wolf-chat-input::placeholder {
      color: rgba(57,255,20,0.4);
    }
    #wolf-chat-submit {
      background: none;
      border: none;
      color: #39ff14;
      font-size: 16px;
      cursor: pointer;
      padding: 0 5px;
    }
    #wolf-chat-submit:hover { color: #fff; }
    #wolf-chat-submit:disabled { opacity: 0.3; cursor: not-allowed; }
    
    #wolf-chat-footer {
      text-align: center;
      padding: 6px;
      font-size: 10px;
      color: rgba(57,255,20,0.4);
      border-top: 1px solid rgba(57,255,20,0.1);
    }
    
    @media (max-width: 500px) {
      #wolf-chat-container {
        width: calc(100vw - 20px);
        height: calc(100vh - 100px);
        bottom: 10px;
        right: 10px;
      }
    }
  `;
  document.head.appendChild(style);

  // Create toggle button
  const toggle = document.createElement('button');
  toggle.id = 'wolf-chat-toggle';
  toggle.innerHTML = '> chat with the wolf_';
  document.body.appendChild(toggle);

  // Create chat container
  const container = document.createElement('div');
  container.id = 'wolf-chat-container';
  container.innerHTML = `
    <div id="wolf-chat-header">
      <span><span class="pulse"></span>wolf_chat</span>
      <button id="wolf-chat-close">&times;</button>
    </div>
    <div id="wolf-chat-messages"></div>
    <div id="wolf-chat-loading"><span class="cursor">█</span></div>
    <form id="wolf-chat-form">
      <span>&gt;</span>
      <input type="text" id="wolf-chat-input" placeholder="type your message..." maxlength="1000" autocomplete="off">
      <button type="submit" id="wolf-chat-submit">↵</button>
    </form>
    <div id="wolf-chat-footer">powered by darkflobi 😁</div>
  `;
  document.body.appendChild(container);

  // Elements
  const messages = container.querySelector('#wolf-chat-messages');
  const loading = container.querySelector('#wolf-chat-loading');
  const form = container.querySelector('#wolf-chat-form');
  const input = container.querySelector('#wolf-chat-input');
  const submit = container.querySelector('#wolf-chat-submit');
  const closeBtn = container.querySelector('#wolf-chat-close');

  // Add initial message
  addMessage('wolf', 'hey. i\'m the wolf — darkflobi\'s community agent. ask me anything about the project, token, or just say hi. 😁');

  // Toggle open/close
  toggle.addEventListener('click', () => {
    container.classList.add('open');
    toggle.style.display = 'none';
    input.focus();
  });

  closeBtn.addEventListener('click', () => {
    container.classList.remove('open');
    toggle.style.display = 'block';
  });

  // Send message
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    
    // Rate limit check
    if (!checkRateLimit()) {
      addMessage('system', 'slow down! max 20 messages per hour. try again later.');
      return;
    }
    
    input.value = '';
    addMessage('user', text);
    
    loading.classList.add('visible');
    input.disabled = true;
    submit.disabled = true;

    try {
      const response = await fetch('/api/wolf-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send');
      }

      addMessage('wolf', data.reply);
    } catch (err) {
      addMessage('system', 'error: ' + err.message);
    } finally {
      loading.classList.remove('visible');
      input.disabled = false;
      submit.disabled = false;
      input.focus();
    }
  });

  function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = 'wolf-msg ' + role;
    const prefix = role === 'user' ? '> ' : role === 'system' ? '! ' : '🐺 ';
    div.innerHTML = '<span class="prefix">' + prefix + '</span>' + escapeHtml(text);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
