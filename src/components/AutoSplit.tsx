import React, { useState, useEffect } from 'react';
import { Play, TrendingUp, DollarSign, Wallet } from 'lucide-react';
import { IncomeScenario, AutoSplitResult } from '../types';
import { electronAPI } from '../utils/electron-api';

export function AutoSplit() {
  const [scenarios, setScenarios] = useState<IncomeScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  const [incomeAmount, setIncomeAmount] = useState<number>(0);
  const [result, setResult] = useState<AutoSplitResult | null>(null);
  const [useScenario, setUseScenario] = useState(false);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    const data = await electronAPI.getIncomeScenarios();
    setScenarios(data.map((s: any) => ({
      id: s.id,
      name: s.name,
      monthlyIncome: s.monthly_income,
      taxRate: s.tax_rate,
      fixedExpenses: s.fixed_expenses,
      scenarioType: s.scenario_type,
    })));
    
    // Select first scenario by default if available
    if (data.length > 0 && !selectedScenarioId) {
      setSelectedScenarioId(data[0].id);
      setUseScenario(true);
      setIncomeAmount(data[0].monthly_income);
    }
  };

  const handleCalculate = async () => {
    if (!incomeAmount || incomeAmount <= 0) {
      alert('Please enter a valid income amount');
      return;
    }

    const scenarioId = useScenario && selectedScenarioId ? selectedScenarioId : undefined;
    const splitResult = await electronAPI.calculateAutoSplit(incomeAmount, scenarioId);
    setResult(splitResult);
  };

  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Auto-Split Calculator</h2>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={useScenario}
                onChange={(e) => {
                  setUseScenario(e.target.checked);
                  if (e.target.checked && scenarios.length > 0) {
                    const firstScenario = scenarios[0];
                    setSelectedScenarioId(firstScenario.id!);
                    setIncomeAmount(firstScenario.monthlyIncome);
                  }
                }}
                style={{ marginRight: '0.5rem' }}
              />
              Use Income Scenario
            </label>
            {useScenario && scenarios.length > 0 && (
              <select
                value={selectedScenarioId || ''}
                onChange={(e) => {
                  const scenarioId = parseInt(e.target.value);
                  setSelectedScenarioId(scenarioId);
                  const scenario = scenarios.find(s => s.id === scenarioId);
                  if (scenario) {
                    setIncomeAmount(scenario.monthlyIncome);
                  }
                }}
                style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem', border: '1px solid #d1d1d6', borderRadius: '8px' }}
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (₹{s.monthlyIncome.toLocaleString()})
                  </option>
                ))}
              </select>
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

        {selectedScenario && useScenario && (
          <div style={{ 
            background: '#f5f5f7', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Scenario Details:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>Tax Rate: {selectedScenario.taxRate}%</div>
              <div>Fixed Expenses: ₹{selectedScenario.fixedExpenses.toLocaleString()}</div>
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
                        <div style={{ fontWeight: 600 }}>{allocation.goalName}</div>
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

