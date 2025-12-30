import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Brain, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { electronAPI } from '../utils/electron-api';

export function Settings() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadSettings();
  }, []);

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
              background: '#f5f5f7', 
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                <AlertCircle size={20} style={{ color: '#ff9500', marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>About AI Forecasting</div>
                  <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>
                    Enable AI-powered forecasting to get intelligent insights, risk analysis, and personalized recommendations. 
                    Uses OpenAI's API (GPT-3.5-turbo recommended for cost efficiency). Your data stays private - only financial summaries are sent to the API.
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
                    . Your key is stored locally and never shared.
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
                    GPT-3.5-turbo is recommended for most use cases. It's fast, accurate, and cost-effective (~$0.001-0.002 per forecast).
                  </small>
                </div>
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

