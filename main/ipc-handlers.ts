import { ipcMain } from 'electron';
import {
  getDatabase,
  queryGoals,
  insertGoal,
  updateGoal,
  deleteGoal,
  queryIncomeScenarios,
  insertIncomeScenario,
  updateIncomeScenario,
  deleteIncomeScenario,
  queryTransactions,
  insertTransaction,
  findIncomeScenarioById,
  saveDatabaseToDisk,
  queryCategories,
  insertCategory,
  updateCategory,
  deleteCategory,
  queryBudgets,
  insertBudget,
  updateBudget,
  deleteBudget,
  queryAllocationRules,
  insertAllocationRule,
  updateAllocationRule,
  deleteAllocationRule,
} from './database';

// Goals
ipcMain.handle('get-goals', async () => {
  return queryGoals();
});

ipcMain.handle('create-goal', async (_, goal) => {
  return insertGoal({
    name: goal.name,
    target_amount: goal.targetAmount,
    start_date: goal.startDate || undefined,
    deadline: goal.deadline,
    priority_weight: goal.priorityWeight || 5,
    monthly_contribution: goal.monthlyContribution || 0,
    current_amount: goal.currentAmount || 0,
    is_emergency_fund: goal.isEmergencyFund || false,
  });
});

ipcMain.handle('update-goal', async (_, id, goal) => {
  updateGoal(id, {
    name: goal.name,
    target_amount: goal.targetAmount,
    start_date: goal.startDate || undefined,
    deadline: goal.deadline,
    priority_weight: goal.priorityWeight,
    monthly_contribution: goal.monthlyContribution,
    current_amount: goal.currentAmount,
    is_emergency_fund: goal.isEmergencyFund || false,
  });
});

ipcMain.handle('delete-goal', async (_, id) => {
  deleteGoal(id);
});

// Income Scenarios
ipcMain.handle('get-income-scenarios', async () => {
  return queryIncomeScenarios();
});

ipcMain.handle('create-income-scenario', async (_, scenario) => {
  return insertIncomeScenario({
    name: scenario.name,
    monthly_income: scenario.monthlyIncome,
    tax_rate: scenario.taxRate || 0,
    fixed_expenses: scenario.fixedExpenses || 0,
    scenario_type: scenario.scenarioType || 'expected',
  });
});

ipcMain.handle('update-income-scenario', async (_, id, scenario) => {
  updateIncomeScenario(id, {
    name: scenario.name,
    monthly_income: scenario.monthlyIncome,
    tax_rate: scenario.taxRate,
    fixed_expenses: scenario.fixedExpenses,
    scenario_type: scenario.scenarioType,
  });
});

ipcMain.handle('delete-income-scenario', async (_, id) => {
  deleteIncomeScenario(id);
});

// Transactions
ipcMain.handle('get-transactions', async () => {
  return queryTransactions();
});

ipcMain.handle('create-transaction', async (_, transaction) => {
  return insertTransaction({
    goal_id: transaction.goalId || null,
    category_id: transaction.categoryId || null, // V2: Support categories
    amount: transaction.amount,
    transaction_type: transaction.transactionType,
    description: transaction.description || null,
    date: transaction.date || new Date().toISOString(),
    deviation_type: transaction.deviationType || null,
    planned_amount: transaction.plannedAmount || null,
    actual_amount: transaction.actualAmount || transaction.amount,
    acknowledged: transaction.acknowledged || false,
    acknowledged_at: transaction.acknowledgedAt || null,
  });
});

// Auto-Split Logic
ipcMain.handle('calculate-auto-split', async (_, incomeAmount, scenarioId) => {
  // Get scenario if provided
  let scenario: any = null;
  if (scenarioId) {
    scenario = findIncomeScenarioById(scenarioId);
  }
  
  // Calculate net income after taxes and fixed expenses
  let netIncome = incomeAmount;
  if (scenario) {
    netIncome = incomeAmount * (1 - (scenario.tax_rate / 100)) - scenario.fixed_expenses;
  }
  
  // Get all goals ordered by priority
  const goals = queryGoals();
  
  // Helper function to check if a goal has started
  const hasGoalStarted = (goal: any): boolean => {
    if (!goal.start_date) return true; // No start date means it started immediately
    const startDate = new Date(goal.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    return startDate.getTime() <= today.getTime();
  };
  
  // Separate goals into active (started) and future (not started yet)
  const activeGoals = goals.filter((g: any) => hasGoalStarted(g));
  const futureGoals = goals.filter((g: any) => !hasGoalStarted(g));
  
  // Calculate allocations
  const allocations: any[] = [];
  let remainingIncome = netIncome;
  
  // V2: Emergency fund logic - first priority until filled (only if active)
  const emergencyFund = activeGoals.find((g: any) => g.is_emergency_fund === true);
  
  if (emergencyFund) {
    // Calculate how much is needed to fill the emergency fund
    const remainingToFill = emergencyFund.target_amount - (emergencyFund.current_amount || 0);
    
    if (remainingToFill > 0) {
      // Emergency fund is not filled - allocate to it first
      let emergencyAllocation = 0;
      
      // Check if monthly contribution is set (explicitly check for > 0)
      const monthlyContribution = emergencyFund.monthly_contribution || 0;
      const hasMonthlyContribution = monthlyContribution > 0;
      
      if (hasMonthlyContribution) {
        // STRICT CAP: Emergency fund with monthly contribution - NEVER allocate more than monthly_contribution
        // This ensures free spend is always available (unless monthly_contribution is larger than income)
        emergencyAllocation = Math.min(
          monthlyContribution,  // Hard cap: never exceed monthly contribution
          remainingIncome       // Don't allocate more than available
        );
      } else {
        // No monthly contribution specified - allocate all available until filled
        emergencyAllocation = Math.min(remainingToFill, remainingIncome);
      }
      
      if (emergencyAllocation > 0) {
        allocations.push({
          goalId: emergencyFund.id,
          goalName: emergencyFund.name,
          amount: emergencyAllocation,
          type: 'emergency'
        });
        remainingIncome -= emergencyAllocation;
      }
    }
    // If emergency fund is already filled, skip it (treat as completed goal)
  }
  
  // Allocate to ACTIVE regular goals first (excluding emergency fund if it was handled)
  const activeRegularGoals = activeGoals.filter((g: any) => !g.is_emergency_fund);
  
  for (const goal of activeRegularGoals) {
    if (remainingIncome <= 0) break;
    
    let allocation = 0;
    if (goal.monthly_contribution && goal.monthly_contribution > 0) {
      // Fixed monthly contribution
      allocation = Math.min(goal.monthly_contribution, remainingIncome);
    } else {
      // Calculate based on priority weight and deadline urgency
      // Only consider active goals for priority distribution
      const totalPriority = activeRegularGoals.reduce((sum: number, g: any) => sum + g.priority_weight, 0);
      if (totalPriority > 0) {
        const priorityRatio = goal.priority_weight / totalPriority;
        allocation = remainingIncome * priorityRatio * 0.5; // Use 50% of remaining for flexibility
      }
    }
    
    if (allocation > 0) {
      allocations.push({
        goalId: goal.id,
        goalName: goal.name,
        amount: allocation,
        type: 'goal'
      });
      remainingIncome -= allocation;
    }
  }
  
  // Then allocate to FUTURE goals (only if there's remaining income after active goals)
  const futureRegularGoals = futureGoals.filter((g: any) => !g.is_emergency_fund);
  
  for (const goal of futureRegularGoals) {
    if (remainingIncome <= 0) break;
    
    let allocation = 0;
    if (goal.monthly_contribution && goal.monthly_contribution > 0) {
      // Fixed monthly contribution for future goals
      allocation = Math.min(goal.monthly_contribution, remainingIncome);
    } else {
      // Calculate based on priority weight - only consider future goals for priority distribution
      const totalPriority = futureRegularGoals.reduce((sum: number, g: any) => sum + g.priority_weight, 0);
      if (totalPriority > 0) {
        const priorityRatio = goal.priority_weight / totalPriority;
        allocation = remainingIncome * priorityRatio * 0.5; // Use 50% of remaining for flexibility
      }
    }
    
    if (allocation > 0) {
      allocations.push({
        goalId: goal.id,
        goalName: goal.name,
        amount: allocation,
        type: 'goal',
        future: true // Mark as future goal for UI distinction
      });
      remainingIncome -= allocation;
    }
  }
  
  return {
    grossIncome: incomeAmount,
    netIncome,
    allocations,
    freeSpend: Math.max(0, remainingIncome),
    totalAllocated: netIncome - remainingIncome
  };
});

// V2: Deviation Detection
ipcMain.handle('detect-deviations', async (_, year: number, month: number) => {
  // Get all goals
  const goals = queryGoals();
  const transactions = queryTransactions();
  
  // Filter transactions for the specified month/year
  const monthStart = new Date(year, month - 1, 1).toISOString();
  const monthEnd = new Date(year, month, 0, 23, 59, 59).toISOString();
  
  const monthTransactions = transactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate >= new Date(monthStart) && txDate <= new Date(monthEnd);
  });
  
  const database = getDatabase();
  const acknowledgedDeviations = database.acknowledged_deviations || [];
  
  const deviations: any[] = [];
  
  // Check each goal for deviations
  for (const goal of goals) {
    // Skip if goal hasn't started yet
    const startDate = goal.start_date ? new Date(goal.start_date) : new Date();
    const monthDate = new Date(year, month - 1, 1);
    if (startDate > monthDate) continue;
    
    const plannedAmount = goal.monthly_contribution || 0;
    if (plannedAmount === 0) continue; // No planned amount, skip
    
    // Calculate actual contributions for this goal in this month
    const goalTransactions = monthTransactions.filter(t => 
      t.goal_id === goal.id && 
      (t.transaction_type === 'allocation' || t.transaction_type === 'income')
    );
    
    const actualAmount = goalTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Check if this deviation is already acknowledged
    const isAcknowledged = acknowledgedDeviations.some(
      ad => ad.goalId === goal.id && ad.year === year && ad.month === month
    );
    
    // Detect deviations
    if (actualAmount < plannedAmount) {
      const shortfall = plannedAmount - actualAmount;
      let deviationType: string;
      
      if (actualAmount === 0) {
        deviationType = 'missed_contribution';
      } else {
        deviationType = 'under_contribution';
      }
      
      deviations.push({
        goalId: goal.id,
        goalName: goal.name,
        type: deviationType,
        date: monthStart,
        plannedAmount,
        actualAmount,
        shortfall,
        acknowledged: isAcknowledged,
      });
    }
  }
  
  return deviations;
});

// Acknowledge a deviation
ipcMain.handle('acknowledge-deviation', async (_, goalId: number, year: number, month: number) => {
  const database = getDatabase();
  if (!database.acknowledged_deviations) {
    database.acknowledged_deviations = [];
  }
  
  // Check if already acknowledged
  const existing = database.acknowledged_deviations.find(
    d => d.goalId === goalId && d.year === year && d.month === month
  );
  
  if (!existing) {
    database.acknowledged_deviations.push({
      goalId,
      year,
      month,
      acknowledgedAt: new Date().toISOString(),
    });
    saveDatabaseToDisk();
  }
});

// V2: Categories
ipcMain.handle('get-categories', async () => {
  return queryCategories();
});

ipcMain.handle('create-category', async (_, category) => {
  return insertCategory({
    name: category.name,
    icon: category.icon || null,
    color: category.color || null,
  });
});

ipcMain.handle('update-category', async (_, id, category) => {
  updateCategory(id, {
    name: category.name,
    icon: category.icon || null,
    color: category.color || null,
  });
});

ipcMain.handle('delete-category', async (_, id) => {
  deleteCategory(id);
});

// V2: Budgets
ipcMain.handle('get-budgets', async (_, year?: number, month?: number) => {
  return queryBudgets(year, month);
});

ipcMain.handle('create-budget', async (_, budget) => {
  return insertBudget({
    category_id: budget.categoryId,
    monthly_limit: budget.monthlyLimit,
    warning_threshold: budget.warningThreshold || 80,
    is_hard_limit: budget.isHardLimit || false,
    year: budget.year,
    month: budget.month,
  });
});

ipcMain.handle('update-budget', async (_, id, budget) => {
  updateBudget(id, {
    category_id: budget.categoryId,
    monthly_limit: budget.monthlyLimit,
    warning_threshold: budget.warningThreshold,
    is_hard_limit: budget.isHardLimit,
    year: budget.year,
    month: budget.month,
  });
});

ipcMain.handle('delete-budget', async (_, id) => {
  deleteBudget(id);
});

// V2: Spending alerts
ipcMain.handle('get-spending-alerts', async (_, year?: number, month?: number) => {
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || (now.getMonth() + 1);
  
  const budgets = queryBudgets(targetYear, targetMonth);
  const transactions = queryTransactions();
  const categories = queryCategories();
  
  // Filter transactions for the target month
  const monthStart = new Date(targetYear, targetMonth - 1, 1);
  const monthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);
  
  const monthTransactions = transactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate >= monthStart && txDate <= monthEnd && t.transaction_type === 'expense' && t.category_id;
  });
  
  const alerts: any[] = [];
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const daysElapsed = Math.min(now.getDate(), daysInMonth);
  const daysRemaining = daysInMonth - daysElapsed;
  
  for (const budget of budgets) {
    const category = categories.find(c => c.id === budget.category_id);
    if (!category) continue;
    
    const categorySpending = monthTransactions
      .filter(t => t.category_id === budget.category_id)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const percentageUsed = (categorySpending / budget.monthly_limit) * 100;
    
    let alertType: 'warning' | 'limit_reached' | 'overspent' | null = null;
    
    if (categorySpending > budget.monthly_limit) {
      alertType = 'overspent';
    } else if (categorySpending >= budget.monthly_limit) {
      alertType = 'limit_reached';
    } else if (percentageUsed >= budget.warning_threshold) {
      alertType = 'warning';
    }
    
    if (alertType) {
      alerts.push({
        categoryId: budget.category_id,
        categoryName: category.name,
        currentSpending: categorySpending,
        budgetLimit: budget.monthly_limit,
        percentageUsed: Math.round(percentageUsed * 100) / 100,
        alertType,
        daysRemaining,
        isHardLimit: budget.is_hard_limit,
      });
    }
  }
  
  return alerts;
});

// V2: Time-based spending views
ipcMain.handle('get-spending-period', async (_, period: 'weekly' | 'monthly', year?: number, month?: number, weekStart?: string) => {
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || (now.getMonth() + 1);
  
  let startDate: Date;
  let endDate: Date;
  
  if (period === 'weekly') {
    if (weekStart) {
      startDate = new Date(weekStart);
    } else {
      // Default to current week (Monday to Sunday)
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
      startDate = new Date(now.setDate(diff));
    }
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Monthly
    startDate = new Date(targetYear, targetMonth - 1, 1);
    endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
  }
  
  const transactions = queryTransactions();
  const categories = queryCategories();
  
  const periodTransactions = transactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate >= startDate && txDate <= endDate && t.transaction_type === 'expense' && t.category_id;
  });
  
  const totalSpending = periodTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Group by category
  const categoryMap = new Map<number, number>();
  for (const tx of periodTransactions) {
    if (tx.category_id) {
      categoryMap.set(tx.category_id, (categoryMap.get(tx.category_id) || 0) + tx.amount);
    }
  }
  
  const byCategory = Array.from(categoryMap.entries()).map(([categoryId, amount]) => {
    const category = categories.find(c => c.id === categoryId);
    return {
      categoryId,
      categoryName: category?.name || 'Unknown',
      amount,
      percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0,
    };
  }).sort((a, b) => b.amount - a.amount);
  
  return {
    period,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalSpending,
    byCategory,
  };
});

// V2: Allocation rules
ipcMain.handle('get-allocation-rules', async () => {
  return queryAllocationRules();
});

ipcMain.handle('create-allocation-rule', async (_, rule) => {
  return insertAllocationRule({
    name: rule.name,
    condition: rule.condition,
    condition_value: rule.conditionValue || null,
    action: rule.action,
    action_value: rule.actionValue || null,
    target_category_id: rule.targetCategoryId || null,
    is_active: rule.isActive !== false,
  });
});

ipcMain.handle('update-allocation-rule', async (_, id, rule) => {
  updateAllocationRule(id, {
    name: rule.name,
    condition: rule.condition,
    condition_value: rule.conditionValue || null,
    action: rule.action,
    action_value: rule.actionValue || null,
    target_category_id: rule.targetCategoryId || null,
    is_active: rule.isActive,
  });
});

ipcMain.handle('delete-allocation-rule', async (_, id) => {
  deleteAllocationRule(id);
});
