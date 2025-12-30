import { useState, useEffect } from 'react';
import { Plus, DollarSign, TrendingUp, TrendingDown, AlertCircle, Calendar, Edit2, Trash2 } from 'lucide-react';
import { Goal, Transaction, FlexEvent } from '../types';
import { electronAPI } from '../utils/electron-api';

type ViewMode = 'transactions' | 'flex-events';

export function Transactions() {
  const [viewMode, setViewMode] = useState<ViewMode>('transactions');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [flexEvents, setFlexEvents] = useState<FlexEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showFlexEventModal, setShowFlexEventModal] = useState(false);
  const [editingFlexEvent, setEditingFlexEvent] = useState<FlexEvent | null>(null);
  const [formData, setFormData] = useState<Partial<Transaction>>({
    goalId: undefined,
    categoryId: undefined,
    amount: 0,
    transactionType: 'allocation',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [flexEventFormData, setFlexEventFormData] = useState<Partial<FlexEvent>>({
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
    loadGoals();
    loadCategories();
    loadTransactions();
    loadFlexEvents();
  }, []);

  // Listen for data updates from AI actions
  useEffect(() => {
    const handleDataUpdate = () => {
      console.log('Transactions: Received data-updated event, refreshing...');
      loadTransactions();
      loadFlexEvents();
      loadGoals();
      loadCategories();
    };
    
    window.addEventListener('data-updated', handleDataUpdate);
    return () => window.removeEventListener('data-updated', handleDataUpdate);
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

  const loadCategories = async () => {
    const data = await electronAPI.getCategories();
    setCategories(data);
  };

  const loadTransactions = async () => {
    try {
      const data = await electronAPI.getTransactions();
      console.log('Loaded transactions:', data.length);
      setTransactions(data.map(transformTransaction));
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const transformTransaction = (tx: any): Transaction => ({
    id: tx.id,
    goalId: tx.goal_id || undefined,
    categoryId: tx.category_id || undefined,
    amount: tx.amount,
    transactionType: tx.transaction_type,
    description: tx.description || undefined,
    date: tx.date,
    deviationType: tx.deviation_type || undefined,
    plannedAmount: tx.planned_amount || undefined,
    actualAmount: tx.actual_amount || undefined,
    acknowledged: tx.acknowledged || false,
    acknowledgedAt: tx.acknowledged_at || undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const transactionData = {
      goalId: formData.goalId || undefined,
      categoryId: formData.categoryId || undefined,
      amount: parseFloat(formData.amount as any),
      transactionType: formData.transactionType!,
      description: formData.description || undefined,
      date: formData.date || new Date().toISOString(),
    };

    await electronAPI.createTransaction(transactionData);
    
    // Update goal's current amount if it's an allocation
    if (transactionData.goalId && transactionData.transactionType === 'allocation') {
      const goal = goals.find(g => g.id === transactionData.goalId);
      if (goal) {
        const newAmount = (goal.currentAmount || 0) + transactionData.amount;
        await electronAPI.updateGoal(transactionData.goalId, {
          ...goal,
          currentAmount: newAmount,
        });
        await loadGoals();
      }
    }

    await loadTransactions();
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      goalId: undefined,
      categoryId: undefined,
      amount: 0,
      transactionType: 'allocation',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const getGoalName = (goalId?: number) => {
    if (!goalId) return 'N/A';
    const goal = goals.find(g => g.id === goalId);
    return goal?.name || 'Unknown';
  };

  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return 'N/A';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <TrendingUp size={16} style={{ color: '#34c759' }} />;
      case 'expense':
        return <TrendingDown size={16} style={{ color: '#ff3b30' }} />;
      default:
        return <DollarSign size={16} style={{ color: '#007aff' }} />;
    }
  };

  const handleFlexEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const flexEventData = {
      date: flexEventFormData.date!,
      reason: flexEventFormData.reason!,
      amount: parseFloat(flexEventFormData.amount as any),
      affectedGoals: flexEventFormData.affectedGoals || [],
      rebalancingPlan: flexEventFormData.rebalancingPlan!,
      acknowledged: flexEventFormData.acknowledged || false,
    };

    if (editingFlexEvent?.id) {
      await electronAPI.updateFlexEvent(editingFlexEvent.id, flexEventData);
    } else {
      await electronAPI.createFlexEvent(flexEventData);
    }

    await loadFlexEvents();
    handleCloseFlexEventModal();
  };

  const handleFlexEventEdit = (event: FlexEvent) => {
    setEditingFlexEvent(event);
    setFlexEventFormData({
      date: event.date.split('T')[0],
      reason: event.reason,
      amount: event.amount,
      affectedGoals: event.affectedGoals,
      rebalancingPlan: event.rebalancingPlan,
      acknowledged: event.acknowledged,
    });
    setShowFlexEventModal(true);
  };

  const handleFlexEventDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this flex event?')) {
      await electronAPI.deleteFlexEvent(id);
      await loadFlexEvents();
    }
  };

  const handleCloseFlexEventModal = () => {
    setShowFlexEventModal(false);
    setEditingFlexEvent(null);
    setFlexEventFormData({
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

  const toggleGoalSelection = (goalId: number) => {
    const current = flexEventFormData.affectedGoals || [];
    if (current.includes(goalId)) {
      setFlexEventFormData({ ...flexEventFormData, affectedGoals: current.filter(id => id !== goalId) });
    } else {
      setFlexEventFormData({ ...flexEventFormData, affectedGoals: [...current, goalId] });
    }
  };

  const togglePausedGoal = (goalId: number) => {
    const current = flexEventFormData.rebalancingPlan?.pausedGoals || [];
    if (current.includes(goalId)) {
      setFlexEventFormData({
        ...flexEventFormData,
        rebalancingPlan: {
          ...flexEventFormData.rebalancingPlan!,
          pausedGoals: current.filter(id => id !== goalId),
        },
      });
    } else {
      setFlexEventFormData({
        ...flexEventFormData,
        rebalancingPlan: {
          ...flexEventFormData.rebalancingPlan!,
          pausedGoals: [...current, goalId],
        },
      });
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={viewMode === 'transactions' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setViewMode('transactions')}
              style={{ padding: '0.5rem 1rem' }}
            >
              Transactions
            </button>
            <button
              className={viewMode === 'flex-events' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setViewMode('flex-events')}
              style={{ padding: '0.5rem 1rem' }}
            >
              Flex Events
            </button>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => viewMode === 'transactions' ? setShowModal(true) : setShowFlexEventModal(true)}
          >
            <Plus size={16} style={{ marginRight: '0.5rem' }} />
            {viewMode === 'transactions' ? 'Record Transaction' : 'Create Flex Event'}
          </button>
        </div>

        {viewMode === 'transactions' ? (
          <>
            {transactions.length === 0 ? (
              <div className="empty-state">
                <h3>No transactions yet</h3>
                <p>Record your first transaction to track actual contributions</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    style={{
                      border: '1px solid #e5e5ea',
                      borderRadius: '8px',
                      padding: '1rem',
                      background: 'white',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      {getTransactionIcon(transaction.transactionType)}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                          {transaction.transactionType === 'allocation' 
                            ? `Contribution to ${getGoalName(transaction.goalId)}`
                            : transaction.transactionType === 'income'
                            ? 'Income'
                            : 'Expense'}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>
                          {transaction.description || 'No description'}
                          {transaction.goalId && (
                            <span> • Goal: {getGoalName(transaction.goalId)}</span>
                          )}
                          {transaction.categoryId && (
                            <span> • Category: {getCategoryName(transaction.categoryId)}</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
                          {new Date(transaction.date || '').toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontWeight: 600, 
                        fontSize: '1.125rem',
                        color: transaction.transactionType === 'expense' ? '#ff3b30' : '#34c759'
                      }}>
                        {transaction.transactionType === 'expense' ? '-' : '+'}
                        ₹{transaction.amount.toLocaleString()}
                      </div>
                      {transaction.plannedAmount && transaction.plannedAmount !== transaction.amount && (
                        <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
                          Planned: ₹{transaction.plannedAmount.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {flexEvents.length === 0 ? (
              <div className="empty-state">
                <AlertCircle size={48} style={{ color: '#8e8e93', marginBottom: '1rem' }} />
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
                          <AlertCircle size={16} style={{ color: '#007aff' }} />
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
                          onClick={() => event.id && handleFlexEventEdit(event)}
                          style={{ padding: '0.5rem' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => event.id && handleFlexEventDelete(event.id)}
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
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Transaction</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Transaction Type</label>
                <select
                  value={formData.transactionType}
                  onChange={(e) => setFormData({ ...formData, transactionType: e.target.value as any })}
                >
                  <option value="allocation">Contribution to Goal</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>

              {formData.transactionType === 'allocation' && (
                <div className="form-group">
                  <label>Goal</label>
                  <select
                    value={formData.goalId || ''}
                    onChange={(e) => setFormData({ ...formData, goalId: e.target.value ? parseInt(e.target.value) : undefined })}
                    required
                  >
                    <option value="">Select a goal</option>
                    {goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.transactionType === 'expense' && (
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.categoryId || ''}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value ? parseInt(e.target.value) : undefined })}
                  >
                    <option value="">No category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-row">
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
                  <label>Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Monthly salary, Emergency expense"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flex Event Modal */}
      {showFlexEventModal && (
        <div className="modal-overlay" onClick={handleCloseFlexEventModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>{editingFlexEvent ? 'Edit Flex Event' : 'Create Flex Event'}</h3>
              <button className="close-btn" onClick={handleCloseFlexEventModal}>×</button>
            </div>
            <form onSubmit={handleFlexEventSubmit}>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  required
                  value={flexEventFormData.date}
                  onChange={(e) => setFlexEventFormData({ ...flexEventFormData, date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Reason</label>
                <input
                  type="text"
                  required
                  value={flexEventFormData.reason}
                  onChange={(e) => setFlexEventFormData({ ...flexEventFormData, reason: e.target.value })}
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
                  value={flexEventFormData.amount}
                  onChange={(e) => setFlexEventFormData({ ...flexEventFormData, amount: parseFloat(e.target.value) || 0 })}
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
                        checked={(flexEventFormData.affectedGoals || []).includes(goal.id!)}
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
                    .filter(g => (flexEventFormData.affectedGoals || []).includes(g.id!))
                    .map((goal) => (
                      <label key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={(flexEventFormData.rebalancingPlan?.pausedGoals || []).includes(goal.id!)}
                          onChange={() => togglePausedGoal(goal.id!)}
                        />
                        <span>{goal.name}</span>
                      </label>
                    ))}
                  {(!flexEventFormData.affectedGoals || flexEventFormData.affectedGoals.length === 0) && (
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
                    checked={flexEventFormData.acknowledged}
                    onChange={(e) => setFlexEventFormData({ ...flexEventFormData, acknowledged: e.target.checked })}
                  />
                  Acknowledged
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseFlexEventModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingFlexEvent ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

