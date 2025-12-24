import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { Goal } from '../types';
import { electronAPI } from '../utils/electron-api';

export function Dashboard() {
  const [goals, setGoals] = useState<Goal[]>([]);

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
    deadline: goal.deadline,
    priorityWeight: goal.priority_weight,
    monthlyContribution: goal.monthly_contribution,
    currentAmount: goal.current_amount || 0,
    createdAt: goal.created_at,
    updatedAt: goal.updated_at,
  });

  const calculateProgress = (goal: Goal) => {
    return goal.currentAmount ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  };

  const calculateMonthsRemaining = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    return diffMonths > 0 ? diffMonths : 0;
  };

  const calculateRequiredMonthly = (goal: Goal) => {
    const monthsRemaining = calculateMonthsRemaining(goal.deadline);
    const remaining = goal.targetAmount - (goal.currentAmount || 0);
    return monthsRemaining > 0 ? remaining / monthsRemaining : remaining;
  };

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
  const totalRequiredMonthly = goals.reduce((sum, g) => sum + calculateRequiredMonthly(g), 0);
  const totalCurrentMonthly = goals.reduce((sum, g) => sum + (g.monthlyContribution || 0), 0);

  const urgentGoals = goals.filter(g => {
    const monthsRemaining = calculateMonthsRemaining(g.deadline);
    const required = calculateRequiredMonthly(g);
    return monthsRemaining < 6 || required > (g.monthlyContribution || 0) * 1.2;
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
              const monthsRemaining = calculateMonthsRemaining(goal.deadline);
              const requiredMonthly = calculateRequiredMonthly(goal);
              const isUrgent = monthsRemaining < 6 || requiredMonthly > (goal.monthlyContribution || 0) * 1.2;
              
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                          {goal.name}
                        </h3>
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
                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: '#8e8e93' }}>
                        <span>Target: ₹{goal.targetAmount.toLocaleString()}</span>
                        <span>Deadline: {new Date(goal.deadline).toLocaleDateString()}</span>
                        <span>Priority: {goal.priorityWeight}/10</span>
                      </div>
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
                      <div style={{ color: '#8e8e93', marginBottom: '0.25rem' }}>Current Contribution</div>
                      <div style={{ fontWeight: 600 }}>₹{goal.monthlyContribution?.toLocaleString() || 0}/month</div>
                    </div>
                    <div>
                      <div style={{ color: '#8e8e93', marginBottom: '0.25rem' }}>Required Monthly</div>
                      <div style={{ fontWeight: 600, color: requiredMonthly > (goal.monthlyContribution || 0) ? '#ff3b30' : '#34c759' }}>
                        ₹{requiredMonthly.toLocaleString()}/month
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#8e8e93', marginBottom: '0.25rem' }}>Months Remaining</div>
                      <div style={{ fontWeight: 600 }}>{monthsRemaining} months</div>
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

