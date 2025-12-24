import { useState, useEffect } from 'react';
import { Play, DollarSign, Wallet } from 'lucide-react';
import { IncomeScenario, AutoSplitResult } from '../types';
import { electronAPI } from '../utils/electron-api';

export function AutoSplit() {
  const [scenarios, setScenarios] = useState<IncomeScenario[]>([]);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<number[]>([]);
  const [incomeAmount, setIncomeAmount] = useState<number>(0);
  const [result, setResult] = useState<AutoSplitResult | null>(null);
  const [useScenario, setUseScenario] = useState(false);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    const data = await electronAPI.getIncomeScenarios();
    const mappedScenarios = data.map((s: any) => ({
      id: s.id,
      name: s.name,
      monthlyIncome: s.monthly_income,
      taxRate: s.tax_rate,
      fixedExpenses: s.fixed_expenses,
      scenarioType: s.scenario_type,
    }));
    setScenarios(mappedScenarios);
    
    // Select first scenario by default if available
    if (mappedScenarios.length > 0 && selectedScenarioIds.length === 0) {
      setSelectedScenarioIds([mappedScenarios[0].id!]);
      setUseScenario(true);
      setIncomeAmount(mappedScenarios[0].monthlyIncome);
    }
  };


  const handleCalculate = async () => {
    if (!incomeAmount || incomeAmount <= 0) {
      alert('Please enter a valid income amount');
      return;
    }

    // If using scenarios, calculate net income from combined scenarios
    if (useScenario && selectedScenarioIds.length > 0) {
      const selectedScenarios = scenarios.filter(s => selectedScenarioIds.includes(s.id!));
      // Sum incomes (already done in incomeAmount)
      // Average tax rate (weighted by income would be better, but average is simpler)
      const avgTaxRate = selectedScenarios.reduce((sum, s) => sum + s.taxRate, 0) / selectedScenarios.length;
      // Sum fixed expenses (if you have multiple income sources, expenses are additive)
      const totalFixedExpenses = selectedScenarios.reduce((sum, s) => sum + s.fixedExpenses, 0);
      
      // Calculate net income with combined values
      const netIncome = incomeAmount * (1 - avgTaxRate / 100) - totalFixedExpenses;
      
      // Call calculate-auto-split with the net income as the income amount (no scenario)
      // This works because the allocation logic only needs the net income to allocate from
      const splitResult = await electronAPI.calculateAutoSplit(Math.max(0, netIncome), undefined);
      
      // Adjust result to show correct gross income
      const adjustedResult = {
        ...splitResult,
        grossIncome: incomeAmount,
        netIncome: netIncome,
      };
      
      setResult(adjustedResult);
    } else {
      // No scenarios - just use income amount directly
      const splitResult = await electronAPI.calculateAutoSplit(incomeAmount, undefined);
      setResult(splitResult);
    }
  };

  const selectedScenarios = scenarios.filter(s => selectedScenarioIds.includes(s.id!));

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Auto-Split Calculator</h2>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0', width: 'fit-content', minWidth: '200px' }}>
              <input
                type="checkbox"
                checked={useScenario}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setUseScenario(checked);
                  if (checked && scenarios.length > 0) {
                    // Select first scenario if none selected
                    if (selectedScenarioIds.length === 0) {
                      const firstScenario = scenarios[0];
                      setSelectedScenarioIds([firstScenario.id!]);
                      setIncomeAmount(firstScenario.monthlyIncome);
                    }
                  } else {
                    // Clear selection when unchecking
                    setSelectedScenarioIds([]);
                  }
                }}
              />
              <span style={{ whiteSpace: 'nowrap' }}>Use Income Scenarios</span>
            </label>
            {useScenario && scenarios.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1d1d1f', marginBottom: '0.5rem', display: 'block' }}>
                  Select scenarios:
                </label>
                <select
                  multiple
                  value={selectedScenarioIds.map(id => id.toString())}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                    setSelectedScenarioIds(selected);
                    if (selected.length > 0) {
                      const selectedScenarios = scenarios.filter(s => selected.includes(s.id!));
                      const totalIncome = selectedScenarios.reduce((sum, s) => sum + s.monthlyIncome, 0);
                      setIncomeAmount(totalIncome);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d1d6',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    minHeight: '120px',
                    cursor: 'pointer',
                  }}
                >
                  {scenarios.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                      {scenario.name} (₹{scenario.monthlyIncome.toLocaleString()}, Tax: {scenario.taxRate}%, Fixed: ₹{scenario.fixedExpenses.toLocaleString()})
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.5rem' }}>
                  Hold Ctrl/Cmd to select multiple scenarios
                </div>
                {selectedScenarioIds.length > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#8e8e93' }}>
                    {selectedScenarioIds.length} scenario{selectedScenarioIds.length !== 1 ? 's' : ''} selected • Total Income: ₹{incomeAmount.toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>

          {!useScenario && (
            <div className="form-group">
              <label>Income Amount (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={incomeAmount || ''}
                onChange={(e) => setIncomeAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter monthly income"
              />
            </div>
          )}

          <button className="btn btn-primary" onClick={handleCalculate} style={{ width: '100%' }}>
            <Play size={16} style={{ marginRight: '0.5rem' }} />
            Calculate Auto-Split
          </button>
        </div>

        {selectedScenarios.length > 0 && useScenario && (
          <div style={{ 
            background: '#f5f5f7', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
              {selectedScenarios.length > 1 ? 'Combined Scenario Details:' : 'Scenario Details:'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                Avg Tax Rate: {(selectedScenarios.reduce((sum, s) => sum + s.taxRate, 0) / selectedScenarios.length).toFixed(1)}%
              </div>
              <div>
                Total Fixed Expenses: ₹{selectedScenarios.reduce((sum, s) => sum + s.fixedExpenses, 0).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="card">
          <div className="card-header">
            <h2>Allocation Results</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#f5f5f7', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ color: '#8e8e93', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Gross Income</div>
              <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>₹{result.grossIncome.toLocaleString()}</div>
            </div>
            <div style={{ background: '#f5f5f7', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ color: '#8e8e93', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Net Income</div>
              <div style={{ fontWeight: 600, fontSize: '1.25rem', color: '#007aff' }}>
                ₹{result.netIncome.toLocaleString()}
              </div>
            </div>
            <div style={{ background: '#f5f5f7', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ color: '#8e8e93', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Total Allocated</div>
              <div style={{ fontWeight: 600, fontSize: '1.25rem', color: '#34c759' }}>
                ₹{result.totalAllocated.toLocaleString()}
              </div>
            </div>
            <div style={{ background: '#34c75920', padding: '1rem', borderRadius: '8px', border: '2px solid #34c759' }}>
              <div style={{ color: '#8e8e93', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Free Spend</div>
              <div style={{ fontWeight: 600, fontSize: '1.25rem', color: '#34c759' }}>
                ₹{result.freeSpend.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
                Guilt-free spending money
              </div>
            </div>
          </div>

          {result.allocations.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Goal Allocations</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {result.allocations.map((allocation, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      background: allocation.type === 'emergency' ? '#fff3cd' : '#f5f5f7',
                      borderRadius: '8px',
                      border: allocation.type === 'emergency' ? '1px solid #ffc107' : '1px solid #e5e5ea',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {allocation.type === 'emergency' ? (
                        <Wallet size={20} style={{ color: '#ffc107' }} />
                      ) : (
                        <DollarSign size={20} style={{ color: '#007aff' }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {allocation.goalName}
                          {allocation.future && (
                            <span style={{ 
                              fontSize: '0.75rem', 
                              marginLeft: '0.5rem',
                              color: '#8e8e93',
                              fontStyle: 'italic'
                            }}>
                              (Future)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#8e8e93' }}>
                          {allocation.type === 'emergency' ? 'Emergency Fund (Priority)' : 'Goal Allocation'}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '1.125rem', color: '#1d1d1f' }}>
                      ₹{allocation.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.allocations.length === 0 && (
            <div className="empty-state">
              <h3>No goals configured</h3>
              <p>Create goal buckets first to see automatic allocations</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

