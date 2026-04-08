import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { chatAPI } from '../../utils/api';

export default function ChatAssistant() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! I am the AttendX AI assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  if (location.pathname.includes('/live/')) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await chatAPI.sendMessage(newMessages);
      if (res.data.success) {
        setMessages([...newMessages, { role: 'assistant', content: res.data.reply }]);
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I am having trouble connecting right now.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-zoom-blue to-blue-600 shadow-xl shadow-zoom-blue/20 flex items-center justify-center text-white transition-all hover:scale-110 z-40 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <span className="text-2xl">✨</span>
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-6 right-6 w-[360px] h-[500px] bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right z-50 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/80 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zoom-blue to-blue-600 flex items-center justify-center text-xs font-bold text-white">
              AI
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AttendX Assistant</h3>
              <p className="text-[10px] text-green-400 font-medium tracking-widest uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm bg-zinc-950/50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user' 
                    ? 'bg-zoom-blue text-white rounded-tr-sm' 
                    : 'bg-zinc-800 text-zinc-200 border border-zinc-700/50 rounded-tl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl p-4 bg-zinc-800 text-zinc-200 border border-zinc-700/50 rounded-tl-sm flex gap-1.5 w-16">
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-3 bg-zinc-950 border-t border-zinc-800/80 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zoom-blue/50 focus:ring-1 focus:ring-zoom-blue/50 transition-all"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-zoom-blue flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors shrink-0"
          >
            ➤
          </button>
        </form>
      </div>
    </>
  );
}
