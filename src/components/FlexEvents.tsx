import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertCircle, Calendar, DollarSign } from 'lucide-react';
import { FlexEvent, Goal, RebalancingPlan } from '../types';
import { electronAPI } from '../utils/electron-api';

export function FlexEvents() {
  const [flexEvents, setFlexEvents] = useState<FlexEvent[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FlexEvent | null>(null);
  const [formData, setFormData] = useState<Partial<FlexEvent>>({
    date: new Date().toISOString().split('T')[0],
    reason: '',
    amount: 0,
    affectedGoals: [],
    rebalancingPlan: {
      pausedGoals: [],
      adjustedAllocations: [],
    },
    acknowledged: false,
  });

  useEffect(() => {
    loadFlexEvents();
    loadGoals();
  }, []);

  const loadFlexEvents = async () => {
    const data = await electronAPI.getFlexEvents();
    setFlexEvents(data.map((fe: any) => ({
      id: fe.id,
      date: fe.date,
      reason: fe.reason,
      amount: fe.amount,
      affectedGoals: fe.affected_goals || [],
      rebalancingPlan: typeof fe.rebalancing_plan === 'string' 
        ? JSON.parse(fe.rebalancing_plan) 
        : fe.rebalancing_plan,
      acknowledged: fe.acknowledged,
      createdAt: fe.created_at,
      updatedAt: fe.updated_at,
    })));
  };

  const loadGoals = async () => {
    const data = await electronAPI.getGoals();
    setGoals(data.map((g: any) => ({
      id: g.id,
      name: g.name,
      targetAmount: g.target_amount,
      startDate: g.start_date || undefined,
      deadline: g.deadline,
      priorityWeight: g.priority_weight,
      monthlyContribution: g.monthly_contribution,
      currentAmount: g.current_amount || 0,
      isEmergencyFund: g.is_emergency_fund || false,
    })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const flexEventData = {
      date: formData.date!,
      reason: formData.reason!,
      amount: parseFloat(formData.amount as any),
      affectedGoals: formData.affectedGoals || [],
      rebalancingPlan: formData.rebalancingPlan!,
      acknowledged: formData.acknowledged || false,
    };

    if (editingEvent?.id) {
      await electronAPI.updateFlexEvent(editingEvent.id, flexEventData);
    } else {
      await electronAPI.createFlexEvent(flexEventData);
    }

    await loadFlexEvents();
    handleCloseModal();
  };

  const handleEdit = (event: FlexEvent) => {
    setEditingEvent(event);
    setFormData({
      date: event.date.split('T')[0],
      reason: event.reason,
      amount: event.amount,
      affectedGoals: event.affectedGoals,
      rebalancingPlan: event.rebalancingPlan,
      acknowledged: event.acknowledged,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this flex event?')) {
      await electronAPI.deleteFlexEvent(id);
      await loadFlexEvents();
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEvent(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      reason: '',
      amount: 0,
      affectedGoals: [],
      rebalancingPlan: {
        pausedGoals: [],
        adjustedAllocations: [],
      },
      acknowledged: false,
    });
  };

  const getGoalName = (goalId: number) => {
    const goal = goals.find(g => g.id === goalId);
    return goal?.name || 'Unknown';
  };

  const toggleGoalSelection = (goalId: number) => {
    const current = formData.affectedGoals || [];
    if (current.includes(goalId)) {
      setFormData({ ...formData, affectedGoals: current.filter(id => id !== goalId) });
    } else {
      setFormData({ ...formData, affectedGoals: [...current, goalId] });
    }
  };

  const togglePausedGoal = (goalId: number) => {
    const current = formData.rebalancingPlan?.pausedGoals || [];
    if (current.includes(goalId)) {
      setFormData({
        ...formData,
        rebalancingPlan: {
          ...formData.rebalancingPlan!,
          pausedGoals: current.filter(id => id !== goalId),
        },
      });
    } else {
      setFormData({
        ...formData,
        rebalancingPlan: {
          ...formData.rebalancingPlan!,
          pausedGoals: [...current, goalId],
        },
      });
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Flex Events</h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} style={{ marginRight: '0.5rem' }} />
            Create Flex Event
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem', padding: '0 1.5rem' }}>
          <div style={{ padding: '1rem', background: '#f5f5f7', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
              <AlertCircle size={20} style={{ color: '#007aff', marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>What are Flex Events?</div>
                <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>
                  Flex events handle one-time exceptions (medical emergencies, festivals, unexpected expenses).
                  The system will automatically rebalance your goals by pausing lower-priority goals temporarily.
                </div>
              </div>
            </div>
          </div>
        </div>

        {flexEvents.length === 0 ? (
          <div className="empty-state">
            <h3>No flex events</h3>
            <p>Create a flex event to handle unexpected expenses and rebalance your goals</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {flexEvents.map((event) => (
              <div
                key={event.id}
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
                      <div style={{ fontWeight: 600 }}>{event.reason}</div>
                      {event.acknowledged && (
                        <span style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.25rem 0.5rem', 
                          background: '#34c759', 
                          color: 'white', 
                          borderRadius: '4px' 
                        }}>
                          Acknowledged
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#8e8e93', marginBottom: '0.25rem' }}>
                      <Calendar size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      {new Date(event.date).toLocaleDateString()} • Amount: ₹{event.amount.toLocaleString()}
                    </div>
                    {event.rebalancingPlan.pausedGoals.length > 0 && (
                      <div style={{ fontSize: '0.875rem', color: '#8e8e93', marginTop: '0.5rem' }}>
                        Paused Goals: {event.rebalancingPlan.pausedGoals.map(id => getGoalName(id)).join(', ')}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => event.id && handleEdit(event)}
                      style={{ padding: '0.5rem' }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => event.id && handleDelete(event.id)}
                      style={{ padding: '0.5rem' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>{editingEvent ? 'Edit Flex Event' : 'Create Flex Event'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Reason</label>
                <input
                  type="text"
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="e.g., Medical emergency, Festival expenses"
                />
              </div>

              <div className="form-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label>Affected Goals (select goals that will be impacted)</label>
                <div style={{ 
                  border: '1px solid #e5e5ea', 
                  borderRadius: '6px', 
                  padding: '0.75rem', 
                  maxHeight: '150px', 
                  overflowY: 'auto' 
                }}>
                  {goals.map((goal) => (
                    <label key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={(formData.affectedGoals || []).includes(goal.id!)}
                        onChange={() => toggleGoalSelection(goal.id!)}
                      />
                      <span>{goal.name} (Priority: {goal.priorityWeight})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Goals to Pause (lower priority goals to pause temporarily)</label>
                <div style={{ 
                  border: '1px solid #e5e5ea', 
                  borderRadius: '6px', 
                  padding: '0.75rem', 
                  maxHeight: '150px', 
                  overflowY: 'auto' 
                }}>
                  {goals
                    .filter(g => (formData.affectedGoals || []).includes(g.id!))
                    .map((goal) => (
                      <label key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={(formData.rebalancingPlan?.pausedGoals || []).includes(goal.id!)}
                          onChange={() => togglePausedGoal(goal.id!)}
                        />
                        <span>{goal.name}</span>
                      </label>
                    ))}
                  {(!formData.affectedGoals || formData.affectedGoals.length === 0) && (
                    <div style={{ color: '#8e8e93', fontSize: '0.875rem' }}>
                      Select affected goals first
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.acknowledged}
                    onChange={(e) => setFormData({ ...formData, acknowledged: e.target.checked })}
                  />
                  Acknowledged
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingEvent ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

