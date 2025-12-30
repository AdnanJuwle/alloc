import { useState, useEffect, useRef } from 'react';
import { Send, Brain, Sparkles, TrendingUp, AlertCircle, Lightbulb, Settings } from 'lucide-react';
import { electronAPI } from '../utils/electron-api';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

const QUICK_ACTIONS = [
  { label: 'Show my financial forecast', query: 'Show me my financial forecast for the next 6 months' },
  { label: 'Analyze spending patterns', query: 'Analyze my spending patterns and identify any issues' },
  { label: 'Goal progress check', query: 'How am I doing with my goals? Are any at risk?' },
  { label: 'Budget review', query: 'Review my budgets and tell me if I\'m overspending anywhere' },
  { label: 'What if I buy...', query: 'What if I spend ₹50,000 next month on a purchase?' },
  { label: 'Savings recommendations', query: 'Give me recommendations to improve my savings rate' },
];

export function Forecasting() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m your AI financial advisor. I can help you with forecasting, scenario analysis, spending patterns, and more. What would you like to know?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [llmEnabled, setLlmEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkLLMStatus();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkLLMStatus = async () => {
    try {
      const settings = await electronAPI.getSettings();
      const provider = settings.llmProvider || 'ollama';
      
      if (provider === 'ollama') {
        // For Ollama, check if it's available
        const available = await electronAPI.checkOllama();
        setLlmEnabled(settings.llmEnabled !== false && available);
      } else {
        // For OpenAI, check API key
        setLlmEnabled(settings.llmEnabled && !!settings.openaiApiKey);
      }
    } catch (error) {
      console.error('Error checking LLM status:', error);
      setLlmEnabled(false);
    }
  };

  const handleSend = async (query?: string) => {
    const userMessage = query || input.trim();
    if (!userMessage) return;

    if (!llmEnabled) {
      setMessages(prev => [...prev, {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
      }, {
        role: 'assistant',
        content: 'AI-Enhanced Forecasting is not enabled. Please go to Settings and configure your OpenAI API key to use this feature.',
        timestamp: new Date().toISOString(),
      }]);
      setInput('');
      return;
    }

    // Add user message
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
      },
    ];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await electronAPI.llmChat(newMessages);
      
      if (response.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${response.error}`,
          timestamp: new Date().toISOString(),
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.content,
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (error) {
      console.error('Error getting LLM response:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your API key in Settings and try again.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (query: string) => {
    handleSend(query);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Brain size={24} style={{ color: '#007aff' }} />
            <h2 style={{ margin: 0 }}>AI Financial Advisor</h2>
            {llmEnabled && (
              <span style={{ 
                fontSize: '0.75rem', 
                padding: '0.25rem 0.5rem', 
                background: '#34c759', 
                color: 'white', 
                borderRadius: '4px' 
              }}>
                Active
              </span>
            )}
          </div>
          {!llmEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#ff9500' }}>
              <AlertCircle size={16} />
              <span>Configure API key in Settings</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {messages.length === 1 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e5ea' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Sparkles size={16} style={{ color: '#007aff' }} />
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#8e8e93' }}>Quick Actions</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
              {QUICK_ACTIONS.map((action, idx) => (
                <button
                  key={idx}
                  className="btn btn-secondary"
                  onClick={() => handleQuickAction(action.query)}
                  disabled={!llmEnabled}
                  style={{ 
                    padding: '0.75rem', 
                    fontSize: '0.875rem',
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                    opacity: llmEnabled ? 1 : 0.5,
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          {messages.map((message, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '0.5rem',
              }}
            >
              <div
                style={{
                  maxWidth: '75%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: message.role === 'user' 
                    ? '#007aff' 
                    : '#f5f5f7',
                  color: message.role === 'user' 
                    ? 'white' 
                    : '#000',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                }}
              >
                {message.role === 'assistant' && idx > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Brain size={14} style={{ color: '#007aff' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#007aff' }}>AI Advisor</span>
                  </div>
                )}
                {message.content}
                <div style={{ 
                  fontSize: '0.75rem', 
                  opacity: 0.7, 
                  marginTop: '0.5rem',
                  textAlign: 'right',
                }}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                background: '#f5f5f7',
                fontSize: '0.875rem',
                color: '#8e8e93',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Brain size={14} style={{ color: '#007aff' }} />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ 
          padding: '1rem 1.5rem', 
          borderTop: '1px solid #e5e5ea',
          display: 'flex',
          gap: '0.75rem',
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={llmEnabled ? "Ask me anything about your finances..." : "Enable AI in Settings to start chatting"}
            disabled={!llmEnabled || loading}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid #e5e5ea',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
          <button
            className="btn btn-primary"
            onClick={() => handleSend()}
            disabled={!llmEnabled || loading || !input.trim()}
            style={{ padding: '0.75rem 1.5rem' }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
