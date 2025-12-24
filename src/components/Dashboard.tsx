import { useState, useEffect } from 'react';
import { Target, TrendingUp, Calendar, AlertCircle, Shield } from 'lucide-react';
import { Goal } from '../types';
import { electronAPI } from '../utils/electron-api';

export function Dashboard() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    loadGoals();
    loadTransactions();
  }, []);

  const loadGoals = async () => {
    const data = await electronAPI.getGoals();
    setGoals(data.map(transformGoal));
  };

  const loadTransactions = async () => {
    const data = await electronAPI.getTransactions();
    setTransactions(data);
  };

  // Calculate how much has been contributed to a goal in the current month
  const getCurrentMonthContribution = (goalId: number): number => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const monthTransactions = transactions.filter(t => {
      if (!t.goal_id || t.goal_id !== goalId) return false;
      if (t.transaction_type !== 'allocation') return false;
      const txDate = new Date(t.date);
      return txDate >= monthStart && txDate <= monthEnd;
    });

    return monthTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
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
    isEmergencyFund: goal.is_emergency_fund || false,
    createdAt: goal.created_at,
    updatedAt: goal.updated_at,
  });

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

  // Always calculate required monthly (for display on goal cards)
  const calculateRequiredMonthly = (goal: Goal) => {
    const monthsRemaining = calculateMonthsRemaining(goal);
    const remaining = goal.targetAmount - (goal.currentAmount || 0);
    return monthsRemaining > 0 ? remaining / monthsRemaining : remaining;
  };

  // Calculate required monthly only if goal has started (for dashboard totals)
  const calculateRequiredMonthlyIfStarted = (goal: Goal) => {
    if (!hasStarted(goal)) {
      return 0;
    }
    return calculateRequiredMonthly(goal);
  };

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
  // Only sum required monthly for goals that have started (for dashboard totals)
  const totalRequiredMonthly = goals
    .filter(g => hasStarted(g))
    .reduce((sum, g) => sum + calculateRequiredMonthlyIfStarted(g), 0);
  const totalCurrentMonthly = goals
    .filter(g => hasStarted(g))
    .reduce((sum, g) => sum + (g.monthlyContribution || 0), 0);

  const urgentGoals = goals.filter(g => {
    // Only consider goals that have started
    if (!hasStarted(g)) {
      return false; // Future goals are not urgent
    }
    
    // Check if goal needs contribution this month
    const requiredMonthly = calculateRequiredMonthlyIfStarted(g);
    if (requiredMonthly <= 0) return false; // Goal is complete or doesn't need anything
    
    const currentMonthContribution = getCurrentMonthContribution(g.id!);
    
    // Goal is urgent if it hasn't met its monthly requirement yet
    return currentMonthContribution < requiredMonthly;
  });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Target size={20} style={{ color: '#007aff' }} />
            <div style={{ color: '#8e8e93', fontSize: '0.875rem' }}>Total Goals</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 600 }}>{goals.length}</div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <TrendingUp size={20} style={{ color: '#34c759' }} />
            <div style={{ color: '#8e8e93', fontSize: '0.875rem' }}>Total Saved</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: '#34c759' }}>
            ₹{totalCurrent.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
            of ₹{totalTarget.toLocaleString()}
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Calendar size={20} style={{ color: '#ff9500' }} />
            <div style={{ color: '#8e8e93', fontSize: '0.875rem' }}>Required Monthly</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: '#ff9500' }}>
            ₹{totalRequiredMonthly.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
            Currently: ₹{totalCurrentMonthly.toLocaleString()}/month
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <AlertCircle size={20} style={{ color: '#ff3b30' }} />
            <div style={{ color: '#8e8e93', fontSize: '0.875rem' }}>Urgent Goals</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: '#ff3b30' }}>
            {urgentGoals.length}
          </div>
        </div>
      </div>

      {goals.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <h2>Goal Overview</h2>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {goals.map((goal) => {
              const progress = calculateProgress(goal);
              const monthsRemaining = calculateMonthsRemaining(goal);
              const requiredMonthly = calculateRequiredMonthly(goal);
              const goalStarted = hasStarted(goal);
              const monthsUntilStart = calculateMonthsUntilStart(goal);
              const currentMonthContribution = goalStarted ? getCurrentMonthContribution(goal.id!) : 0;
              
              // Goal is urgent only if it has started and needs more contribution this month
              const isUrgent = goalStarted && requiredMonthly > 0 && currentMonthContribution < requiredMonthly;
              
              return (
                <div
                  key={goal.id}
                  style={{
                    border: isUrgent ? '2px solid #ff3b30' : '1px solid #e5e5ea',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    background: isUrgent ? '#fff5f5' : 'white',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                          {goal.name}
                        </h3>
                        {goal.isEmergencyFund && (
                          <span style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.25rem',
                            padding: '0.25rem 0.5rem', 
                            background: '#fff3cd', 
                            color: '#856404', 
                            borderRadius: '4px', 
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            <Shield size={12} />
                            Emergency Fund
                          </span>
                        )}
                        {isUrgent && (
                          <span style={{ 
                            padding: '0.25rem 0.5rem', 
                            background: '#ff3b30', 
                            color: 'white', 
                            borderRadius: '4px', 
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            URGENT
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: '#8e8e93', flexWrap: 'wrap' }}>
                        <span>Target: ₹{goal.targetAmount.toLocaleString()}</span>
                        {goal.startDate && (
                          <span>Starts: {new Date(goal.startDate).toLocaleDateString()}</span>
                        )}
                        <span>Deadline: {new Date(goal.deadline).toLocaleDateString()}</span>
                        <span>Priority: {goal.priorityWeight}/10</span>
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
                          background: isUrgent ? '#ff3b30' : '#007aff',
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                    <div>
                      <div style={{ color: '#8e8e93', marginBottom: '0.25rem' }}>This Month's Contribution</div>
                      <div style={{ fontWeight: 600, color: goalStarted ? (currentMonthContribution > 0 ? '#34c759' : '#8e8e93') : '#8e8e93' }}>
                        ₹{currentMonthContribution.toLocaleString()}
                      </div>
                      {goalStarted && requiredMonthly > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
                          {currentMonthContribution < requiredMonthly 
                            ? `Needs ₹${(requiredMonthly - currentMonthContribution).toLocaleString()} more`
                            : '✓ Monthly goal met'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ color: '#8e8e93', marginBottom: '0.25rem' }}>Required Monthly</div>
                      <div style={{ fontWeight: 600, color: isUrgent ? '#ff3b30' : '#34c759' }}>
                        ₹{requiredMonthly.toLocaleString()}/month
                      </div>
                      {!goalStarted && goal.startDate && (
                        <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
                          Starts in {monthsUntilStart} {monthsUntilStart === 1 ? 'month' : 'months'}
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <h3>No goals yet</h3>
            <p>Create your first goal bucket to get started</p>
          </div>
        </div>
      )}
    </div>
  );
}

