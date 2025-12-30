import { useState, useEffect } from 'react';
import { Target, TrendingUp, Calendar, AlertCircle, Shield, TrendingDown, DollarSign, PieChart, Bell, Plus, Edit2, Trash2, Tag, Filter, Activity, CheckCircle, XCircle } from 'lucide-react';
import { Goal, SpendingPeriod, SpendingAlert, Category, PlanHealth } from '../types';
import { electronAPI } from '../utils/electron-api';

export function Dashboard() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [spendingData, setSpendingData] = useState<SpendingPeriod | null>(null);
  const [alerts, setAlerts] = useState<SpendingAlert[]>([]);
  const [planHealth, setPlanHealth] = useState<PlanHealth | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPlanHealthModal, setShowPlanHealthModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<Partial<Category>>({
    name: '',
    icon: '',
    color: '#007aff',
  });

  useEffect(() => {
    loadGoals();
    loadTransactions();
    loadCategories();
    loadSpendingData();
    loadAlerts();
    loadPlanHealth();
  }, [selectedPeriod, selectedYear, selectedMonth, selectedCategoryFilter]);

  // Listen for data updates from AI actions
  useEffect(() => {
    const handleDataUpdate = () => {
      loadGoals();
      loadTransactions();
      loadSpendingData();
      loadAlerts();
      loadPlanHealth();
    };
    
    window.addEventListener('data-updated', handleDataUpdate);
    return () => window.removeEventListener('data-updated', handleDataUpdate);
  }, []);

  const loadPlanHealth = async () => {
    try {
      const data = await electronAPI.calculatePlanHealth();
      setPlanHealth(data);
    } catch (error) {
      console.error('Error loading plan health:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await electronAPI.getCategories();
      setCategories(data.map((c: any) => ({
        id: c.id,
        name: c.name,
        icon: c.icon || undefined,
        color: c.color || undefined,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const categoryData = {
      name: categoryFormData.name!,
      icon: categoryFormData.icon || undefined,
      color: categoryFormData.color || undefined,
    };

    if (editingCategory?.id) {
      await electronAPI.updateCategory(editingCategory.id, categoryData);
    } else {
      await electronAPI.createCategory(categoryData);
    }

    await loadCategories();
    handleCloseCategoryModal();
  };

  const handleCategoryEdit = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      icon: category.icon || '',
      color: category.color || '#007aff',
    });
    setShowCategoryModal(true);
  };

  const handleCategoryDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this category? This will not delete transactions, but they will lose their category association.')) {
      await electronAPI.deleteCategory(id);
      await loadCategories();
    }
  };

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryFormData({
      name: '',
      icon: '',
      color: '#007aff',
    });
  };

  const predefinedColors = [
    '#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de',
    '#ff2d55', '#5856d6', '#5ac8fa', '#ffcc00', '#8e8e93'
  ];

  const loadSpendingData = async () => {
    try {
      const data = await electronAPI.getSpendingPeriod(selectedPeriod, selectedYear, selectedMonth);
      let spendingData = {
        period: data.period,
        startDate: data.startDate,
        endDate: data.endDate,
        totalSpending: data.totalSpending,
        byCategory: data.byCategory,
      };
      
      // Filter by category if selected
      if (selectedCategoryFilter) {
        spendingData.byCategory = spendingData.byCategory.filter(c => c.categoryId === selectedCategoryFilter);
        spendingData.totalSpending = spendingData.byCategory.reduce((sum, c) => sum + c.amount, 0);
      }
      
      setSpendingData(spendingData);
    } catch (error) {
      console.error('Error loading spending data:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const now = new Date();
      const data = await electronAPI.getSpendingAlerts(now.getFullYear(), now.getMonth() + 1);
      setAlerts(data);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

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

  // Calculate expense totals
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
  
  const monthExpenses = transactions.filter(t => {
    if (t.transaction_type !== 'expense') return false;
    const txDate = new Date(t.date);
    return txDate >= monthStart && txDate <= monthEnd;
  });
  
  const totalMonthExpenses = monthExpenses.reduce((sum, t) => sum + (t.amount || 0), 0);
  
  // Get recent transactions (last 5)
  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const getCategoryColor = (index: number) => {
    const colors = [
      '#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de',
      '#ff2d55', '#5856d6', '#5ac8fa', '#ffcc00', '#8e8e93'
    ];
    return colors[index % colors.length];
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
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
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
            <TrendingDown size={20} style={{ color: '#ff3b30' }} />
            <div style={{ color: '#8e8e93', fontSize: '0.875rem' }}>This Month Expenses</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: '#ff3b30' }}>
            ₹{totalMonthExpenses.toLocaleString()}
          </div>
          {spendingData && (
            <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
              {selectedPeriod === 'weekly' ? 'This Week' : 'This Month'}
            </div>
          )}
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

        {alerts.length > 0 && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Bell size={20} style={{ color: '#ff9500' }} />
              <div style={{ color: '#8e8e93', fontSize: '0.875rem' }}>Budget Alerts</div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 600, color: '#ff9500' }}>
              {alerts.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
              Categories need attention
            </div>
          </div>
        )}

        {planHealth && (
          <div 
            className="card" 
            style={{ 
              padding: '1.5rem',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onClick={() => setShowPlanHealthModal(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Activity size={20} style={{ 
                color: planHealth.healthStatus === 'healthy' ? '#34c759' : 
                       planHealth.healthStatus === 'warning' ? '#ff9500' : '#ff3b30' 
              }} />
              <div style={{ color: '#8e8e93', fontSize: '0.875rem' }}>Plan Health</div>
            </div>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 600, 
              color: planHealth.healthStatus === 'healthy' ? '#34c759' : 
                     planHealth.healthStatus === 'warning' ? '#ff9500' : '#ff3b30',
              textTransform: 'capitalize'
            }}>
              {planHealth.healthStatus}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
              Efficiency: {planHealth.allocationEfficiency.toFixed(1)}% • Click for details
            </div>
          </div>
        )}
      </div>

      {/* Budget Alerts Section */}
      {alerts.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">
            <h2>Budget Alerts</h2>
          </div>
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
                  <AlertCircle size={20} style={{ color: getAlertColor(alert.alertType) }} />
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                      {alert.categoryName}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>
                      {alert.alertType === 'overspent' && `Overspent by ₹${(alert.currentSpending - alert.budgetLimit).toLocaleString()}`}
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spending Overview Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Spending Summary */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2>Spending Overview</h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className={selectedPeriod === 'monthly' ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => setSelectedPeriod('monthly')}
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              >
                Monthly
              </button>
              <button
                className={selectedPeriod === 'weekly' ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => setSelectedPeriod('weekly')}
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              >
                Weekly
              </button>
            </div>
          </div>
          
          {selectedPeriod === 'monthly' && (
            <div style={{ padding: '0 1.5rem 1rem 1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e5e5ea', fontSize: '0.875rem' }}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e5e5ea', fontSize: '0.875rem' }}
              >
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>{name}</option>
                ))}
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
                <Filter size={16} style={{ color: '#8e8e93' }} />
                <select
                  value={selectedCategoryFilter || ''}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value ? parseInt(e.target.value) : null)}
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e5e5ea', fontSize: '0.875rem' }}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {spendingData && spendingData.totalSpending > 0 ? (
            <div>
              <div style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                padding: '1.5rem',
                color: 'white',
                marginBottom: '1.5rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <TrendingDown size={24} />
                  <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                    ₹{spendingData.totalSpending.toLocaleString()}
                  </div>
                </div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.25rem' }}>
                  Total spending this {selectedPeriod}
                </div>
              </div>

              {spendingData.byCategory.length > 0 && (
                <div>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
                    By Category
                  </h3>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {spendingData.byCategory.slice(0, 5).map((item, index) => (
                      <div
                        key={item.categoryId}
                        style={{
                          border: '1px solid #e5e5ea',
                          borderRadius: '8px',
                          padding: '1rem',
                          background: 'white',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: getCategoryColor(index),
                              }}
                            />
                            <div style={{ fontWeight: 600 }}>{item.categoryName}</div>
                          </div>
                          <div style={{ fontWeight: 600 }}>
                            ₹{item.amount.toLocaleString()}
                          </div>
                        </div>
                        <div style={{
                          width: '100%',
                          height: '6px',
                          background: '#e5e5ea',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${item.percentage}%`,
                            height: '100%',
                            background: getCategoryColor(index),
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
                          {item.percentage.toFixed(1)}% of total
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <PieChart size={48} style={{ color: '#8e8e93', marginBottom: '1rem' }} />
              <h3>No spending data</h3>
              <p>Record expenses with categories to see spending breakdown</p>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="card-header">
            <h2>Recent Transactions</h2>
          </div>
          {recentTransactions.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {recentTransactions.map((tx) => {
                const isExpense = tx.transaction_type === 'expense';
                const isIncome = tx.transaction_type === 'income';
                
                return (
                  <div
                    key={tx.id}
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
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                        {tx.description || (isExpense ? 'Expense' : isIncome ? 'Income' : 'Allocation')}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>
                        {new Date(tx.date).toLocaleDateString()}
                        {tx.category_id && (() => {
                          const category = categories.find(c => c.id === tx.category_id);
                          return category ? ` • ${category.name}` : '';
                        })()}
                      </div>
                    </div>
                    <div style={{ 
                      fontWeight: 600, 
                      fontSize: '1.125rem',
                      color: isExpense ? '#ff3b30' : '#34c759'
                    }}>
                      {isExpense ? '-' : '+'}₹{tx.amount.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <DollarSign size={48} style={{ color: '#8e8e93', marginBottom: '1rem' }} />
              <h3>No transactions yet</h3>
              <p>Record your first transaction to see it here</p>
            </div>
          )}
        </div>
      </div>

      {/* Categories Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <h2>Categories</h2>
          <button className="btn btn-primary" onClick={() => setShowCategoryModal(true)}>
            <Plus size={16} style={{ marginRight: '0.5rem' }} />
            Create Category
          </button>
        </div>
        {categories.length === 0 ? (
          <div className="empty-state">
            <h3>No categories yet</h3>
            <p>Create categories to organize your expenses (food, rent, travel, etc.)</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {categories.map((category) => (
              <div
                key={category.id}
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
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: category.color || '#007aff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <Tag size={16} />
                  </div>
                  <div style={{ fontWeight: 600 }}>{category.name}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleCategoryEdit(category)}
                    style={{ padding: '0.5rem' }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => category.id && handleCategoryDelete(category.id)}
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

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={handleCloseCategoryModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCategory ? 'Edit Category' : 'Create Category'}</h3>
              <button className="close-btn" onClick={handleCloseCategoryModal}>×</button>
            </div>
            <form onSubmit={handleCategorySubmit}>
              <div className="form-group">
                <label>Category Name</label>
                <input
                  type="text"
                  required
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  placeholder="e.g., Food, Rent, Travel"
                />
              </div>

              <div className="form-group">
                <label>Icon (Optional)</label>
                <input
                  type="text"
                  value={categoryFormData.icon}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, icon: e.target.value })}
                  placeholder="e.g., 🍔, 🏠, ✈️"
                />
              </div>

              <div className="form-group">
                <label>Color</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCategoryFormData({ ...categoryFormData, color })}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: color,
                        border: categoryFormData.color === color ? '2px solid #000' : '2px solid transparent',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={categoryFormData.color}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                  style={{ marginTop: '0.5rem', width: '100%', height: '40px' }}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseCategoryModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Plan Health Modal */}
      {showPlanHealthModal && planHealth && (
        <div className="modal-overlay" onClick={() => setShowPlanHealthModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>Plan Health Details</h2>
              <button className="close-btn" onClick={() => setShowPlanHealthModal(false)}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {/* Overall Status */}
              <div style={{ 
                background: `linear-gradient(135deg, ${getAlertColor(planHealth.healthStatus === 'healthy' ? 'warning' : planHealth.healthStatus === 'warning' ? 'limit_reached' : 'overspent')}15 0%, ${getAlertColor(planHealth.healthStatus === 'healthy' ? 'warning' : planHealth.healthStatus === 'warning' ? 'limit_reached' : 'overspent')}05 100%)`,
                borderRadius: '12px',
                padding: '2rem',
                textAlign: 'center',
                marginBottom: '2rem',
                border: `2px solid ${getAlertColor(planHealth.healthStatus === 'healthy' ? 'warning' : planHealth.healthStatus === 'warning' ? 'limit_reached' : 'overspent')}40`,
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  {planHealth.healthStatus === 'healthy' ? (
                    <CheckCircle size={48} style={{ color: '#34c759' }} />
                  ) : planHealth.healthStatus === 'warning' ? (
                    <AlertCircle size={48} style={{ color: '#ff9500' }} />
                  ) : (
                    <XCircle size={48} style={{ color: '#ff3b30' }} />
                  )}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'capitalize', color: getAlertColor(planHealth.healthStatus === 'healthy' ? 'warning' : planHealth.healthStatus === 'warning' ? 'limit_reached' : 'overspent') }}>
                  {planHealth.healthStatus}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>
                  Overall Plan Health Status
                </div>
              </div>

              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <TrendingUp size={20} style={{ color: '#007aff' }} />
                    <div style={{ color: '#8e8e93', fontSize: '0.875rem' }}>Allocation Efficiency</div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 600, color: planHealth.allocationEfficiency >= 80 ? '#34c759' : planHealth.allocationEfficiency >= 60 ? '#ff9500' : '#ff3b30' }}>
                    {planHealth.allocationEfficiency.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
                    % of income allocated to goals
                  </div>
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <AlertCircle size={20} style={{ color: '#ff9500' }} />
                    <div style={{ color: '#8e8e93', fontSize: '0.875rem' }}>Fragility Score</div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 600, color: planHealth.fragilityScore < 30 ? '#34c759' : planHealth.fragilityScore < 60 ? '#ff9500' : '#ff3b30' }}>
                    {planHealth.fragilityScore.toFixed(1)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
                    Lower is better (0-100)
                  </div>
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <Activity size={20} style={{ color: '#34c759' }} />
                    <div style={{ color: '#8e8e93', fontSize: '0.875rem' }}>Slack Months</div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 600, color: planHealth.slackMonths > 2 ? '#34c759' : planHealth.slackMonths > 0 ? '#ff9500' : '#ff3b30' }}>
                    {planHealth.slackMonths.toFixed(1)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
                    Buffer before deadlines
                  </div>
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <TrendingDown size={20} style={{ color: '#ff3b30' }} />
                    <div style={{ color: '#8e8e93', fontSize: '0.875rem' }}>Deviations (3 months)</div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 600, color: planHealth.deviationCount === 0 ? '#34c759' : planHealth.deviationCount < 3 ? '#ff9500' : '#ff3b30' }}>
                    {planHealth.deviationCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>
                    Missed contributions
                  </div>
                </div>
              </div>

              {/* Goals Status */}
              <div className="card">
                <div className="card-header">
                  <h3>Goals Status</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1.5rem' }}>
                  <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <div style={{ fontSize: '3rem', fontWeight: 700, color: '#34c759', marginBottom: '0.5rem' }}>
                      {planHealth.onTrackGoals}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>On Track</div>
                    <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>Goals meeting targets</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <div style={{ fontSize: '3rem', fontWeight: 700, color: '#ff3b30', marginBottom: '0.5rem' }}>
                      {planHealth.behindGoals}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Behind Schedule</div>
                    <div style={{ fontSize: '0.875rem', color: '#8e8e93' }}>Goals needing attention</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowPlanHealthModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

