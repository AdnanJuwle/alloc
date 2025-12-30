import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, DollarSign } from 'lucide-react';
import { Budget, Category, SpendingAlert } from '../types';
import { electronAPI } from '../utils/electron-api';

export function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [alerts, setAlerts] = useState<SpendingAlert[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [formData, setFormData] = useState<Partial<Budget>>({
    categoryId: undefined,
    monthlyLimit: 0,
    warningThreshold: 80,
    isHardLimit: false,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  useEffect(() => {
    loadCategories();
    loadBudgets();
    loadAlerts();
  }, [selectedYear, selectedMonth]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const budgetData = {
      categoryId: formData.categoryId!,
      monthlyLimit: parseFloat(formData.monthlyLimit as any),
      warningThreshold: parseFloat(formData.warningThreshold as any) || 80,
      isHardLimit: formData.isHardLimit || false,
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
    handleCloseModal();
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      categoryId: budget.categoryId,
      monthlyLimit: budget.monthlyLimit,
      warningThreshold: budget.warningThreshold || 80,
      isHardLimit: budget.isHardLimit,
      year: budget.year,
      month: budget.month,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this budget?')) {
      await electronAPI.deleteBudget(id);
      await loadBudgets();
      await loadAlerts();
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBudget(null);
    setFormData({
      categoryId: undefined,
      monthlyLimit: 0,
      warningThreshold: 80,
      isHardLimit: false,
      year: selectedYear,
      month: selectedMonth,
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

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
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
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} style={{ marginRight: '0.5rem' }} />
              Create Budget
            </button>
          </div>
        </div>

        {alerts.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
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
                        onClick={() => handleEdit(budget)}
                        style={{ padding: '0.5rem' }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => budget.id && handleDelete(budget.id)}
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

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingBudget ? 'Edit Budget' : 'Create Budget'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.categoryId || ''}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value ? parseInt(e.target.value) : undefined })}
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
                  value={formData.monthlyLimit}
                  onChange={(e) => setFormData({ ...formData, monthlyLimit: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label>Warning Threshold (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.warningThreshold}
                  onChange={(e) => setFormData({ ...formData, warningThreshold: parseFloat(e.target.value) || 80 })}
                />
                <small style={{ color: '#8e8e93', fontSize: '0.75rem' }}>
                  Show warning when spending reaches this percentage of limit
                </small>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.isHardLimit}
                    onChange={(e) => setFormData({ ...formData, isHardLimit: e.target.checked })}
                  />
                  Hard Limit (strict enforcement)
                </label>
                <small style={{ color: '#8e8e93', fontSize: '0.75rem' }}>
                  If enabled, treat this as a strict limit that should not be exceeded
                </small>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
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
  );
}


