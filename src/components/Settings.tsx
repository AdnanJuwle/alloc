import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Brain, Save, AlertCircle, CheckCircle, Download, ExternalLink } from 'lucide-react';
import { electronAPI } from '../utils/electron-api';

export function Settings() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean | null>(null);
  const [checkingOllama, setCheckingOllama] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings.llmProvider === 'ollama' || !settings.llmProvider) {
      checkOllamaStatus();
    }
  }, [settings.ollamaUrl]);

  const checkOllamaStatus = async () => {
    setCheckingOllama(true);
    try {
      const available = await electronAPI.checkOllama();
      setOllamaAvailable(available);
    } catch (error) {
      setOllamaAvailable(false);
    } finally {
      setCheckingOllama(false);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await electronAPI.getSettings();
      setSettings(data || {});
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      await electronAPI.updateSettings(settings);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Settings</h2>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* LLM Configuration */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Brain size={20} style={{ color: '#007aff' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>AI-Enhanced Forecasting</h3>
            </div>

            <div style={{ 
              padding: '1rem', 
              background: '#e5f5e5', 
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #34c759'
            }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                <CheckCircle size={20} style={{ color: '#34c759', marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#34c759' }}>100% Free - Ollama (Recommended)</div>
                  <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>
                    Ollama runs AI models locally on your computer - completely free, no API keys needed, and your data never leaves your device!
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>AI Provider</label>
              <select
                value={settings.llmProvider || 'ollama'}
                onChange={(e) => {
                  const provider = e.target.value;
                  setSettings({ 
                    ...settings, 
                    llmProvider: provider,
                    llmEnabled: provider === 'ollama' ? true : settings.llmEnabled, // Auto-enable Ollama
                  });
                  if (provider === 'ollama') {
                    checkOllamaStatus();
                  }
                }}
              >
                <option value="ollama">Ollama (Free, Local, Recommended)</option>
                <option value="openai">OpenAI (Paid, Cloud)</option>
              </select>
            </div>

            {(!settings.llmProvider || settings.llmProvider === 'ollama') && (
              <>
                <div style={{ 
                  padding: '1rem', 
                  background: '#f5f5f7', 
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Install Ollama</div>
                  <div style={{ fontSize: '0.875rem', color: '#8e8e93', marginBottom: '0.75rem' }}>
                    Download and install Ollama from the official website, then pull a model:
                  </div>
                  <div style={{ 
                    background: '#000', 
                    color: '#fff', 
                    padding: '0.75rem', 
                    borderRadius: '6px', 
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    marginBottom: '0.75rem'
                  }}>
                    <div style={{ marginBottom: '0.5rem' }}># Install Ollama:</div>
                    <div style={{ marginBottom: '0.5rem' }}># Visit: <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" style={{ color: '#34c759' }}>ollama.com</a></div>
                    <div style={{ marginBottom: '0.5rem' }}># Then run:</div>
                    <div>ollama pull llama3</div>
                  </div>
                  <a 
                    href="https://ollama.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                  >
                    <Download size={14} />
                    Download Ollama
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div className="form-group">
                  <label>Ollama URL</label>
                  <input
                    type="text"
                    value={settings.ollamaUrl || 'http://localhost:11434'}
                    onChange={(e) => setSettings({ ...settings, ollamaUrl: e.target.value })}
                    placeholder="http://localhost:11434"
                  />
                  <small style={{ color: '#8e8e93', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                    Default: http://localhost:11434 (change if Ollama runs on different port/host)
                  </small>
                </div>

                <div className="form-group">
                  <label>Ollama Model</label>
                  <select
                    value={settings.ollamaModel || 'llama3'}
                    onChange={(e) => setSettings({ ...settings, ollamaModel: e.target.value })}
                  >
                    <option value="llama3">Llama 3 (Recommended - Fast & Capable)</option>
                    <option value="mistral">Mistral (Alternative)</option>
                    <option value="llama3.2">Llama 3.2 (Smaller, Faster)</option>
                    <option value="phi3">Phi-3 (Very Fast, Smaller)</option>
                  </select>
                  <small style={{ color: '#8e8e93', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                    Make sure you've pulled the model: <code style={{ background: '#f5f5f7', padding: '0.125rem 0.25rem', borderRadius: '3px' }}>ollama pull llama3</code>
                  </small>
                </div>

                <div style={{ 
                  padding: '0.75rem', 
                  background: ollamaAvailable ? '#e5f5e5' : '#ffe5e5', 
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {checkingOllama ? (
                    <>
                      <div style={{ width: '16px', height: '16px', border: '2px solid #007aff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: '0.875rem' }}>Checking Ollama connection...</span>
                    </>
                  ) : ollamaAvailable ? (
                    <>
                      <CheckCircle size={16} style={{ color: '#34c759' }} />
                      <span style={{ fontSize: '0.875rem', color: '#34c759' }}>Ollama is running and ready!</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} style={{ color: '#ff3b30' }} />
                      <span style={{ fontSize: '0.875rem', color: '#ff3b30' }}>Ollama not detected. Make sure it's installed and running.</span>
                    </>
                  )}
                  <button
                    className="btn btn-secondary"
                    onClick={checkOllamaStatus}
                    style={{ marginLeft: 'auto', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    Check Again
                  </button>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={settings.llmEnabled !== false}
                      onChange={(e) => setSettings({ ...settings, llmEnabled: e.target.checked })}
                    />
                    Enable AI-Enhanced Forecasting
                  </label>
                  <small style={{ color: '#8e8e93', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                    Ollama is free and runs locally - your data never leaves your computer!
                  </small>
                </div>
              </>
            )}

            {settings.llmProvider === 'openai' && (
              <>
                <div style={{ 
                  padding: '1rem', 
                  background: '#fff3cd', 
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  border: '1px solid #ffcc00'
                }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                    <AlertCircle size={20} style={{ color: '#ff9500', marginTop: '2px' }} />
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>OpenAI API (Paid)</div>
                      <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>
                        OpenAI API requires a paid account. Costs ~$0.001-0.002 per forecast with GPT-3.5-turbo.
                        Consider using Ollama (free) instead!
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={settings.llmEnabled || false}
                      onChange={(e) => setSettings({ ...settings, llmEnabled: e.target.checked })}
                    />
                    Enable AI-Enhanced Forecasting
                  </label>
                </div>

                {settings.llmEnabled && (
                  <>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Key size={16} style={{ color: '#8e8e93' }} />
                        OpenAI API Key
                      </label>
                      <input
                        type="password"
                        value={settings.openaiApiKey || ''}
                        onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                        placeholder="sk-..."
                        style={{ fontFamily: 'monospace' }}
                      />
                      <small style={{ color: '#8e8e93', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                        Get your API key from{' '}
                        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: '#007aff' }}>
                          platform.openai.com/api-keys
                        </a>
                        . Requires paid account.
                      </small>
                    </div>

                    <div className="form-group">
                      <label>Model</label>
                      <select
                        value={settings.llmModel || 'gpt-3.5-turbo'}
                        onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
                      >
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Recommended - Cost Efficient)</option>
                        <option value="gpt-4">GPT-4 (More Capable - Higher Cost)</option>
                        <option value="gpt-4-turbo-preview">GPT-4 Turbo (Latest - Highest Cost)</option>
                      </select>
                      <small style={{ color: '#8e8e93', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                        GPT-3.5-turbo costs ~$0.001-0.002 per forecast.
                      </small>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingTop: '1.5rem',
            borderTop: '1px solid #e5e5ea'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {saveStatus === 'success' && (
                <>
                  <CheckCircle size={16} style={{ color: '#34c759' }} />
                  <span style={{ color: '#34c759', fontSize: '0.875rem' }}>Settings saved</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle size={16} style={{ color: '#ff3b30' }} />
                  <span style={{ color: '#ff3b30', fontSize: '0.875rem' }}>Error saving settings</span>
                </>
              )}
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={16} style={{ marginRight: '0.5rem' }} />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

