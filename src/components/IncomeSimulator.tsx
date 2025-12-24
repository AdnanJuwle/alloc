import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { IncomeScenario } from '../types';
import { electronAPI } from '../utils/electron-api';

export function IncomeSimulator() {
  const [scenarios, setScenarios] = useState<IncomeScenario[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingScenario, setEditingScenario] = useState<IncomeScenario | null>(null);
  const [formData, setFormData] = useState<Partial<IncomeScenario>>({
    name: '',
    monthlyIncome: 0,
    taxRate: 0,
    fixedExpenses: 0,
    scenarioType: 'expected',
  });

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    const data = await electronAPI.getIncomeScenarios();
    setScenarios(data.map(transformScenario));
  };

  const transformScenario = (scenario: any): IncomeScenario => ({
    id: scenario.id,
    name: scenario.name,
    monthlyIncome: scenario.monthly_income,
    taxRate: scenario.tax_rate,
    fixedExpenses: scenario.fixed_expenses,
    scenarioType: scenario.scenario_type,
    createdAt: scenario.created_at,
    updatedAt: scenario.updated_at,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const scenarioData = {
      name: formData.name!,
      monthlyIncome: parseFloat(formData.monthlyIncome as any),
      taxRate: parseFloat(formData.taxRate as any) || 0,
      fixedExpenses: parseFloat(formData.fixedExpenses as any) || 0,
      scenarioType: formData.scenarioType!,
    };

    if (editingScenario?.id) {
      await electronAPI.updateIncomeScenario(editingScenario.id, scenarioData);
    } else {
      await electronAPI.createIncomeScenario(scenarioData);
    }

    await loadScenarios();
    handleCloseModal();
  };

  const handleEdit = (scenario: IncomeScenario) => {
    setEditingScenario(scenario);
    setFormData({
      name: scenario.name,
      monthlyIncome: scenario.monthlyIncome,
      taxRate: scenario.taxRate,
      fixedExpenses: scenario.fixedExpenses,
      scenarioType: scenario.scenarioType,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this scenario?')) {
      await electronAPI.deleteIncomeScenario(id);
      await loadScenarios();
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingScenario(null);
    setFormData({
      name: '',
      monthlyIncome: 0,
      taxRate: 0,
      fixedExpenses: 0,
      scenarioType: 'expected',
    });
  };

  const calculateNetIncome = (scenario: IncomeScenario) => {
    const afterTax = scenario.monthlyIncome * (1 - scenario.taxRate / 100);
    return afterTax - scenario.fixedExpenses;
  };

  const getScenarioIcon = (type: string) => {
    switch (type) {
      case 'optimistic':
        return <TrendingUp size={20} style={{ color: '#34c759' }} />;
      case 'conservative':
        return <TrendingDown size={20} style={{ color: '#ff3b30' }} />;
      default:
        return <Minus size={20} style={{ color: '#007aff' }} />;
    }
  };

  const getScenarioColor = (type: string) => {
    switch (type) {
      case 'optimistic':
        return '#34c759';
      case 'conservative':
        return '#ff3b30';
      default:
        return '#007aff';
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Income Scenarios</h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} style={{ marginRight: '0.5rem' }} />
            Add Scenario
          </button>
        </div>

        {scenarios.length === 0 ? (
          <div className="empty-state">
            <h3>No income scenarios yet</h3>
            <p>Create scenarios to simulate different salary situations</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {scenarios.map((scenario) => {
              const netIncome = calculateNetIncome(scenario);
              const allocatableCash = Math.max(0, netIncome);
              
              return (
                <div
                  key={scenario.id}
                  style={{
                    border: '1px solid #e5e5ea',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    background: 'white',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        {getScenarioIcon(scenario.scenarioType)}
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                          {scenario.name}
                        </h3>
                        <span
                          style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            background: `${getScenarioColor(scenario.scenarioType)}20`,
                            color: getScenarioColor(scenario.scenarioType),
                          }}
                        >
                          {scenario.scenarioType}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleEdit(scenario)}
                        style={{ padding: '0.5rem' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(scenario.id!)}
                        style={{ padding: '0.5rem' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                    <div>
                      <div style={{ color: '#8e8e93', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Gross Income</div>
                      <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>₹{scenario.monthlyIncome.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ color: '#8e8e93', fontSize: '0.875rem', marginBottom: '0.25rem' }}>After Tax ({scenario.taxRate}%)</div>
                      <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                        ₹{(scenario.monthlyIncome * (1 - scenario.taxRate / 100)).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#8e8e93', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Fixed Expenses</div>
                      <div style={{ fontWeight: 600, fontSize: '1.125rem', color: '#ff3b30' }}>
                        -₹{scenario.fixedExpenses.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#8e8e93', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Allocatable Cash</div>
                      <div style={{ fontWeight: 600, fontSize: '1.125rem', color: allocatableCash > 0 ? '#34c759' : '#ff3b30' }}>
                        ₹{allocatableCash.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingScenario ? 'Edit Scenario' : 'Create Scenario'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Scenario Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Expected Salary, First Job"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Monthly Income (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.monthlyIncome}
                    onChange={(e) => setFormData({ ...formData, monthlyIncome: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.taxRate || 0}
                    onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Fixed Expenses (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.fixedExpenses || 0}
                  onChange={(e) => setFormData({ ...formData, fixedExpenses: parseFloat(e.target.value) || 0 })}
                  placeholder="Rent, utilities, subscriptions, etc."
                />
              </div>
              <div className="form-group">
                <label>Scenario Type</label>
                <select
                  value={formData.scenarioType}
                  onChange={(e) => setFormData({ ...formData, scenarioType: e.target.value as any })}
                >
                  <option value="conservative">Conservative</option>
                  <option value="expected">Expected</option>
                  <option value="optimistic">Optimistic</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingScenario ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

