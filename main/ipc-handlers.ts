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
    amount: transaction.amount,
    transaction_type: transaction.transactionType,
    description: transaction.description || null,
    date: transaction.date || new Date().toISOString(),
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
  
  // Calculate allocations
  const allocations: any[] = [];
  let remainingIncome = netIncome;
  
  // V2: Emergency fund logic - first priority until filled
  const emergencyFund = goals.find((g: any) => g.is_emergency_fund === true);
  
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
  
  // Allocate to other goals (excluding emergency fund if it was handled)
  const regularGoals = goals.filter((g: any) => !g.is_emergency_fund);
  
  for (const goal of regularGoals) {
    if (remainingIncome <= 0) break;
    
    let allocation = 0;
    if (goal.monthly_contribution && goal.monthly_contribution > 0) {
      // Fixed monthly contribution
      allocation = Math.min(goal.monthly_contribution, remainingIncome);
    } else {
      // Calculate based on priority weight and deadline urgency
      const totalPriority = regularGoals.reduce((sum: number, g: any) => sum + g.priority_weight, 0);
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
  
  return {
    grossIncome: incomeAmount,
    netIncome,
    allocations,
    freeSpend: Math.max(0, remainingIncome),
    totalAllocated: netIncome - remainingIncome
  };
});
