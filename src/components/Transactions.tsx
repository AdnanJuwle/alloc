import { useState, useEffect } from 'react';
import { Plus, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { Goal, Transaction } from '../types';
import { electronAPI } from '../utils/electron-api';

export function Transactions() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Transaction>>({
    goalId: undefined,
    amount: 0,
    transactionType: 'allocation',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadGoals();
    loadTransactions();
  }, []);

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

  const loadTransactions = async () => {
    const data = await electronAPI.getTransactions();
    setTransactions(data.map(transformTransaction));
  };

  const transformTransaction = (tx: any): Transaction => ({
    id: tx.id,
    goalId: tx.goal_id || undefined,
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

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Transactions</h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} style={{ marginRight: '0.5rem' }} />
            Record Transaction
          </button>
        </div>

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
                        <span> • {getGoalName(transaction.goalId)}</span>
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
    </div>
  );
}

