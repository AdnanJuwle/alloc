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
  queryFlexEvents,
  insertFlexEvent,
  updateFlexEvent,
  deleteFlexEvent,
  queryChatMessages,
  insertChatMessage,
  deleteChatMessage,
  clearChatMessages,
} from './database';
import { getSettings, updateSettings, getLLMForecastInsights, getLLMScenarioAnalysis, getLLMChatResponse, ChatMessage, checkOllamaAvailable } from './llm-service';

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

// V2: Consequence Projection
ipcMain.handle('calculate-consequence', async (_, goalId: number, shortfall: number, year: number, month: number) => {
  const goals = queryGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return null;
  
  const deadline = new Date(goal.deadline);
  const today = new Date();
  const monthStart = new Date(year, month - 1, 1);
  
  // Calculate months remaining from the deviation month
  const monthsFromDeviation = Math.ceil((deadline.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const remainingAmount = goal.target_amount - (goal.current_amount || 0);
  
  // Original required monthly
  const originalRequiredMonthly = monthsFromDeviation > 0 ? remainingAmount / monthsFromDeviation : remainingAmount;
  
  // New required monthly (to catch up)
  const newRequiredMonthly = monthsFromDeviation > 0 
    ? (remainingAmount + shortfall) / monthsFromDeviation 
    : remainingAmount + shortfall;
  
  // Check if catch-up is possible
  const canCatchUp = newRequiredMonthly <= (originalRequiredMonthly * 2); // Allow up to 2x original
  
  // Calculate deadline shift if needed
  let deadlineShiftMonths: number | undefined;
  let projectedDeadline: string | undefined;
  
  if (!canCatchUp && monthsFromDeviation > 0) {
    // Calculate how many months needed at original rate
    const monthsNeeded = Math.ceil((remainingAmount + shortfall) / originalRequiredMonthly);
    deadlineShiftMonths = Math.max(0, monthsNeeded - monthsFromDeviation);
    
    if (deadlineShiftMonths > 0) {
      const newDeadline = new Date(deadline);
      newDeadline.setMonth(newDeadline.getMonth() + deadlineShiftMonths);
      projectedDeadline = newDeadline.toISOString();
    }
  }
  
  // Find affected goals (lower priority goals that might be impacted)
  const affectedGoals = goals
    .filter(g => g.id !== goalId && g.priority_weight < goal.priority_weight)
    .map(g => ({
      goalId: g.id!,
      goalName: g.name,
      impact: 'delayed' as const,
    }));
  
  return {
    goalId,
    goalName: goal.name,
    originalDeadline: goal.deadline,
    projectedDeadline,
    originalRequiredMonthly,
    newRequiredMonthly,
    deadlineShiftMonths,
    impact: {
      newRequiredMonthly,
      deadlineShift: deadlineShiftMonths,
      affectedGoals: affectedGoals.map(ag => ag.goalId),
      totalShortfall: shortfall,
      canCatchUp,
    },
    affectedGoals,
  };
});

// V2: Flex Events
ipcMain.handle('get-flex-events', async () => {
  return queryFlexEvents();
});

ipcMain.handle('create-flex-event', async (_, flexEvent) => {
  return insertFlexEvent({
    date: flexEvent.date,
    reason: flexEvent.reason,
    amount: flexEvent.amount,
    affected_goals: flexEvent.affectedGoals,
    rebalancing_plan: JSON.stringify(flexEvent.rebalancingPlan),
    acknowledged: flexEvent.acknowledged || false,
  });
});

ipcMain.handle('update-flex-event', async (_, id, flexEvent) => {
  updateFlexEvent(id, {
    date: flexEvent.date,
    reason: flexEvent.reason,
    amount: flexEvent.amount,
    affected_goals: flexEvent.affectedGoals,
    rebalancing_plan: typeof flexEvent.rebalancingPlan === 'string' 
      ? flexEvent.rebalancingPlan 
      : JSON.stringify(flexEvent.rebalancingPlan),
    acknowledged: flexEvent.acknowledged,
  });
});

ipcMain.handle('delete-flex-event', async (_, id) => {
  deleteFlexEvent(id);
});

// V2: Plan Health Metrics
ipcMain.handle('calculate-plan-health', async () => {
  const goals = queryGoals();
  const transactions = queryTransactions();
  const incomeScenarios = queryIncomeScenarios();
  const database = getDatabase();
  const acknowledgedDeviations = database.acknowledged_deviations || [];
  
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  
  // Calculate deviation count in last 3 months
  const recentDeviations = acknowledgedDeviations.filter(d => {
    const devDate = new Date(d.year, d.month - 1, 1);
    return devDate >= threeMonthsAgo;
  });
  const deviationCount = recentDeviations.length;
  
  // Calculate allocation efficiency
  const expectedScenario = incomeScenarios.find(s => s.scenario_type === 'expected');
  let allocationEfficiency = 0;
  if (expectedScenario) {
    const netIncome = expectedScenario.monthly_income * (1 - expectedScenario.tax_rate / 100) - expectedScenario.fixed_expenses;
    const totalRequiredMonthly = goals
      .filter(g => {
        if (!g.start_date) return true;
        return new Date(g.start_date) <= now;
      })
      .reduce((sum, g) => {
        const deadline = new Date(g.deadline);
        const monthsRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
        const remaining = g.target_amount - (g.current_amount || 0);
        return sum + (monthsRemaining > 0 ? remaining / monthsRemaining : remaining);
      }, 0);
    
    allocationEfficiency = netIncome > 0 ? Math.min(100, (totalRequiredMonthly / netIncome) * 100) : 0;
  }
  
  // Calculate fragility score (0-100, higher = more fragile)
  let fragilityScore = 0;
  const urgentGoals = goals.filter(g => {
    const deadline = new Date(g.deadline);
    const monthsRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const remaining = g.target_amount - (g.current_amount || 0);
    const requiredMonthly = monthsRemaining > 0 ? remaining / monthsRemaining : remaining;
    return monthsRemaining < 3 && requiredMonthly > 0;
  });
  fragilityScore = Math.min(100, (urgentGoals.length / Math.max(1, goals.length)) * 100);
  
  // Calculate slack months (minimum buffer before any deadline)
  let slackMonths = Infinity;
  for (const goal of goals) {
    const deadline = new Date(goal.deadline);
    const monthsRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const remaining = goal.target_amount - (goal.current_amount || 0);
    if (remaining > 0) {
      const requiredMonthly = monthsRemaining > 0 ? remaining / monthsRemaining : remaining;
      const currentMonthly = goal.monthly_contribution || 0;
      if (currentMonthly > 0 && requiredMonthly > 0) {
        const monthsAtCurrentRate = remaining / currentMonthly;
        const slack = monthsRemaining - monthsAtCurrentRate;
        slackMonths = Math.min(slackMonths, slack);
      }
    }
  }
  if (slackMonths === Infinity) slackMonths = 0;
  
  // Count on-track vs behind goals
  let onTrackGoals = 0;
  let behindGoals = 0;
  
  for (const goal of goals) {
    const deadline = new Date(goal.deadline);
    const monthsRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const remaining = goal.target_amount - (goal.current_amount || 0);
    if (remaining <= 0) {
      onTrackGoals++;
      continue;
    }
    
    const requiredMonthly = monthsRemaining > 0 ? remaining / monthsRemaining : remaining;
    const currentMonthly = goal.monthly_contribution || 0;
    
    if (currentMonthly >= requiredMonthly * 0.9) { // 90% threshold
      onTrackGoals++;
    } else {
      behindGoals++;
    }
  }
  
  // Determine health status
  let healthStatus: 'healthy' | 'warning' | 'critical';
  if (fragilityScore < 30 && deviationCount < 2 && slackMonths > 2) {
    healthStatus = 'healthy';
  } else if (fragilityScore < 60 && deviationCount < 4 && slackMonths > 0) {
    healthStatus = 'warning';
  } else {
    healthStatus = 'critical';
  }
  
  return {
    allocationEfficiency: Math.round(allocationEfficiency * 100) / 100,
    fragilityScore: Math.round(fragilityScore * 100) / 100,
    slackMonths: Math.round(slackMonths * 100) / 100,
    deviationCount,
    onTrackGoals,
    behindGoals,
    healthStatus,
  };
});

// V3: Forecasting
ipcMain.handle('forecast-balance', async (_, monthsAhead: number = 6) => {
  const goals = queryGoals();
  const transactions = queryTransactions();
  const incomeScenarios = queryIncomeScenarios();
  const expectedScenario = incomeScenarios.find(s => s.scenario_type === 'expected');
  
  if (!expectedScenario) {
    return null;
  }
  
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Calculate current balance (sum of all goal current amounts)
  const currentBalance = goals.reduce((sum, g) => sum + (g.current_amount || 0), 0);
  
  // Calculate average monthly income
  const netIncome = expectedScenario.monthly_income * (1 - expectedScenario.tax_rate / 100) - expectedScenario.fixed_expenses;
  
  // Calculate average monthly expenses from last 3 months
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const recentExpenses = transactions.filter(t => {
    if (t.transaction_type !== 'expense') return false;
    const txDate = new Date(t.date);
    return txDate >= threeMonthsAgo;
  });
  const totalExpenses = recentExpenses.reduce((sum, t) => sum + t.amount, 0);
  const averageMonthlyExpenses = totalExpenses / 3;
  
  // Calculate average monthly savings (allocations to goals)
  const recentAllocations = transactions.filter(t => {
    if (t.transaction_type !== 'allocation') return false;
    const txDate = new Date(t.date);
    return txDate >= threeMonthsAgo;
  });
  const totalAllocations = recentAllocations.reduce((sum, t) => sum + t.amount, 0);
  const averageMonthlySavings = totalAllocations / 3;
  
  // Project forward
  const projectedBalance = currentBalance + (netIncome - averageMonthlyExpenses) * monthsAhead;
  const projectedDate = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 0);
  
  // Calculate confidence based on data availability
  const confidence = recentExpenses.length > 5 && recentAllocations.length > 2 ? 85 : 60;
  
  const assumptions = [
    `Income remains at ₹${netIncome.toLocaleString()}/month`,
    `Expenses average ₹${averageMonthlyExpenses.toLocaleString()}/month`,
    `No major unexpected expenses`,
  ];
  
  return {
    currentBalance,
    projectedBalance,
    projectedDate: projectedDate.toISOString(),
    monthlyIncome: netIncome,
    monthlyExpenses: averageMonthlyExpenses,
    monthlySavings: averageMonthlySavings,
    confidence,
    assumptions,
  };
});

ipcMain.handle('forecast-goals', async () => {
  const goals = queryGoals();
  const transactions = queryTransactions();
  const now = new Date();
  
  const forecasts: any[] = [];
  
  for (const goal of goals) {
    const deadline = new Date(goal.deadline);
    const currentAmount = goal.current_amount || 0;
    const remaining = goal.target_amount - currentAmount;
    
    if (remaining <= 0) {
      // Goal already completed
      forecasts.push({
        goalId: goal.id,
        goalName: goal.name,
        currentAmount,
        targetAmount: goal.target_amount,
        projectedCompletionDate: goal.deadline,
        monthsRemaining: 0,
        requiredMonthly: 0,
        currentMonthly: 0,
        onTrack: true,
        confidence: 100,
      });
      continue;
    }
    
    // Calculate average monthly contribution from last 3 months
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const goalTransactions = transactions.filter(t => {
      if (!t.goal_id || t.goal_id !== goal.id) return false;
      if (t.transaction_type !== 'allocation') return false;
      const txDate = new Date(t.date);
      return txDate >= threeMonthsAgo;
    });
    const totalContributions = goalTransactions.reduce((sum, t) => sum + t.amount, 0);
    const currentMonthly = goalTransactions.length > 0 ? totalContributions / 3 : (goal.monthly_contribution || 0);
    
    // Calculate required monthly
    const monthsRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const requiredMonthly = monthsRemaining > 0 ? remaining / monthsRemaining : remaining;
    
    // Project completion date based on current rate
    let projectedCompletionDate: string;
    let projectedMonthsRemaining: number;
    
    if (currentMonthly > 0) {
      projectedMonthsRemaining = Math.ceil(remaining / currentMonthly);
      const projectedDate = new Date(now);
      projectedDate.setMonth(projectedDate.getMonth() + projectedMonthsRemaining);
      projectedCompletionDate = projectedDate.toISOString();
    } else {
      projectedCompletionDate = goal.deadline;
      projectedMonthsRemaining = monthsRemaining;
    }
    
    const onTrack = currentMonthly >= requiredMonthly * 0.9; // 90% threshold
    const confidence = goalTransactions.length > 2 ? 80 : 50;
    
    forecasts.push({
      goalId: goal.id,
      goalName: goal.name,
      currentAmount,
      targetAmount: goal.target_amount,
      projectedCompletionDate,
      monthsRemaining: projectedMonthsRemaining,
      requiredMonthly,
      currentMonthly,
      onTrack,
      confidence,
    });
  }
  
  return forecasts;
});

// V3: Scenario Simulation
ipcMain.handle('simulate-scenario', async (_, scenario: any) => {
  const goals = queryGoals();
  const transactions = queryTransactions();
  const incomeScenarios = queryIncomeScenarios();
  const expectedScenario = incomeScenarios.find(s => s.scenario_type === 'expected');
  
  if (!expectedScenario) {
    return null;
  }
  
  const now = new Date();
  const netIncome = expectedScenario.monthly_income * (1 - expectedScenario.tax_rate / 100) - expectedScenario.fixed_expenses;
  
  // Calculate current monthly expenses
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const recentExpenses = transactions.filter(t => {
    if (t.transaction_type !== 'expense') return false;
    const txDate = new Date(t.date);
    return txDate >= threeMonthsAgo;
  });
  const totalExpenses = recentExpenses.reduce((sum, t) => sum + t.amount, 0);
  const averageMonthlyExpenses = totalExpenses / 3;
  
  let newMonthlyExpenses = averageMonthlyExpenses;
  let newMonthlySavings = 0;
  let affectedGoals: any[] = [];
  
  // Apply scenario
  if (scenario.type === 'purchase') {
    // One-time purchase reduces available savings
    const purchaseAmount = scenario.amount || 0;
    // This would reduce savings for that month, affecting goals
    newMonthlySavings = (netIncome - averageMonthlyExpenses) - (purchaseAmount / scenario.monthsAhead);
  } else if (scenario.type === 'income_change') {
    const changePercent = (scenario.amount || 0) / 100;
    const newNetIncome = netIncome * (1 + changePercent);
    newMonthlySavings = newNetIncome - averageMonthlyExpenses;
  } else if (scenario.type === 'expense_change') {
    const changeAmount = scenario.amount || 0;
    newMonthlyExpenses = averageMonthlyExpenses + changeAmount;
    newMonthlySavings = netIncome - newMonthlyExpenses;
  }
  
  // Calculate impact on goals
  for (const goal of goals) {
    const deadline = new Date(goal.deadline);
    const monthsRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const remaining = goal.target_amount - (goal.current_amount || 0);
    
    if (remaining > 0) {
      const originalRequiredMonthly = monthsRemaining > 0 ? remaining / monthsRemaining : remaining;
      const currentMonthly = goal.monthly_contribution || 0;
      
      // If savings reduced, goals may be delayed
      if (newMonthlySavings < (netIncome - averageMonthlyExpenses)) {
        const reduction = (netIncome - averageMonthlyExpenses) - newMonthlySavings;
        const newRequiredMonthly = Math.max(0, currentMonthly - reduction);
        
        if (newRequiredMonthly < originalRequiredMonthly) {
          const newMonthsNeeded = Math.ceil(remaining / Math.max(newRequiredMonthly, 0.01));
          const completionDateShift = Math.max(0, newMonthsNeeded - monthsRemaining);
          
          affectedGoals.push({
            goalId: goal.id,
            goalName: goal.name,
            completionDateShift,
            newRequiredMonthly: Math.max(originalRequiredMonthly, newRequiredMonthly),
          });
        }
      }
    }
  }
  
  const projectedBalance = (goals.reduce((sum, g) => sum + (g.current_amount || 0), 0)) + 
    (newMonthlySavings * scenario.monthsAhead);
  
  return {
    projectedBalance,
    affectedGoals,
    monthlySavingsChange: newMonthlySavings - (netIncome - averageMonthlyExpenses),
    freeSpendChange: newMonthlySavings - (netIncome - averageMonthlyExpenses),
  };
});

// V3: Spending Pattern Analysis
ipcMain.handle('analyze-spending-patterns', async () => {
  const transactions = queryTransactions();
  const categories = queryCategories();
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  
  // Filter expenses from last 6 months
  const expenses = transactions.filter(t => {
    if (t.transaction_type !== 'expense' || !t.category_id) return false;
    const txDate = new Date(t.date);
    return txDate >= sixMonthsAgo;
  });
  
  // Group by category and month
  const categoryMap = new Map<number, { amounts: number[], descriptions: string[] }>();
  
  for (const expense of expenses) {
    if (!expense.category_id) continue;
    
    if (!categoryMap.has(expense.category_id)) {
      categoryMap.set(expense.category_id, { amounts: [], descriptions: [] });
    }
    
    const data = categoryMap.get(expense.category_id)!;
    data.amounts.push(expense.amount);
    if (expense.description) {
      data.descriptions.push(expense.description);
    }
  }
  
  const patterns: any[] = [];
  
  for (const [categoryId, data] of categoryMap.entries()) {
    if (data.amounts.length < 3) continue; // Need at least 3 transactions
    
    const category = categories.find(c => c.id === categoryId);
    if (!category) continue;
    
    // Calculate average monthly
    const total = data.amounts.reduce((sum, a) => sum + a, 0);
    const averageMonthly = total / 6;
    
    // Calculate trend (simple: compare first half vs second half)
    const firstHalf = data.amounts.slice(0, Math.floor(data.amounts.length / 2));
    const secondHalf = data.amounts.slice(Math.floor(data.amounts.length / 2));
    const firstHalfAvg = firstHalf.reduce((sum, a) => sum + a, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, a) => sum + a, 0) / secondHalf.length;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    let trendPercentage = 0;
    
    if (secondHalfAvg > firstHalfAvg * 1.1) {
      trend = 'increasing';
      trendPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    } else if (secondHalfAvg < firstHalfAvg * 0.9) {
      trend = 'decreasing';
      trendPercentage = ((firstHalfAvg - secondHalfAvg) / firstHalfAvg) * 100;
    }
    
    // Identify recurring leaks (similar amounts/descriptions)
    const recurringLeaks: any[] = [];
    const descriptionCounts = new Map<string, number>();
    for (const desc of data.descriptions) {
      descriptionCounts.set(desc, (descriptionCounts.get(desc) || 0) + 1);
    }
    
    for (const [desc, count] of descriptionCounts.entries()) {
      if (count >= 3) {
        const matchingAmounts = expenses
          .filter(e => e.category_id === categoryId && e.description === desc)
          .map(e => e.amount);
        const avgAmount = matchingAmounts.reduce((sum, a) => sum + a, 0) / matchingAmounts.length;
        recurringLeaks.push({
          description: desc,
          averageAmount: avgAmount,
          frequency: count >= 4 ? 'weekly' : 'monthly',
        });
      }
    }
    
    // Identify wasteful habits (high spending with increasing trend)
    const wastefulHabits: string[] = [];
    if (trend === 'increasing' && averageMonthly > 5000) {
      wastefulHabits.push(`Increasing spending trend (+${trendPercentage.toFixed(1)}%)`);
    }
    if (recurringLeaks.length > 2) {
      wastefulHabits.push('Multiple recurring small expenses');
    }
    
    patterns.push({
      categoryId,
      categoryName: category.name,
      averageMonthly,
      trend,
      trendPercentage: Math.round(trendPercentage * 100) / 100,
      recurringLeaks,
      wastefulHabits,
    });
  }
  
  return patterns;
});

// V3: Smart Suggestions
ipcMain.handle('get-smart-suggestions', async () => {
  const goals = queryGoals();
  const transactions = queryTransactions();
  const budgets = queryBudgets();
  const categories = queryCategories();
  const incomeScenarios = queryIncomeScenarios();
  const expectedScenario = incomeScenarios.find(s => s.scenario_type === 'expected');
  
  if (!expectedScenario) {
    return [];
  }
  
  const now = new Date();
  const suggestions: any[] = [];
  
  // Analyze spending patterns
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const recentExpenses = transactions.filter(t => {
    if (t.transaction_type !== 'expense' || !t.category_id) return false;
    const txDate = new Date(t.date);
    return txDate >= threeMonthsAgo;
  });
  
  // Check for categories exceeding budgets
  for (const budget of budgets) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const monthExpenses = recentExpenses.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= monthStart && txDate <= monthEnd && t.category_id === budget.category_id;
    });
    
    const monthSpending = monthExpenses.reduce((sum, t) => sum + t.amount, 0);
    const category = categories.find(c => c.id === budget.category_id);
    
    if (monthSpending > budget.monthly_limit * 0.8 && category) {
      const potentialSavings = (monthSpending - budget.monthly_limit * 0.8);
      suggestions.push({
        type: 'reduce_category',
        priority: monthSpending > budget.monthly_limit ? 'high' : 'medium',
        title: `Reduce ${category.name} spending`,
        description: `You're spending ₹${monthSpending.toLocaleString()} this month. Reducing to 80% of budget could save ₹${potentialSavings.toLocaleString()}/month.`,
        impact: {
          savingsPotential: potentialSavings,
          categoryId: budget.category_id,
        },
        actionable: true,
      });
    }
  }
  
  // Check for goals that could be accelerated
  for (const goal of goals) {
    const deadline = new Date(goal.deadline);
    const monthsRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const remaining = goal.target_amount - (goal.current_amount || 0);
    
    if (remaining > 0 && monthsRemaining > 3) {
      const requiredMonthly = monthsRemaining > 0 ? remaining / monthsRemaining : remaining;
      const currentMonthly = goal.monthly_contribution || 0;
      
      if (currentMonthly < requiredMonthly * 0.9) {
        const increaseNeeded = requiredMonthly - currentMonthly;
        suggestions.push({
          type: 'increase_savings',
          priority: 'high',
          title: `Increase savings for ${goal.name}`,
          description: `You need ₹${requiredMonthly.toLocaleString()}/month but currently saving ₹${currentMonthly.toLocaleString()}/month. Increase by ₹${increaseNeeded.toLocaleString()}/month to stay on track.`,
          impact: {
            goalId: goal.id,
            goalAcceleration: 0,
          },
          actionable: true,
        });
      }
    }
  }
  
  return suggestions;
});

// V3: LLM-Enhanced Forecasting
ipcMain.handle('get-llm-forecast-insights', async (_, monthsAhead: number = 6) => {
  const goals = queryGoals();
  const transactions = queryTransactions();
  const incomeScenarios = queryIncomeScenarios();
  const categories = queryCategories();
  const expectedScenario = incomeScenarios.find(s => s.scenario_type === 'expected');
  
  if (!expectedScenario) {
    return null;
  }
  
  const now = new Date();
  const currentBalance = goals.reduce((sum, g) => sum + (g.current_amount || 0), 0);
  const netIncome = expectedScenario.monthly_income * (1 - expectedScenario.tax_rate / 100) - expectedScenario.fixed_expenses;
  
  // Calculate average monthly expenses
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const recentExpenses = transactions.filter(t => {
    if (t.transaction_type !== 'expense') return false;
    const txDate = new Date(t.date);
    return txDate >= threeMonthsAgo;
  });
  const totalExpenses = recentExpenses.reduce((sum, t) => sum + t.amount, 0);
  const averageMonthlyExpenses = totalExpenses / 3;
  const averageMonthlySavings = netIncome - averageMonthlyExpenses;
  
  // Get goal forecasts
  const goalForecasts: any[] = [];
  for (const goal of goals) {
    const deadline = new Date(goal.deadline);
    const monthsRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const remaining = goal.target_amount - (goal.current_amount || 0);
    const requiredMonthly = monthsRemaining > 0 ? remaining / monthsRemaining : remaining;
    
    const goalTransactions = transactions.filter(t => {
      if (!t.goal_id || t.goal_id !== goal.id) return false;
      if (t.transaction_type !== 'allocation') return false;
      const txDate = new Date(t.date);
      return txDate >= threeMonthsAgo;
    });
    const totalContributions = goalTransactions.reduce((sum, t) => sum + t.amount, 0);
    const currentMonthly = goalTransactions.length > 0 ? totalContributions / 3 : (goal.monthly_contribution || 0);
    
    goalForecasts.push({
      name: goal.name,
      currentAmount: goal.current_amount || 0,
      targetAmount: goal.target_amount,
      deadline: goal.deadline,
      requiredMonthly,
      currentMonthly,
    });
  }
  
  // Get spending patterns
  const spendingPatterns: any[] = [];
  const categoryMap = new Map<number, number[]>();
  for (const expense of recentExpenses) {
    if (expense.category_id) {
      if (!categoryMap.has(expense.category_id)) {
        categoryMap.set(expense.category_id, []);
      }
      categoryMap.get(expense.category_id)!.push(expense.amount);
    }
  }
  
  for (const [categoryId, amounts] of categoryMap.entries()) {
    const category = categories.find(c => c.id === categoryId);
    if (!category || amounts.length < 3) continue;
    
    const averageMonthly = amounts.reduce((sum, a) => sum + a, 0) / 3;
    const firstHalf = amounts.slice(0, Math.floor(amounts.length / 2));
    const secondHalf = amounts.slice(Math.floor(amounts.length / 2));
    const firstHalfAvg = firstHalf.reduce((sum, a) => sum + a, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, a) => sum + a, 0) / secondHalf.length;
    
    let trend = 'stable';
    if (secondHalfAvg > firstHalfAvg * 1.1) trend = 'increasing';
    else if (secondHalfAvg < firstHalfAvg * 0.9) trend = 'decreasing';
    
    spendingPatterns.push({
      categoryName: category.name,
      averageMonthly,
      trend,
    });
  }
  
  const financialData = {
    currentBalance,
    monthlyIncome: netIncome,
    monthlyExpenses: averageMonthlyExpenses,
    monthlySavings: averageMonthlySavings,
    goals: goalForecasts,
    spendingPatterns,
    monthsAhead,
  };
  
  return await getLLMForecastInsights(financialData);
});

ipcMain.handle('get-llm-scenario-analysis', async (_, scenario: any) => {
  return await getLLMScenarioAnalysis(scenario);
});

// Settings Management
ipcMain.handle('get-settings', async () => {
  return getSettings();
});

ipcMain.handle('update-settings', async (_, updates: any) => {
  updateSettings(updates);
  return getSettings();
});

ipcMain.handle('check-ollama', async () => {
  const settings = getSettings();
  const url = settings.ollamaUrl || 'http://localhost:11434';
  return await checkOllamaAvailable(url);
});

// Chat Messages Management
ipcMain.handle('get-chat-messages', async () => {
  return queryChatMessages();
});

ipcMain.handle('save-chat-message', async (_, message) => {
  return insertChatMessage({
    role: message.role,
    content: message.content,
    timestamp: message.timestamp || new Date().toISOString(),
  });
});

ipcMain.handle('delete-chat-message', async (_, id) => {
  deleteChatMessage(id);
});

ipcMain.handle('clear-chat-messages', async () => {
  clearChatMessages();
});

// V3: LLM Chat-based Forecasting
ipcMain.handle('llm-chat', async (_, messages: ChatMessage[]) => {
  const goals = queryGoals();
  const transactions = queryTransactions();
  const incomeScenarios = queryIncomeScenarios();
  const categories = queryCategories();
  const budgets = queryBudgets();
  const expectedScenario = incomeScenarios.find(s => s.scenario_type === 'expected');
  
  if (!expectedScenario) {
    return { error: 'Please configure an expected income scenario first.' };
  }
  
  const now = new Date();
  const currentBalance = goals.reduce((sum, g) => sum + (g.current_amount || 0), 0);
  const netIncome = expectedScenario.monthly_income * (1 - expectedScenario.tax_rate / 100) - expectedScenario.fixed_expenses;
  
  // Calculate average monthly expenses
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const recentExpenses = transactions.filter(t => {
    if (t.transaction_type !== 'expense') return false;
    const txDate = new Date(t.date);
    return txDate >= threeMonthsAgo;
  });
  const totalExpenses = recentExpenses.reduce((sum, t) => sum + t.amount, 0);
  const averageMonthlyExpenses = totalExpenses / 3;
  const averageMonthlySavings = netIncome - averageMonthlyExpenses;
  
  // Get goal forecasts
  const goalForecasts: any[] = [];
  for (const goal of goals) {
    const deadline = new Date(goal.deadline);
    const monthsRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const remaining = goal.target_amount - (goal.current_amount || 0);
    const requiredMonthly = monthsRemaining > 0 ? remaining / monthsRemaining : remaining;
    
    const goalTransactions = transactions.filter(t => {
      if (!t.goal_id || t.goal_id !== goal.id) return false;
      if (t.transaction_type !== 'allocation') return false;
      const txDate = new Date(t.date);
      return txDate >= threeMonthsAgo;
    });
    const totalContributions = goalTransactions.reduce((sum, t) => sum + t.amount, 0);
    const currentMonthly = goalTransactions.length > 0 ? totalContributions / 3 : (goal.monthly_contribution || 0);
    
    goalForecasts.push({
      name: goal.name,
      currentAmount: goal.current_amount || 0,
      targetAmount: goal.target_amount,
      deadline: goal.deadline,
      requiredMonthly,
      currentMonthly,
      onTrack: currentMonthly >= requiredMonthly * 0.9,
    });
  }
  
  // Get spending patterns
  const spendingPatterns: any[] = [];
  const categoryMap = new Map<number, number[]>();
  for (const expense of recentExpenses) {
    if (expense.category_id) {
      if (!categoryMap.has(expense.category_id)) {
        categoryMap.set(expense.category_id, []);
      }
      categoryMap.get(expense.category_id)!.push(expense.amount);
    }
  }
  
  for (const [categoryId, amounts] of categoryMap.entries()) {
    const category = categories.find(c => c.id === categoryId);
    if (!category || amounts.length < 3) continue;
    
    const averageMonthly = amounts.reduce((sum, a) => sum + a, 0) / 3;
    const firstHalf = amounts.slice(0, Math.floor(amounts.length / 2));
    const secondHalf = amounts.slice(Math.floor(amounts.length / 2));
    const firstHalfAvg = firstHalf.reduce((sum, a) => sum + a, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, a) => sum + a, 0) / secondHalf.length;
    
    let trend = 'stable';
    let trendPercentage = 0;
    if (secondHalfAvg > firstHalfAvg * 1.1) {
      trend = 'increasing';
      trendPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    } else if (secondHalfAvg < firstHalfAvg * 0.9) {
      trend = 'decreasing';
      trendPercentage = ((firstHalfAvg - secondHalfAvg) / firstHalfAvg) * 100;
    }
    
    spendingPatterns.push({
      categoryName: category.name,
      averageMonthly,
      trend,
      trendPercentage: Math.round(trendPercentage * 100) / 100,
    });
  }
  
  // Get recent transactions
  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .map(t => ({
      type: t.transaction_type,
      amount: t.amount,
      description: t.description || 'No description',
      date: t.date,
      categoryName: t.category_id ? categories.find(c => c.id === t.category_id)?.name : undefined,
    }));
  
  // Get budget status
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const monthExpenses = transactions.filter(t => {
    if (t.transaction_type !== 'expense' || !t.category_id) return false;
    const txDate = new Date(t.date);
    return txDate >= currentMonth && txDate <= monthEnd;
  });
  
  const budgetStatus = budgets.map(budget => {
    const category = categories.find(c => c.id === budget.category_id);
    const spending = monthExpenses
      .filter(t => t.category_id === budget.category_id)
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      categoryId: budget.category_id,
      categoryName: category?.name || 'Unknown',
      monthlyLimit: budget.monthly_limit,
      currentSpending: spending,
      percentageUsed: (spending / budget.monthly_limit) * 100,
    };
  });
  
  const financialContext = {
    currentBalance,
    monthlyIncome: netIncome,
    monthlyExpenses: averageMonthlyExpenses,
    monthlySavings: averageMonthlySavings,
    goals: goalForecasts.map(g => ({
      ...g,
      id: goals.find(goal => goal.name === g.name)?.id,
    })),
    spendingPatterns,
    recentTransactions,
    budgets: budgetStatus,
    categories: categories.map(c => ({ id: c.id, name: c.name })),
  };
  
  const response = await getLLMChatResponse(messages, financialContext);
  
  if (!response) {
    return { error: 'Failed to get response from AI. Please check your API key in Settings.' };
  }

  // Execute any actions requested by the LLM
  const actionResults: any[] = [];
  if (response.actions) {
    for (const action of response.actions) {
      try {
        if (action.type === 'create_transaction') {
          const transactionData = action.data;
          const transactionId = insertTransaction({
            goal_id: transactionData.goalId || null,
            category_id: transactionData.categoryId || null,
            amount: transactionData.amount,
            transaction_type: transactionData.transactionType,
            description: transactionData.description || null,
            date: transactionData.date || new Date().toISOString(),
            deviation_type: null,
            planned_amount: null,
            actual_amount: transactionData.amount,
            acknowledged: false,
            acknowledged_at: null,
          });
          actionResults.push({
            type: 'create_transaction',
            success: true,
            id: transactionId,
            message: `Transaction created successfully (ID: ${transactionId})`,
          });
        } else if (action.type === 'create_goal') {
          const goalData = action.data;
          const goalId = insertGoal({
            name: goalData.name,
            target_amount: goalData.targetAmount,
            start_date: goalData.startDate || undefined,
            deadline: goalData.deadline,
            priority_weight: goalData.priorityWeight || 5,
            monthly_contribution: goalData.monthlyContribution || 0,
            current_amount: goalData.currentAmount || 0,
            is_emergency_fund: goalData.isEmergencyFund || false,
          });
          actionResults.push({
            type: 'create_goal',
            success: true,
            id: goalId,
            message: `Goal "${goalData.name}" created successfully (ID: ${goalId})`,
          });
        } else if (action.type === 'update_goal') {
          if (action.data.id) {
            updateGoal(action.data.id, {
              name: action.data.name,
              target_amount: action.data.targetAmount,
              start_date: action.data.startDate,
              deadline: action.data.deadline,
              priority_weight: action.data.priorityWeight,
              monthly_contribution: action.data.monthlyContribution,
              current_amount: action.data.currentAmount,
              is_emergency_fund: action.data.isEmergencyFund,
            });
            actionResults.push({
              type: 'update_goal',
              success: true,
              id: action.data.id,
              message: `Goal updated successfully`,
            });
          }
        } else if (action.type === 'create_budget') {
          const budgetData = action.data;
          const budgetId = insertBudget({
            category_id: budgetData.categoryId,
            monthly_limit: budgetData.monthlyLimit,
            warning_threshold: budgetData.warningThreshold || 80,
            is_hard_limit: budgetData.isHardLimit || false,
            year: budgetData.year || new Date().getFullYear(),
            month: budgetData.month || new Date().getMonth() + 1,
          });
          actionResults.push({
            type: 'create_budget',
            success: true,
            id: budgetId,
            message: `Budget created successfully (ID: ${budgetId})`,
          });
        }
      } catch (error: any) {
        actionResults.push({
          type: action.type,
          success: false,
          error: error.message || 'Unknown error',
        });
      }
    }
  }
  
  return { 
    content: response.content,
    actions: actionResults.length > 0 ? actionResults : undefined,
  };
});
