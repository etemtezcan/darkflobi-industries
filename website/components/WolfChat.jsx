// WolfChat.jsx - Terminal-style chat widget for talking to the wolf
import { useState, useRef, useEffect } from 'react';

export default function WolfChat() {
  const [messages, setMessages] = useState([
    { role: 'wolf', text: 'hey. i\'m the wolf — darkflobi\'s community agent. ask me anything about the project, token, or just chat. 😁' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/wolf-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'wolf', text: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'system', 
        text: `error: ${error.message}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-black border-2 border-green-500 text-green-500 px-4 py-3 font-mono text-sm hover:bg-green-500 hover:text-black transition-colors shadow-lg shadow-green-500/20"
      >
        &gt; chat with the wolf_
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-black border-2 border-green-500 flex flex-col font-mono text-sm shadow-lg shadow-green-500/20">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-green-500/50 bg-green-500/10">
        <span className="text-green-500">
          <span className="animate-pulse">●</span> wolf_chat
        </span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-green-500 hover:text-green-300 px-2"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`${
            msg.role === 'user' 
              ? 'text-cyan-400' 
              : msg.role === 'system'
              ? 'text-red-500'
              : 'text-green-500'
          }`}>
            <span className="opacity-60">
              {msg.role === 'user' ? '> ' : msg.role === 'system' ? '! ' : '🐺 '}
            </span>
            <span className="whitespace-pre-wrap">{msg.text}</span>
          </div>
        ))}
        {isLoading && (
          <div className="text-green-500 opacity-60">
            <span className="animate-pulse">█</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t border-green-500/50 p-2">
        <div className="flex items-center gap-2">
          <span className="text-green-500">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="type your message..."
            className="flex-1 bg-transparent text-green-500 placeholder-green-500/40 outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="text-green-500 hover:text-green-300 disabled:opacity-30"
          >
            ↵
          </button>
        </div>
      </form>

      {/* Footer */}
      <div className="text-center text-green-500/40 text-xs py-1 border-t border-green-500/20">
        powered by darkflobi
      </div>
    </div>
  );
}
