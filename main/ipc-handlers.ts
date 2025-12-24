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
  let scenario = null;
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
  
  // Emergency fund gets first cut (if exists and is high priority)
  const emergencyFund = goals.find((g: any) => g.name.toLowerCase().includes('emergency'));
  if (emergencyFund && emergencyFund.priority_weight >= 8) {
    const emergencyAllocation = Math.min(emergencyFund.monthly_contribution || 0, remainingIncome * 0.1);
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
  
  // High priority goals get fixed amounts or percentages
  for (const goal of goals) {
    if (goal.id === emergencyFund?.id) continue; // Already handled
    
    if (remainingIncome <= 0) break;
    
    let allocation = 0;
    if (goal.monthly_contribution) {
      // Fixed monthly contribution
      allocation = Math.min(goal.monthly_contribution, remainingIncome);
    } else {
      // Calculate based on priority weight and deadline urgency
      const totalPriority = goals.reduce((sum: number, g: any) => sum + g.priority_weight, 0);
      const priorityRatio = goal.priority_weight / totalPriority;
      allocation = remainingIncome * priorityRatio * 0.5; // Use 50% of remaining for flexibility
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
