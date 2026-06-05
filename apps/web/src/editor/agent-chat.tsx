import React, { useState } from 'react';

export function AgentChat() {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Agent: Awaiting your instructions...' }
  ]);
  const [input, setInput] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: currentInput }]);
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentInput })
      });
      
      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { role: 'system', content: `Error: ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'system', content: data.response }]);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'system', content: `Network Error: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-64 bg-zinc-900 border-t border-zinc-800 p-4">
      <div className="text-sm font-bold text-blue-500 mb-2">AGENT CHAT</div>
      
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 mb-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'text-zinc-100 text-right' : 'text-zinc-400 text-left'}`}>
            {msg.content}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a command (e.g., 'Cut out the silences')..."
          className="flex-1 h-10 bg-zinc-800 rounded-md px-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button 
          onClick={handleSend}
          disabled={isLoading}
          className="h-10 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-zinc-400 text-white text-sm font-medium rounded-md transition-colors"
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
