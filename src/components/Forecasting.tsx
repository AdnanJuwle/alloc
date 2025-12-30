import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Target, Lightbulb, AlertCircle, TrendingDown, Plus, X, Brain, Sparkles } from 'lucide-react';
import { Forecast, GoalForecast, Scenario, ScenarioImpact, SpendingPattern, SmartSuggestion } from '../types';
import { electronAPI } from '../utils/electron-api';

type ViewMode = 'forecast' | 'scenarios' | 'patterns' | 'suggestions';

export function Forecasting() {
  const [viewMode, setViewMode] = useState<ViewMode>('forecast');
  const [balanceForecast, setBalanceForecast] = useState<Forecast | null>(null);
  const [goalForecasts, setGoalForecasts] = useState<GoalForecast[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [spendingPatterns, setSpendingPatterns] = useState<SpendingPattern[]>([]);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [llmInsights, setLlmInsights] = useState<any>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [scenarioFormData, setScenarioFormData] = useState<Partial<Scenario>>({
    name: '',
    type: 'purchase',
    description: '',
    amount: 0,
    monthsAhead: 1,
  });
  const [monthsAhead, setMonthsAhead] = useState(6);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadForecasts();
    loadSpendingPatterns();
    loadSuggestions();
    loadLLMInsights();
  }, [monthsAhead]);

  const loadLLMInsights = async () => {
    setLlmLoading(true);
    try {
      const insights = await electronAPI.getLLMForecastInsights(monthsAhead);
      setLlmInsights(insights);
    } catch (error) {
      console.error('Error loading LLM insights:', error);
      setLlmInsights(null);
    } finally {
      setLlmLoading(false);
    }
  };

  const loadForecasts = async () => {
    setLoading(true);
    try {
      const balance = await electronAPI.forecastBalance(monthsAhead);
      const goals = await electronAPI.forecastGoals();
      setBalanceForecast(balance);
      setGoalForecasts(goals);
    } catch (error) {
      console.error('Error loading forecasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSpendingPatterns = async () => {
    try {
      const data = await electronAPI.analyzeSpendingPatterns();
      setSpendingPatterns(data);
    } catch (error) {
      console.error('Error loading spending patterns:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const data = await electronAPI.getSmartSuggestions();
      setSuggestions(data);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const handleScenarioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const impact = await electronAPI.simulateScenario(scenarioFormData);
      const newScenario: Scenario = {
        id: Date.now().toString(),
        name: scenarioFormData.name!,
        type: scenarioFormData.type!,
        description: scenarioFormData.description!,
        amount: scenarioFormData.amount,
        monthsAhead: scenarioFormData.monthsAhead!,
        impact: impact,
      };
      setScenarios([...scenarios, newScenario]);
      handleCloseScenarioModal();
    } catch (error) {
      console.error('Error simulating scenario:', error);
    }
  };

  const handleCloseScenarioModal = () => {
    setShowScenarioModal(false);
    setScenarioFormData({
      name: '',
      type: 'purchase',
      description: '',
      amount: 0,
      monthsAhead: 1,
    });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp size={16} style={{ color: '#ff3b30' }} />;
      case 'decreasing':
        return <TrendingDown size={16} style={{ color: '#34c759' }} />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ff3b30';
      case 'medium':
        return '#ff9500';
      default:
        return '#8e8e93';
    }
  };

  return (
    <div>
      {/* View Mode Toggle */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem' }}>
          <button
            className={viewMode === 'forecast' ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setViewMode('forecast')}
            style={{ flex: 1, padding: '0.75rem' }}
          >
            Forecasts
          </button>
          <button
            className={viewMode === 'scenarios' ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setViewMode('scenarios')}
            style={{ flex: 1, padding: '0.75rem' }}
          >
            Scenarios
          </button>
          <button
            className={viewMode === 'patterns' ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setViewMode('patterns')}
            style={{ flex: 1, padding: '0.75rem' }}
          >
            Patterns
          </button>
          <button
            className={viewMode === 'suggestions' ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setViewMode('suggestions')}
            style={{ flex: 1, padding: '0.75rem' }}
          >
            Suggestions
          </button>
        </div>
      </div>

      {/* Forecasts View */}
      {viewMode === 'forecast' && (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Balance Forecast</h2>
              <select
                value={monthsAhead}
                onChange={(e) => setMonthsAhead(parseInt(e.target.value))}
                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e5e5ea' }}
              >
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
              </select>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p>Calculating forecast...</p>
              </div>
            ) : balanceForecast ? (
              <div>
                <div style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  padding: '2rem',
                  color: 'white',
                  marginBottom: '1.5rem',
                }}>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                    Current Balance
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem' }}>
                    ₹{balanceForecast.currentBalance.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                    Projected in {monthsAhead} months
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                    ₹{balanceForecast.projectedBalance.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.5rem' }}>
                    Confidence: {balanceForecast.confidence}%
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1rem', background: '#f5f5f7', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.875rem', color: '#8e8e93', marginBottom: '0.25rem' }}>Monthly Income</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#34c759' }}>
                      ₹{balanceForecast.monthlyIncome.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ padding: '1rem', background: '#f5f5f7', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.875rem', color: '#8e8e93', marginBottom: '0.25rem' }}>Monthly Expenses</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ff3b30' }}>
                      ₹{balanceForecast.monthlyExpenses.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ padding: '1rem', background: '#f5f5f7', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.875rem', color: '#8e8e93', marginBottom: '0.25rem' }}>Monthly Savings</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#007aff' }}>
                      ₹{balanceForecast.monthlySavings.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Assumptions</h3>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {balanceForecast.assumptions.map((assumption, idx) => (
                      <li key={idx} style={{ 
                        padding: '0.5rem', 
                        marginBottom: '0.5rem', 
                        background: '#f5f5f7', 
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        color: '#8e8e93'
                      }}>
                        • {assumption}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* LLM Insights */}
                {llmLoading ? (
                  <div style={{ 
                    marginTop: '1.5rem', 
                    padding: '1rem', 
                    background: '#f5f5f7', 
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <Brain size={20} style={{ color: '#007aff', marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>Loading AI insights...</div>
                  </div>
                ) : llmInsights ? (
                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Brain size={20} style={{ color: '#007aff' }} />
                      <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>AI-Powered Insights</h3>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.25rem 0.5rem', 
                        background: '#007aff', 
                        color: 'white', 
                        borderRadius: '4px' 
                      }}>
                        Enhanced
                      </span>
                    </div>

                    {llmInsights.insights && llmInsights.insights.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#8e8e93' }}>
                          Key Insights
                        </div>
                        {llmInsights.insights.map((insight: string, idx: number) => (
                          <div key={idx} style={{ 
                            padding: '0.75rem', 
                            marginBottom: '0.5rem', 
                            background: '#f5f5f7', 
                            borderRadius: '6px',
                            fontSize: '0.875rem'
                          }}>
                            • {insight}
                          </div>
                        ))}
                      </div>
                    )}

                    {llmInsights.recommendations && llmInsights.recommendations.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <Lightbulb size={16} style={{ color: '#ff9500' }} />
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#8e8e93' }}>
                            Recommendations
                          </div>
                        </div>
                        {llmInsights.recommendations.map((rec: string, idx: number) => (
                          <div key={idx} style={{ 
                            padding: '0.75rem', 
                            marginBottom: '0.5rem', 
                            background: '#fff3cd', 
                            borderRadius: '6px',
                            fontSize: '0.875rem'
                          }}>
                            • {rec}
                          </div>
                        ))}
                      </div>
                    )}

                    {llmInsights.risks && llmInsights.risks.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <AlertCircle size={16} style={{ color: '#ff3b30' }} />
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#8e8e93' }}>
                            Risks to Watch
                          </div>
                        </div>
                        {llmInsights.risks.map((risk: string, idx: number) => (
                          <div key={idx} style={{ 
                            padding: '0.75rem', 
                            marginBottom: '0.5rem', 
                            background: '#ffe5e5', 
                            borderRadius: '6px',
                            fontSize: '0.875rem'
                          }}>
                            • {risk}
                          </div>
                        ))}
                      </div>
                    )}

                    {llmInsights.opportunities && llmInsights.opportunities.length > 0 && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <Sparkles size={16} style={{ color: '#34c759' }} />
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#8e8e93' }}>
                            Opportunities
                          </div>
                        </div>
                        {llmInsights.opportunities.map((opp: string, idx: number) => (
                          <div key={idx} style={{ 
                            padding: '0.75rem', 
                            marginBottom: '0.5rem', 
                            background: '#e5f5e5', 
                            borderRadius: '6px',
                            fontSize: '0.875rem'
                          }}>
                            • {opp}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ 
                    marginTop: '1.5rem', 
                    padding: '1rem', 
                    background: '#f5f5f7', 
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    color: '#8e8e93',
                    textAlign: 'center'
                  }}>
                    <Brain size={20} style={{ color: '#8e8e93', marginBottom: '0.5rem' }} />
                    <div>Enable AI-Enhanced Forecasting in Settings for intelligent insights</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <h3>No forecast available</h3>
                <p>Configure income scenarios to see balance forecasts</p>
              </div>
            )}
          </div>

          {/* Goal Forecasts */}
          <div className="card">
            <div className="card-header">
              <h2>Goal Completion Forecasts</h2>
            </div>
            {goalForecasts.length > 0 ? (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {goalForecasts.map((forecast) => (
                  <div
                    key={forecast.goalId}
                    style={{
                      border: '1px solid #e5e5ea',
                      borderRadius: '8px',
                      padding: '1rem',
                      background: 'white',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <Target size={16} style={{ color: '#007aff' }} />
                          <div style={{ fontWeight: 600 }}>{forecast.goalName}</div>
                          {forecast.onTrack ? (
                            <span style={{ 
                              fontSize: '0.75rem', 
                              padding: '0.25rem 0.5rem', 
                              background: '#34c759', 
                              color: 'white', 
                              borderRadius: '4px' 
                            }}>
                              On Track
                            </span>
                          ) : (
                            <span style={{ 
                              fontSize: '0.75rem', 
                              padding: '0.25rem 0.5rem', 
                              background: '#ff9500', 
                              color: 'white', 
                              borderRadius: '4px' 
                            }}>
                              Behind
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>
                          Progress: ₹{forecast.currentAmount.toLocaleString()} / ₹{forecast.targetAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
                      <div>
                        <div style={{ color: '#8e8e93', marginBottom: '0.25rem' }}>Projected Completion</div>
                        <div style={{ fontWeight: 600 }}>
                          {new Date(forecast.projectedCompletionDate).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
                          {forecast.monthsRemaining} months
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#8e8e93', marginBottom: '0.25rem' }}>Required Monthly</div>
                        <div style={{ fontWeight: 600, color: forecast.currentMonthly >= forecast.requiredMonthly ? '#34c759' : '#ff9500' }}>
                          ₹{forecast.requiredMonthly.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
                          Current: ₹{forecast.currentMonthly.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#8e8e93', marginBottom: '0.25rem' }}>Confidence</div>
                        <div style={{ fontWeight: 600 }}>
                          {forecast.confidence}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>No goals to forecast</h3>
                <p>Create goals to see completion date predictions</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scenarios View */}
      {viewMode === 'scenarios' && (
        <div>
          <div className="card">
            <div className="card-header">
              <h2>Scenario Simulation</h2>
              <button className="btn btn-primary" onClick={() => setShowScenarioModal(true)}>
                <Plus size={16} style={{ marginRight: '0.5rem' }} />
                Simulate Scenario
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '0 1.5rem' }}>
              <div style={{ padding: '1rem', background: '#f5f5f7', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                  <Lightbulb size={20} style={{ color: '#007aff', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>What-If Analysis</div>
                    <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>
                      Simulate scenarios like "What if I buy a GPU next month?" or "What if my income drops by 20%?" 
                      to see the impact on your financial plan.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {scenarios.length === 0 ? (
              <div className="empty-state">
                <h3>No scenarios simulated</h3>
                <p>Create a scenario to see its impact on your financial plan</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    style={{
                      border: '1px solid #e5e5ea',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      background: 'white',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                          {scenario.name}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#8e8e93', marginBottom: '0.5rem' }}>
                          {scenario.description}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#8e8e93' }}>
                          Type: {scenario.type.replace('_', ' ')} • In {scenario.monthsAhead} month{scenario.monthsAhead !== 1 ? 's' : ''}
                          {scenario.amount && ` • Amount: ₹${scenario.amount.toLocaleString()}`}
                        </div>
                      </div>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setScenarios(scenarios.filter(s => s.id !== scenario.id))}
                        style={{ padding: '0.5rem' }}
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {scenario.impact && (
                      <div style={{
                        padding: '1rem',
                        background: '#f5f5f7',
                        borderRadius: '8px',
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Impact</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                          <div>
                            <div style={{ color: '#8e8e93', marginBottom: '0.25rem' }}>Projected Balance</div>
                            <div style={{ fontWeight: 600 }}>
                              ₹{scenario.impact.projectedBalance.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#8e8e93', marginBottom: '0.25rem' }}>Monthly Savings Change</div>
                            <div style={{ fontWeight: 600, color: scenario.impact.monthlySavingsChange < 0 ? '#ff3b30' : '#34c759' }}>
                              {scenario.impact.monthlySavingsChange >= 0 ? '+' : ''}
                              ₹{scenario.impact.monthlySavingsChange.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        {scenario.impact.affectedGoals.length > 0 && (
                          <div style={{ marginTop: '1rem' }}>
                            <div style={{ color: '#8e8e93', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Affected Goals:</div>
                            {scenario.impact.affectedGoals.map((ag, idx) => (
                              <div key={idx} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                • {ag.goalName}: {ag.completionDateShift > 0 ? `+${ag.completionDateShift} months delay` : 'No delay'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scenario Modal */}
          {showScenarioModal && (
            <div className="modal-overlay" onClick={handleCloseScenarioModal}>
              <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                  <h3>Simulate Scenario</h3>
                  <button className="close-btn" onClick={handleCloseScenarioModal}>×</button>
                </div>
                <form onSubmit={handleScenarioSubmit}>
                  <div className="form-group">
                    <label>Scenario Name</label>
                    <input
                      type="text"
                      required
                      value={scenarioFormData.name}
                      onChange={(e) => setScenarioFormData({ ...scenarioFormData, name: e.target.value })}
                      placeholder="e.g., Buy GPU next month"
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      required
                      value={scenarioFormData.description}
                      onChange={(e) => setScenarioFormData({ ...scenarioFormData, description: e.target.value })}
                      placeholder="e.g., One-time purchase of ₹50,000"
                    />
                  </div>

                  <div className="form-group">
                    <label>Scenario Type</label>
                    <select
                      value={scenarioFormData.type}
                      onChange={(e) => setScenarioFormData({ ...scenarioFormData, type: e.target.value as any })}
                      required
                    >
                      <option value="purchase">One-time Purchase</option>
                      <option value="income_change">Income Change</option>
                      <option value="expense_change">Expense Change</option>
                      <option value="goal_adjustment">Goal Adjustment</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={scenarioFormData.amount}
                      onChange={(e) => setScenarioFormData({ ...scenarioFormData, amount: parseFloat(e.target.value) || 0 })}
                      placeholder={scenarioFormData.type === 'income_change' ? 'Percentage change (e.g., -20 for 20% decrease)' : 'Amount in ₹'}
                    />
                    <small style={{ color: '#8e8e93', fontSize: '0.75rem' }}>
                      {scenarioFormData.type === 'income_change' ? 'Enter percentage (positive for increase, negative for decrease)' : 'Enter amount in ₹'}
                    </small>
                  </div>

                  <div className="form-group">
                    <label>When (months from now)</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={scenarioFormData.monthsAhead}
                      onChange={(e) => setScenarioFormData({ ...scenarioFormData, monthsAhead: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={handleCloseScenarioModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Simulate
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spending Patterns View */}
      {viewMode === 'patterns' && (
        <div className="card">
          <div className="card-header">
            <h2>Spending Pattern Analysis</h2>
          </div>
          {spendingPatterns.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {spendingPatterns.map((pattern) => (
                <div
                  key={pattern.categoryId}
                  style={{
                    border: '1px solid #e5e5ea',
                    borderRadius: '8px',
                    padding: '1rem',
                    background: 'white',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>{pattern.categoryName}</div>
                        {getTrendIcon(pattern.trend)}
                        {pattern.trend !== 'stable' && (
                          <span style={{ fontSize: '0.75rem', color: pattern.trend === 'increasing' ? '#ff3b30' : '#34c759' }}>
                            {pattern.trend === 'increasing' ? '+' : '-'}{pattern.trendPercentage.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>
                        Average: ₹{pattern.averageMonthly.toLocaleString()}/month
                      </div>
                    </div>
                  </div>

                  {pattern.recurringLeaks.length > 0 && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e5ea' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Recurring Expenses:</div>
                      {pattern.recurringLeaks.map((leak, idx) => (
                        <div key={idx} style={{ fontSize: '0.875rem', color: '#8e8e93', marginBottom: '0.25rem' }}>
                          • {leak.description}: ₹{leak.averageAmount.toLocaleString()} ({leak.frequency})
                        </div>
                      ))}
                    </div>
                  )}

                  {pattern.wastefulHabits.length > 0 && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e5ea' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <AlertCircle size={16} style={{ color: '#ff9500' }} />
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ff9500' }}>Wasteful Habits:</div>
                      </div>
                      {pattern.wastefulHabits.map((habit, idx) => (
                        <div key={idx} style={{ fontSize: '0.875rem', color: '#8e8e93', marginBottom: '0.25rem' }}>
                          • {habit}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No spending patterns detected</h3>
              <p>Record expenses with categories to see spending pattern analysis</p>
            </div>
          )}
        </div>
      )}

      {/* Smart Suggestions View */}
      {viewMode === 'suggestions' && (
        <div className="card">
          <div className="card-header">
            <h2>Smart Suggestions</h2>
            <button className="btn btn-secondary" onClick={loadSuggestions} style={{ fontSize: '0.875rem' }}>
              Refresh
            </button>
          </div>
          {suggestions.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {suggestions
                .sort((a, b) => {
                  const priorityOrder = { high: 3, medium: 2, low: 1 };
                  return priorityOrder[b.priority] - priorityOrder[a.priority];
                })
                .map((suggestion, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: `2px solid ${getPriorityColor(suggestion.priority)}40`,
                      borderRadius: '8px',
                      padding: '1rem',
                      background: 'white',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <Lightbulb size={20} style={{ color: getPriorityColor(suggestion.priority) }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <div style={{ fontWeight: 600 }}>{suggestion.title}</div>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.25rem 0.5rem', 
                            background: getPriorityColor(suggestion.priority), 
                            color: 'white', 
                            borderRadius: '4px',
                            textTransform: 'capitalize'
                          }}>
                            {suggestion.priority}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>
                          {suggestion.description}
                        </div>
                        {suggestion.impact.savingsPotential && (
                          <div style={{ fontSize: '0.875rem', color: '#34c759', marginTop: '0.5rem', fontWeight: 600 }}>
                            Potential Savings: ₹{suggestion.impact.savingsPotential.toLocaleString()}/month
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="empty-state">
              <Lightbulb size={48} style={{ color: '#8e8e93', marginBottom: '1rem' }} />
              <h3>No suggestions at this time</h3>
              <p>Your financial plan looks good! Suggestions will appear when opportunities are detected.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

