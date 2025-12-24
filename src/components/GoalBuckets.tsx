import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Target, Calendar, TrendingUp } from 'lucide-react';
import { Goal } from '../types';
import { electronAPI } from '../utils/electron-api';

export function GoalBuckets() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState<Partial<Goal>>({
    name: '',
    targetAmount: 0,
    startDate: '',
    deadline: '',
    priorityWeight: 5,
    monthlyContribution: 0,
    currentAmount: 0,
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    const data = await electronAPI.getGoals();
    setGoals(data.map(transformGoal));
  };

  const transformGoal = (goal: any): Goal => ({
    id: goal.id,
    name: goal.name,
    targetAmount: goal.target_amount,
    startDate: goal.start_date || undefined,
    deadline: goal.deadline,
    priorityWeight: goal.priority_weight,
    monthlyContribution: goal.monthly_contribution,
    currentAmount: goal.current_amount || 0,
    createdAt: goal.created_at,
    updatedAt: goal.updated_at,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const goalData = {
      name: formData.name!,
      targetAmount: parseFloat(formData.targetAmount as any),
      startDate: formData.startDate || undefined,
      deadline: formData.deadline!,
      priorityWeight: formData.priorityWeight!,
      monthlyContribution: parseFloat(formData.monthlyContribution as any) || 0,
      currentAmount: parseFloat(formData.currentAmount as any) || 0,
    };

    if (editingGoal?.id) {
      await electronAPI.updateGoal(editingGoal.id, goalData);
    } else {
      await electronAPI.createGoal(goalData);
    }

    await loadGoals();
    handleCloseModal();
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount,
      startDate: goal.startDate || '',
      deadline: goal.deadline,
      priorityWeight: goal.priorityWeight,
      monthlyContribution: goal.monthlyContribution || 0,
      currentAmount: goal.currentAmount || 0,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      await electronAPI.deleteGoal(id);
      await loadGoals();
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGoal(null);
    setFormData({
      name: '',
      targetAmount: 0,
      startDate: '',
      deadline: '',
      priorityWeight: 5,
      monthlyContribution: 0,
      currentAmount: 0,
    });
  };

  const calculateProgress = (goal: Goal) => {
    return goal.currentAmount ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  };

  const getEffectiveStartDate = (goal: Goal): Date => {
    // If startDate is provided, use it; otherwise default to today
    if (goal.startDate) {
      return new Date(goal.startDate);
    }
    return new Date();
  };

  const hasStarted = (goal: Goal): boolean => {
    const startDate = getEffectiveStartDate(goal);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    return startDate.getTime() <= today.getTime();
  };

  const calculateMonthsRemaining = (goal: Goal) => {
    const deadlineDate = new Date(goal.deadline);
    const startDate = getEffectiveStartDate(goal);
    const diffTime = deadlineDate.getTime() - startDate.getTime();
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    return diffMonths > 0 ? diffMonths : 0;
  };

  const calculateMonthsUntilStart = (goal: Goal): number => {
    const startDate = getEffectiveStartDate(goal);
    const today = new Date();
    const diffTime = startDate.getTime() - today.getTime();
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    return diffMonths > 0 ? diffMonths : 0;
  };

  const calculateRequiredMonthly = (goal: Goal) => {
    // If goal hasn't started yet, return 0 (no monthly requirement until it starts)
    if (!hasStarted(goal)) {
      return 0;
    }
    const monthsRemaining = calculateMonthsRemaining(goal);
    const remaining = goal.targetAmount - (goal.currentAmount || 0);
    return monthsRemaining > 0 ? remaining / monthsRemaining : remaining;
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Goal Buckets</h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} style={{ marginRight: '0.5rem' }} />
            Add Goal
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="empty-state">
            <h3>No goals yet</h3>
            <p>Create your first goal bucket to start planning</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {goals.map((goal) => {
              const progress = calculateProgress(goal);
              const monthsRemaining = calculateMonthsRemaining(goal);
              const requiredMonthly = calculateRequiredMonthly(goal);
              const goalStarted = hasStarted(goal);
              const monthsUntilStart = calculateMonthsUntilStart(goal);
              
              return (
                <div
                  key={goal.id}
                  style={{
                    border: '1px solid #e5e5ea',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    background: 'white',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        {goal.name}
                      </h3>
                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: '#8e8e93', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Target size={14} />
                          <span>₹{goal.targetAmount.toLocaleString()}</span>
                        </div>
                        {goal.startDate && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={14} />
                            <span>Starts: {new Date(goal.startDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={14} />
                          <span>Deadline: {new Date(goal.deadline).toLocaleDateString()}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <TrendingUp size={14} />
                          <span>Priority: {goal.priorityWeight}/10</span>
                        </div>
                      </div>
                      {!goalStarted && goal.startDate && (
                        <div style={{ 
                          marginTop: '0.5rem', 
                          padding: '0.5rem', 
                          background: '#fff3cd', 
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          color: '#856404'
                        }}>
                          ⏳ Starts saving in {monthsUntilStart} {monthsUntilStart === 1 ? 'month' : 'months'}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleEdit(goal)}
                        style={{ padding: '0.5rem' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(goal.id!)}
                        style={{ padding: '0.5rem' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                      <span>Progress</span>
                      <span style={{ fontWeight: 600 }}>
                        ₹{(goal.currentAmount || 0).toLocaleString()} / ₹{goal.targetAmount.toLocaleString()} ({progress.toFixed(1)}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e5e5ea', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, progress)}%`,
                          height: '100%',
                          background: '#007aff',
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                    <div>
                      <div style={{ color: '#8e8e93', marginBottom: '0.25rem' }}>Current Contribution</div>
                      <div style={{ fontWeight: 600 }}>₹{goal.monthlyContribution?.toLocaleString() || 0}/month</div>
                    </div>
                    <div>
                      <div style={{ color: '#8e8e93', marginBottom: '0.25rem' }}>Required Monthly</div>
                      {goalStarted ? (
                        <div style={{ fontWeight: 600, color: requiredMonthly > (goal.monthlyContribution || 0) ? '#ff3b30' : '#34c759' }}>
                          ₹{requiredMonthly.toLocaleString()}/month
                        </div>
                      ) : (
                        <div style={{ fontWeight: 600, color: '#8e8e93' }}>
                          Not started yet
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ color: '#8e8e93', marginBottom: '0.25rem' }}>Savings Period</div>
                      <div style={{ fontWeight: 600 }}>{monthsRemaining} months</div>
                      {goal.startDate && (
                        <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
                          {goalStarted ? 'Started' : `Starts in ${monthsUntilStart} month${monthsUntilStart !== 1 ? 's' : ''}`}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ color: '#8e8e93', marginBottom: '0.25rem' }}>Current Saved</div>
                      <div style={{ fontWeight: 600 }}>₹{(goal.currentAmount || 0).toLocaleString()}</div>
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
              <h3>{editingGoal ? 'Edit Goal' : 'Create Goal'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Goal Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Emergency Fund, Laptop Upgrade"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Target Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>Deadline</label>
                  <input
                    type="date"
                    required
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Start Date (Optional)</label>
                <input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  placeholder="Leave empty to start saving from today"
                />
                <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
                  When do you want to start saving for this goal? Leave empty to start immediately.
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Priority Weight (1-10)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="10"
                    value={formData.priorityWeight}
                    onChange={(e) => setFormData({ ...formData, priorityWeight: parseInt(e.target.value) || 5 })}
                  />
                </div>
                <div className="form-group">
                  <label>Monthly Contribution (₹) - Optional</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.monthlyContribution || 0}
                    onChange={(e) => setFormData({ ...formData, monthlyContribution: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Current Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.currentAmount || 0}
                  onChange={(e) => setFormData({ ...formData, currentAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingGoal ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

