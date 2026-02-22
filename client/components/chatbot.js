// Floating AI Chatbot Widget
import { esc } from '../services/security.js';

const BASE_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : '/.netlify/functions';

let chatHistory = [];
let isOpen = false;

export function initChatbot() {
    // Inject floating button + chat panel
    const widget = document.createElement('div');
    widget.id = 'chat-widget';
    widget.innerHTML = `
    <button id="chat-toggle" class="chat-toggle" aria-label="Open AI assistant">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a7 7 0 0 1 7 7c0 3-1.5 5-3 6.5V20a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-4.5C6.5 14 5 12 5 9a7 7 0 0 1 7-7z"/>
        <path d="M10 22h4"/>
      </svg>
    </button>
    <div id="chat-panel" class="chat-panel">
      <div class="chat-header">
        <div>
          <div class="chat-header-title">Shield AI</div>
          <div class="chat-header-sub">Compliance assistant</div>
        </div>
        <button id="chat-close" class="chat-close">✕</button>
      </div>
      <div id="chat-messages" class="chat-messages">
        <div class="chat-msg assistant">
          <div class="chat-bubble">Hey! I'm Shield AI — your compliance assistant. Ask me anything about GDPR, HIPAA, AI governance, data privacy, or security best practices.</div>
        </div>
      </div>
      <form id="chat-form" class="chat-input-wrap">
        <input type="text" id="chat-input" class="chat-input" placeholder="Ask about compliance..." autocomplete="off" maxlength="500"/>
        <button type="submit" class="chat-send" id="chat-send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
        </button>
      </form>
    </div>`;
    document.body.appendChild(widget);

    document.getElementById('chat-toggle').addEventListener('click', toggleChat);
    document.getElementById('chat-close').addEventListener('click', toggleChat);
    document.getElementById('chat-form').addEventListener('submit', handleSend);
}

function toggleChat() {
    isOpen = !isOpen;
    const panel = document.getElementById('chat-panel');
    const toggle = document.getElementById('chat-toggle');
    panel.classList.toggle('open', isOpen);
    toggle.classList.toggle('hidden', isOpen);
    if (isOpen) document.getElementById('chat-input').focus();
}

async function handleSend(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    appendMessage('user', message);
    chatHistory.push({ role: 'user', content: message });

    // Show typing
    const typingId = 'typing-' + Date.now();
    appendTyping(typingId);

    try {
        const res = await fetch(`${BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history: chatHistory.slice(-6) })
        });
        const data = await res.json();
        removeTyping(typingId);

        const reply = data.reply || 'Sorry, I couldn\'t process that.';
        appendMessage('assistant', reply);
        chatHistory.push({ role: 'assistant', content: reply });
    } catch {
        removeTyping(typingId);
        appendMessage('assistant', 'Connection issue. Please try again.');
    }
}

function appendMessage(role, content) {
    const msgs = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;

    // Simple markdown-like formatting
    let html = esc(content)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n- /g, '<br>• ')
        .replace(/\n/g, '<br>');

    div.innerHTML = `<div class="chat-bubble">${html}</div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
}

function appendTyping(id) {
    const msgs = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg assistant';
    div.id = id;
    div.innerHTML = '<div class="chat-bubble chat-typing"><span></span><span></span><span></span></div>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
}

function removeTyping(id) {
    document.getElementById(id)?.remove();
}
