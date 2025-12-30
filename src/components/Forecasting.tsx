import { useState, useEffect, useRef } from 'react';
import { Send, Brain, Sparkles, TrendingUp, AlertCircle, Lightbulb, Settings, Trash2, CheckCircle, X } from 'lucide-react';
import { electronAPI } from '../utils/electron-api';

interface ChatMessage {
  id?: string;
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [pendingActions, setPendingActions] = useState<Array<{ type: string; data: any; description?: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatMessages();
    checkLLMStatus();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatMessages = async () => {
    try {
      const savedMessages = await electronAPI.getChatMessages();
      if (savedMessages && savedMessages.length > 0) {
        setMessages(savedMessages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })));
      } else {
        // Initialize with welcome message if no saved messages
        const welcomeMessage: ChatMessage = {
          role: 'assistant',
          content: 'Hi! I\'m your AI financial advisor. I can help you with forecasting, scenario analysis, spending patterns, and more. What would you like to know?',
          timestamp: new Date().toISOString(),
        };
        setMessages([welcomeMessage]);
        await electronAPI.saveChatMessage(welcomeMessage);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
      // Fallback to welcome message
      setMessages([{
        role: 'assistant',
        content: 'Hi! I\'m your AI financial advisor. I can help you with forecasting, scenario analysis, spending patterns, and more. What would you like to know?',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoadingMessages(false);
    }
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
    const userMsg: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    
    // Save user message
    const userMsgId = await electronAPI.saveChatMessage(userMsg);
    userMsg.id = userMsgId;
    
    const newMessages: ChatMessage[] = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await electronAPI.llmChat(newMessages);
      
      let assistantContent = response.error ? `Error: ${response.error}` : response.content;
      
      // If there are actions, show them for confirmation instead of executing
      if (response.actions && response.actions.length > 0) {
        console.log('Received actions from LLM:', response.actions);
        setPendingActions(response.actions);
        assistantContent += '\n\n⚠️ I need your confirmation to perform the following actions:';
      }
      
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
      };
      
      // Save assistant message
      const assistantMsgId = await electronAPI.saveChatMessage(assistantMsg);
      assistantMsg.id = assistantMsgId;
      
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Error getting LLM response:', error);
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your API key in Settings and try again.',
        timestamp: new Date().toISOString(),
      };
      const errorMsgId = await electronAPI.saveChatMessage(errorMsg);
      errorMsg.id = errorMsgId;
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (query: string) => {
    handleSend(query);
  };

  const handleConfirmAction = async (action: any, index: number) => {
    try {
      console.log('=== ACTION CONFIRMATION START ===');
      console.log('Action to execute:', JSON.stringify(action, null, 2));
      console.log('Action index:', index);
      
      // Fix date format if needed
      if (action.data && action.data.date) {
        if (!action.data.date.includes('T')) {
          // Convert YYYY-MM-DD to ISO string
          const dateStr = action.data.date;
          action.data.date = new Date(dateStr + 'T00:00:00').toISOString();
          console.log('Date converted from', dateStr, 'to', action.data.date);
        }
      } else {
        // Use today's date if not provided
        action.data.date = new Date().toISOString();
        console.log('No date provided, using today:', action.data.date);
      }
      
      console.log('Calling executeLLMAction with:', JSON.stringify(action, null, 2));
      const result = await electronAPI.executeLLMAction(action);
      console.log('=== ACTION RESULT ===');
      console.log('Result:', JSON.stringify(result, null, 2));
      
      if (result && result.success) {
        // Add success message
        const successMsg: ChatMessage = {
          role: 'assistant',
          content: `✓ ${result.message || 'Action completed successfully'}`,
          timestamp: new Date().toISOString(),
        };
        const successMsgId = await electronAPI.saveChatMessage(successMsg);
        successMsg.id = successMsgId;
        setMessages(prev => [...prev, successMsg]);
        
        // Remove from pending
        setPendingActions(prev => prev.filter((_, i) => i !== index));
        
        // Refresh data - dispatch event with a delay to ensure DB is updated
        setTimeout(() => {
          console.log('Dispatching data-updated event');
          window.dispatchEvent(new CustomEvent('data-updated'));
        }, 500);
      } else {
        // Add error message
        const errorMsg: ChatMessage = {
          role: 'assistant',
          content: `✗ Action failed: ${result.error || 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        };
        const errorMsgId = await electronAPI.saveChatMessage(errorMsg);
        errorMsg.id = errorMsgId;
        setMessages(prev => [...prev, errorMsg]);
        
        // Remove from pending
        setPendingActions(prev => prev.filter((_, i) => i !== index));
      }
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `✗ Error executing action: ${error.message || 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
      const errorMsgId = await electronAPI.saveChatMessage(errorMsg);
      errorMsg.id = errorMsgId;
      setMessages(prev => [...prev, errorMsg]);
      setPendingActions(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleRejectAction = (index: number) => {
    setPendingActions(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmAllActions = async () => {
    const actionsToConfirm = [...pendingActions];
    for (let i = 0; i < actionsToConfirm.length; i++) {
      await handleConfirmAction(actionsToConfirm[i], i);
      // Small delay between actions to ensure DB updates complete
      if (i < actionsToConfirm.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    // Final refresh after all actions
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('data-updated'));
    }, 300);
  };

  const handleRejectAllActions = () => {
    setPendingActions([]);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {messages.length > 1 && (
              <button
                className="btn btn-secondary"
                onClick={async () => {
                  if (confirm('Are you sure you want to clear all chat messages?')) {
                    await electronAPI.clearChatMessages();
                    const welcomeMessage: ChatMessage = {
                      role: 'assistant',
                      content: 'Hi! I\'m your AI financial advisor. I can help you with forecasting, scenario analysis, spending patterns, and more. What would you like to know?',
                      timestamp: new Date().toISOString(),
                    };
                    await electronAPI.saveChatMessage(welcomeMessage);
                    setMessages([welcomeMessage]);
                  }
                }}
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
              >
                <Trash2 size={14} style={{ marginRight: '0.25rem' }} />
                Clear Chat
              </button>
            )}
            {!llmEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#ff9500' }}>
                <AlertCircle size={16} />
                <span>Configure in Settings</span>
              </div>
            )}
          </div>
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
        {loadingMessages ? (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '2rem'
          }}>
            <div style={{ textAlign: 'center', color: '#8e8e93' }}>
              <Brain size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <div>Loading chat history...</div>
            </div>
          </div>
        ) : (
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
          
          {/* Pending Actions Confirmation */}
          {pendingActions.length > 0 && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#fff3cd',
              borderRadius: '8px',
              border: '2px solid #ff9500',
              boxShadow: '0 2px 8px rgba(255, 149, 0, 0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <AlertCircle size={20} style={{ color: '#ff9500' }} />
                <div style={{ fontWeight: 600, flex: 1 }}>
                  ⚠️ Pending Actions ({pendingActions.length}) - Click buttons below to confirm
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleConfirmAllActions}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    <CheckCircle size={14} style={{ marginRight: '0.25rem' }} />
                    Confirm All
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleRejectAllActions}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    <X size={14} style={{ marginRight: '0.25rem' }} />
                    Reject All
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {pendingActions.map((action, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.75rem',
                      background: 'white',
                      borderRadius: '6px',
                      border: '1px solid #e5e5ea',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                        {action.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginBottom: '0.25rem' }}>
                        {action.description || 'No description provided'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#8e8e93', fontFamily: 'monospace', background: '#f5f5f7', padding: '0.25rem', borderRadius: '4px' }}>
                        {JSON.stringify(action.data, null, 2)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          console.log('Confirm button clicked for action:', action, 'index:', idx);
                          handleConfirmAction(action, idx);
                        }}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        <CheckCircle size={12} style={{ marginRight: '0.25rem' }} />
                        Confirm
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          console.log('Reject button clicked for action index:', idx);
                          handleRejectAction(idx);
                        }}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        <X size={12} style={{ marginRight: '0.25rem' }} />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        )}

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
