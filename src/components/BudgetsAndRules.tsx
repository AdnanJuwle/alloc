import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, DollarSign, Settings, AlertCircle } from 'lucide-react';
import { Budget, Category, SpendingAlert, AllocationRule } from '../types';
import { electronAPI } from '../utils/electron-api';

type ViewMode = 'budgets' | 'rules';

export function BudgetsAndRules() {
  const [viewMode, setViewMode] = useState<ViewMode>('budgets');
  
  // Budgets state
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [alerts, setAlerts] = useState<SpendingAlert[]>([]);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [budgetFormData, setBudgetFormData] = useState<Partial<Budget>>({
    categoryId: undefined,
    monthlyLimit: 0,
    warningThreshold: 80,
    isHardLimit: false,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  // Rules state
  const [rules, setRules] = useState<AllocationRule[]>([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AllocationRule | null>(null);
  const [ruleFormData, setRuleFormData] = useState<Partial<AllocationRule>>({
    name: '',
    condition: 'income_increase',
    conditionValue: undefined,
    action: 'raise_savings',
    actionValue: undefined,
    targetCategoryId: undefined,
    isActive: true,
  });

  useEffect(() => {
    loadCategories();
    if (viewMode === 'budgets') {
      loadBudgets();
      loadAlerts();
    } else {
      loadRules();
    }
  }, [viewMode, selectedYear, selectedMonth]);

  const loadCategories = async () => {
    const data = await electronAPI.getCategories();
    setCategories(data.map((c: any) => ({
      id: c.id,
      name: c.name,
      icon: c.icon || undefined,
      color: c.color || undefined,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })));
  };

  const loadBudgets = async () => {
    const data = await electronAPI.getBudgets(selectedYear, selectedMonth);
    setBudgets(data.map((b: any) => ({
      id: b.id,
      categoryId: b.category_id,
      monthlyLimit: b.monthly_limit,
      warningThreshold: b.warning_threshold,
      isHardLimit: b.is_hard_limit,
      year: b.year,
      month: b.month,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    })));
  };

  const loadAlerts = async () => {
    const data = await electronAPI.getSpendingAlerts(selectedYear, selectedMonth);
    setAlerts(data);
  };

  const loadRules = async () => {
    const data = await electronAPI.getAllocationRules();
    setRules(data.map((r: any) => ({
      id: r.id,
      name: r.name,
      condition: r.condition,
      conditionValue: r.condition_value || undefined,
      action: r.action,
      actionValue: r.action_value || undefined,
      targetCategoryId: r.target_category_id || undefined,
      isActive: r.is_active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })));
  };

  // Budget handlers
  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const budgetData = {
      categoryId: budgetFormData.categoryId!,
      monthlyLimit: parseFloat(budgetFormData.monthlyLimit as any),
      warningThreshold: parseFloat(budgetFormData.warningThreshold as any) || 80,
      isHardLimit: budgetFormData.isHardLimit || false,
      year: selectedYear,
      month: selectedMonth,
    };

    if (editingBudget?.id) {
      await electronAPI.updateBudget(editingBudget.id, budgetData);
    } else {
      await electronAPI.createBudget(budgetData);
    }

    await loadBudgets();
    await loadAlerts();
    handleCloseBudgetModal();
  };

  const handleBudgetEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setBudgetFormData({
      categoryId: budget.categoryId,
      monthlyLimit: budget.monthlyLimit,
      warningThreshold: budget.warningThreshold || 80,
      isHardLimit: budget.isHardLimit,
      year: budget.year,
      month: budget.month,
    });
    setShowBudgetModal(true);
  };

  const handleBudgetDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this budget?')) {
      await electronAPI.deleteBudget(id);
      await loadBudgets();
      await loadAlerts();
    }
  };

  const handleCloseBudgetModal = () => {
    setShowBudgetModal(false);
    setEditingBudget(null);
    setBudgetFormData({
      categoryId: undefined,
      monthlyLimit: 0,
      warningThreshold: 80,
      isHardLimit: false,
      year: selectedYear,
      month: selectedMonth,
    });
  };

  // Rule handlers
  const handleRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const ruleData = {
      name: ruleFormData.name!,
      condition: ruleFormData.condition!,
      conditionValue: ruleFormData.conditionValue || undefined,
      action: ruleFormData.action!,
      actionValue: ruleFormData.actionValue || undefined,
      targetCategoryId: ruleFormData.targetCategoryId || undefined,
      isActive: ruleFormData.isActive !== false,
    };

    if (editingRule?.id) {
      await electronAPI.updateAllocationRule(editingRule.id, ruleData);
    } else {
      await electronAPI.createAllocationRule(ruleData);
    }

    await loadRules();
    handleCloseRuleModal();
  };

  const handleRuleEdit = (rule: AllocationRule) => {
    setEditingRule(rule);
    setRuleFormData({
      name: rule.name,
      condition: rule.condition,
      conditionValue: rule.conditionValue,
      action: rule.action,
      actionValue: rule.actionValue,
      targetCategoryId: rule.targetCategoryId,
      isActive: rule.isActive,
    });
    setShowRuleModal(true);
  };

  const handleRuleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      await electronAPI.deleteAllocationRule(id);
      await loadRules();
    }
  };

  const handleCloseRuleModal = () => {
    setShowRuleModal(false);
    setEditingRule(null);
    setRuleFormData({
      name: '',
      condition: 'income_increase',
      conditionValue: undefined,
      action: 'raise_savings',
      actionValue: undefined,
      targetCategoryId: undefined,
      isActive: true,
    });
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const getAlertColor = (alertType: string) => {
    switch (alertType) {
      case 'overspent':
        return '#ff3b30';
      case 'limit_reached':
        return '#ff9500';
      case 'warning':
        return '#ffcc00';
      default:
        return '#8e8e93';
    }
  };

  const getConditionLabel = (condition: string) => {
    const labels: Record<string, string> = {
      income_increase: 'Income Increases',
      income_decrease: 'Income Decreases',
      rent_threshold: 'Rent &gt; X% of Income',
      savings_rate: 'Savings Rate &lt; X%',
    };
    return labels[condition] || condition;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      raise_savings: 'Raise Savings by X%',
      adjust_category: 'Adjust Category Budget',
      flag_risk: 'Flag as Risk',
    };
    return labels[action] || action;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div>
      {/* View Mode Toggle */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem' }}>
          <button
            className={viewMode === 'budgets' ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setViewMode('budgets')}
            style={{ flex: 1, padding: '0.75rem' }}
          >
            Budgets
          </button>
          <button
            className={viewMode === 'rules' ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setViewMode('rules')}
            style={{ flex: 1, padding: '0.75rem' }}
          >
            Rules
          </button>
        </div>
      </div>

      {/* Budgets View */}
      {viewMode === 'budgets' && (
        <div>
          <div className="card">
            <div className="card-header">
              <h2>Budgets</h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e5e5ea' }}
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e5e5ea' }}
                >
                  {monthNames.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>{name}</option>
                  ))}
                </select>
                <button className="btn btn-primary" onClick={() => setShowBudgetModal(true)}>
                  <Plus size={16} style={{ marginRight: '0.5rem' }} />
                  Create Budget
                </button>
              </div>
            </div>

            {alerts.length > 0 && (
              <div style={{ marginBottom: '1.5rem', padding: '0 1.5rem' }}>
                <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem', fontWeight: 600 }}>Spending Alerts</h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: `2px solid ${getAlertColor(alert.alertType)}`,
                        borderRadius: '8px',
                        padding: '1rem',
                        background: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                        <AlertTriangle size={20} style={{ color: getAlertColor(alert.alertType) }} />
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                            {alert.categoryName}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>
                            {alert.alertType === 'overspent' && 'Overspent by ₹' + (alert.currentSpending - alert.budgetLimit).toLocaleString()}
                            {alert.alertType === 'limit_reached' && 'Limit reached'}
                            {alert.alertType === 'warning' && `${alert.percentageUsed.toFixed(1)}% of budget used`}
                            {alert.daysRemaining > 0 && ` • ${alert.daysRemaining} days remaining`}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, fontSize: '1.125rem', color: getAlertColor(alert.alertType) }}>
                          ₹{alert.currentSpending.toLocaleString()} / ₹{alert.budgetLimit.toLocaleString()}
                        </div>
                        {alert.isHardLimit && (
                          <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
                            Hard Limit
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {budgets.length === 0 ? (
              <div className="empty-state">
                <h3>No budgets for {monthNames[selectedMonth - 1]} {selectedYear}</h3>
                <p>Create a budget to track spending limits for categories</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {budgets.map((budget) => {
                  const alert = alerts.find(a => a.categoryId === budget.categoryId);
                  const percentageUsed = alert ? alert.percentageUsed : 0;
                  
                  return (
                    <div
                      key={budget.id}
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
                            <DollarSign size={16} style={{ color: '#007aff' }} />
                            <div style={{ fontWeight: 600 }}>{getCategoryName(budget.categoryId)}</div>
                            {budget.isHardLimit && (
                              <span style={{ 
                                fontSize: '0.75rem', 
                                padding: '0.25rem 0.5rem', 
                                background: '#ff3b30', 
                                color: 'white', 
                                borderRadius: '4px' 
                              }}>
                                Hard Limit
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>
                            Limit: ₹{budget.monthlyLimit.toLocaleString()} • Warning at {budget.warningThreshold}%
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleBudgetEdit(budget)}
                            style={{ padding: '0.5rem' }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => budget.id && handleBudgetDelete(budget.id)}
                            style={{ padding: '0.5rem' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      {alert && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                            <span>Spent: ₹{alert.currentSpending.toLocaleString()}</span>
                            <span style={{ fontWeight: 600 }}>{percentageUsed.toFixed(1)}%</span>
                          </div>
                          <div style={{
                            width: '100%',
                            height: '8px',
                            background: '#e5e5ea',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${Math.min(percentageUsed, 100)}%`,
                              height: '100%',
                              background: percentageUsed >= 100 ? '#ff3b30' : percentageUsed >= budget.warningThreshold! ? '#ff9500' : '#34c759',
                              transition: 'width 0.3s ease',
                            }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Budget Modal */}
          {showBudgetModal && (
            <div className="modal-overlay" onClick={handleCloseBudgetModal}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>{editingBudget ? 'Edit Budget' : 'Create Budget'}</h3>
                  <button className="close-btn" onClick={handleCloseBudgetModal}>×</button>
                </div>
                <form onSubmit={handleBudgetSubmit}>
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={budgetFormData.categoryId || ''}
                      onChange={(e) => setBudgetFormData({ ...budgetFormData, categoryId: e.target.value ? parseInt(e.target.value) : undefined })}
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Monthly Limit (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={budgetFormData.monthlyLimit}
                      onChange={(e) => setBudgetFormData({ ...budgetFormData, monthlyLimit: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Warning Threshold (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={budgetFormData.warningThreshold}
                      onChange={(e) => setBudgetFormData({ ...budgetFormData, warningThreshold: parseFloat(e.target.value) || 80 })}
                    />
                    <small style={{ color: '#8e8e93', fontSize: '0.75rem' }}>
                      Show warning when spending reaches this percentage of limit
                    </small>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={budgetFormData.isHardLimit}
                        onChange={(e) => setBudgetFormData({ ...budgetFormData, isHardLimit: e.target.checked })}
                      />
                      Hard Limit (strict enforcement)
                    </label>
                    <small style={{ color: '#8e8e93', fontSize: '0.75rem' }}>
                      If enabled, treat this as a strict limit that should not be exceeded
                    </small>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={handleCloseBudgetModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingBudget ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rules View */}
      {viewMode === 'rules' && (
        <div>
          <div className="card">
            <div className="card-header">
              <h2>Allocation Rules</h2>
              <button className="btn btn-primary" onClick={() => setShowRuleModal(true)}>
                <Plus size={16} style={{ marginRight: '0.5rem' }} />
                Create Rule
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '0 1.5rem' }}>
              <div style={{ padding: '1rem', background: '#f5f5f7', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                  <AlertCircle size={20} style={{ color: '#007aff', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>How Rules Work</div>
                    <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>
                      Rules automatically adjust your financial plan based on conditions. For example:
                      "If income increases by 20%, raise savings by 10%" or "If rent exceeds 30% of income, flag as risk."
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {rules.length === 0 ? (
              <div className="empty-state">
                <h3>No rules configured</h3>
                <p>Create rules to automate your financial planning based on conditions</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    style={{
                      border: '1px solid #e5e5ea',
                      borderRadius: '8px',
                      padding: '1rem',
                      background: 'white',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Settings size={16} style={{ color: '#007aff' }} />
                        <div style={{ fontWeight: 600 }}>{rule.name}</div>
                        {!rule.isActive && (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.25rem 0.5rem', 
                            background: '#8e8e93', 
                            color: 'white', 
                            borderRadius: '4px' 
                          }}>
                            Inactive
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#8e8e93', marginBottom: '0.25rem' }}>
                        <strong>If:</strong> {getConditionLabel(rule.condition)}
                        {rule.conditionValue !== undefined && ` (${rule.conditionValue}${rule.condition === 'rent_threshold' || rule.condition === 'savings_rate' ? '%' : '%'})`}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>
                        <strong>Then:</strong> {getActionLabel(rule.action)}
                        {rule.actionValue !== undefined && ` (${rule.actionValue}${rule.action === 'raise_savings' || rule.action === 'adjust_category' ? '%' : ''})`}
                        {rule.targetCategoryId && ` for ${getCategoryName(rule.targetCategoryId)}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleRuleEdit(rule)}
                        style={{ padding: '0.5rem' }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => rule.id && handleRuleDelete(rule.id)}
                        style={{ padding: '0.5rem' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rule Modal */}
          {showRuleModal && (
            <div className="modal-overlay" onClick={handleCloseRuleModal}>
              <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                  <h3>{editingRule ? 'Edit Rule' : 'Create Rule'}</h3>
                  <button className="close-btn" onClick={handleCloseRuleModal}>×</button>
                </div>
                <form onSubmit={handleRuleSubmit}>
                  <div className="form-group">
                    <label>Rule Name</label>
                    <input
                      type="text"
                      required
                      value={ruleFormData.name}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                      placeholder="e.g., Auto-increase savings on income raise"
                    />
                  </div>

                  <div className="form-group">
                    <label>Condition</label>
                    <select
                      value={ruleFormData.condition}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, condition: e.target.value as any })}
                      required
                    >
                      <option value="income_increase">Income Increases</option>
                      <option value="income_decrease">Income Decreases</option>
                      <option value="rent_threshold">Rent &gt; X% of Income</option>
                      <option value="savings_rate">Savings Rate &lt; X%</option>
                    </select>
                  </div>

                  {(ruleFormData.condition === 'income_increase' || ruleFormData.condition === 'income_decrease' || 
                    ruleFormData.condition === 'rent_threshold' || ruleFormData.condition === 'savings_rate') && (
                    <div className="form-group">
                      <label>Condition Value</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={ruleFormData.conditionValue || ''}
                        onChange={(e) => setRuleFormData({ ...ruleFormData, conditionValue: parseFloat(e.target.value) || undefined })}
                        placeholder={ruleFormData.condition === 'rent_threshold' || ruleFormData.condition === 'savings_rate' ? 'Percentage (e.g., 30)' : 'Percentage increase/decrease (e.g., 20)'}
                      />
                      <small style={{ color: '#8e8e93', fontSize: '0.75rem' }}>
                        {ruleFormData.condition === 'rent_threshold' || ruleFormData.condition === 'savings_rate' 
                          ? 'Threshold percentage' 
                          : 'Percentage change to trigger rule'}
                      </small>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Action</label>
                    <select
                      value={ruleFormData.action}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, action: e.target.value as any })}
                      required
                    >
                      <option value="raise_savings">Raise Savings by X%</option>
                      <option value="adjust_category">Adjust Category Budget</option>
                      <option value="flag_risk">Flag as Risk</option>
                    </select>
                  </div>

                  {(ruleFormData.action === 'raise_savings' || ruleFormData.action === 'adjust_category') && (
                    <div className="form-group">
                      <label>Action Value</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={ruleFormData.actionValue || ''}
                        onChange={(e) => setRuleFormData({ ...ruleFormData, actionValue: parseFloat(e.target.value) || undefined })}
                        placeholder="Percentage or amount"
                      />
                      <small style={{ color: '#8e8e93', fontSize: '0.75rem' }}>
                        {ruleFormData.action === 'raise_savings' 
                          ? 'Percentage to increase savings by' 
                          : 'Percentage or amount to adjust budget'}
                      </small>
                    </div>
                  )}

                  {ruleFormData.action === 'adjust_category' && (
                    <div className="form-group">
                      <label>Target Category</label>
                      <select
                        value={ruleFormData.targetCategoryId || ''}
                        onChange={(e) => setRuleFormData({ ...ruleFormData, targetCategoryId: e.target.value ? parseInt(e.target.value) : undefined })}
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={ruleFormData.isActive}
                        onChange={(e) => setRuleFormData({ ...ruleFormData, isActive: e.target.checked })}
                      />
                      Active (rule will be evaluated)
                    </label>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={handleCloseRuleModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingRule ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

