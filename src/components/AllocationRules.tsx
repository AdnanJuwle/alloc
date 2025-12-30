import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Settings, AlertCircle } from 'lucide-react';
import { AllocationRule } from '../types';
import { electronAPI } from '../utils/electron-api';

export function AllocationRules() {
  const [rules, setRules] = useState<AllocationRule[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AllocationRule | null>(null);
  const [formData, setFormData] = useState<Partial<AllocationRule>>({
    name: '',
    condition: 'income_increase',
    conditionValue: undefined,
    action: 'raise_savings',
    actionValue: undefined,
    targetCategoryId: undefined,
    isActive: true,
  });

  useEffect(() => {
    loadRules();
    loadCategories();
  }, []);

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

  const loadCategories = async () => {
    const data = await electronAPI.getCategories();
    setCategories(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const ruleData = {
      name: formData.name!,
      condition: formData.condition!,
      conditionValue: formData.conditionValue || undefined,
      action: formData.action!,
      actionValue: formData.actionValue || undefined,
      targetCategoryId: formData.targetCategoryId || undefined,
      isActive: formData.isActive !== false,
    };

    if (editingRule?.id) {
      await electronAPI.updateAllocationRule(editingRule.id, ruleData);
    } else {
      await electronAPI.createAllocationRule(ruleData);
    }

    await loadRules();
    handleCloseModal();
  };

  const handleEdit = (rule: AllocationRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      condition: rule.condition,
      conditionValue: rule.conditionValue,
      action: rule.action,
      actionValue: rule.actionValue,
      targetCategoryId: rule.targetCategoryId,
      isActive: rule.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      await electronAPI.deleteAllocationRule(id);
      await loadRules();
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRule(null);
    setFormData({
      name: '',
      condition: 'income_increase',
      conditionValue: undefined,
      action: 'raise_savings',
      actionValue: undefined,
      targetCategoryId: undefined,
      isActive: true,
    });
  };

  const getConditionLabel = (condition: string) => {
    const labels: Record<string, string> = {
      income_increase: 'Income Increases',
      income_decrease: 'Income Decreases',
      rent_threshold: 'Rent > X% of Income',
      savings_rate: 'Savings Rate < X%',
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

  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return 'N/A';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Allocation Rules</h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} style={{ marginRight: '0.5rem' }} />
            Create Rule
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f5f5f7', borderRadius: '8px' }}>
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
                    onClick={() => handleEdit(rule)}
                    style={{ padding: '0.5rem' }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => rule.id && handleDelete(rule.id)}
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

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editingRule ? 'Edit Rule' : 'Create Rule'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Rule Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Auto-increase savings on income raise"
                />
              </div>

              <div className="form-group">
                <label>Condition</label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                  required
                >
                  <option value="income_increase">Income Increases</option>
                  <option value="income_decrease">Income Decreases</option>
                  <option value="rent_threshold">Rent &gt; X% of Income</option>
                  <option value="savings_rate">Savings Rate &lt; X%</option>
                </select>
              </div>

              {(formData.condition === 'income_increase' || formData.condition === 'income_decrease' || 
                formData.condition === 'rent_threshold' || formData.condition === 'savings_rate') && (
                <div className="form-group">
                  <label>Condition Value</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.conditionValue || ''}
                    onChange={(e) => setFormData({ ...formData, conditionValue: parseFloat(e.target.value) || undefined })}
                    placeholder={formData.condition === 'rent_threshold' || formData.condition === 'savings_rate' ? 'Percentage (e.g., 30)' : 'Percentage increase/decrease (e.g., 20)'}
                  />
                  <small style={{ color: '#8e8e93', fontSize: '0.75rem' }}>
                    {formData.condition === 'rent_threshold' || formData.condition === 'savings_rate' 
                      ? 'Threshold percentage' 
                      : 'Percentage change to trigger rule'}
                  </small>
                </div>
              )}

              <div className="form-group">
                <label>Action</label>
                <select
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value as any })}
                  required
                >
                  <option value="raise_savings">Raise Savings by X%</option>
                  <option value="adjust_category">Adjust Category Budget</option>
                  <option value="flag_risk">Flag as Risk</option>
                </select>
              </div>

              {(formData.action === 'raise_savings' || formData.action === 'adjust_category') && (
                <div className="form-group">
                  <label>Action Value</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.actionValue || ''}
                    onChange={(e) => setFormData({ ...formData, actionValue: parseFloat(e.target.value) || undefined })}
                    placeholder="Percentage or amount"
                  />
                  <small style={{ color: '#8e8e93', fontSize: '0.75rem' }}>
                    {formData.action === 'raise_savings' 
                      ? 'Percentage to increase savings by' 
                      : 'Percentage or amount to adjust budget'}
                  </small>
                </div>
              )}

              {formData.action === 'adjust_category' && (
                <div className="form-group">
                  <label>Target Category</label>
                  <select
                    value={formData.targetCategoryId || ''}
                    onChange={(e) => setFormData({ ...formData, targetCategoryId: e.target.value ? parseInt(e.target.value) : undefined })}
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
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  Active (rule will be evaluated)
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
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
  );
}

