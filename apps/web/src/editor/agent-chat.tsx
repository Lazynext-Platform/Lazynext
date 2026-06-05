import React, { useState } from 'react';

export function AgentChat() {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Agent: Awaiting your instructions...' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    // TODO: Wire this directly to the apps/mcp protocol
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'system', content: `Agent: Received command. Modifying Rust state via MCP...` }]);
    }, 500);
    setInput('');
  };

  return (
    <div className="flex flex-col w-full h-64 bg-zinc-900 border-t border-zinc-800 p-4">
      <div className="text-sm font-bold text-blue-500 mb-2">AGENT CHAT</div>
      
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 mb-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`text-sm ${msg.role === 'user' ? 'text-zinc-100 text-right' : 'text-zinc-400 text-left'}`}>
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
          className="h-10 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
