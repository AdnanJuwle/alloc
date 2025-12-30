import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  getGoals: () => ipcRenderer.invoke('get-goals'),
  createGoal: (goal: any) => ipcRenderer.invoke('create-goal', goal),
  updateGoal: (id: number, goal: any) => ipcRenderer.invoke('update-goal', id, goal),
  deleteGoal: (id: number) => ipcRenderer.invoke('delete-goal', id),
  
  getIncomeScenarios: () => ipcRenderer.invoke('get-income-scenarios'),
  createIncomeScenario: (scenario: any) => ipcRenderer.invoke('create-income-scenario', scenario),
  updateIncomeScenario: (id: number, scenario: any) => ipcRenderer.invoke('update-income-scenario', id, scenario),
  deleteIncomeScenario: (id: number) => ipcRenderer.invoke('delete-income-scenario', id),
  
  getTransactions: () => ipcRenderer.invoke('get-transactions'),
  createTransaction: (transaction: any) => ipcRenderer.invoke('create-transaction', transaction),
  
  calculateAutoSplit: (incomeAmount: number, scenarioId?: number) => 
    ipcRenderer.invoke('calculate-auto-split', incomeAmount, scenarioId),
  
  // V2: Deviation tracking
  detectDeviations: (year: number, month: number) => ipcRenderer.invoke('detect-deviations', year, month),
  acknowledgeDeviation: (goalId: number, year: number, month: number) => ipcRenderer.invoke('acknowledge-deviation', goalId, year, month),
  
  // V2: Categories
  getCategories: () => ipcRenderer.invoke('get-categories'),
  createCategory: (category: any) => ipcRenderer.invoke('create-category', category),
  updateCategory: (id: number, category: any) => ipcRenderer.invoke('update-category', id, category),
  deleteCategory: (id: number) => ipcRenderer.invoke('delete-category', id),
  
  // V2: Budgets
  getBudgets: (year?: number, month?: number) => ipcRenderer.invoke('get-budgets', year, month),
  createBudget: (budget: any) => ipcRenderer.invoke('create-budget', budget),
  updateBudget: (id: number, budget: any) => ipcRenderer.invoke('update-budget', id, budget),
  deleteBudget: (id: number) => ipcRenderer.invoke('delete-budget', id),
  
  // V2: Spending alerts
  getSpendingAlerts: (year?: number, month?: number) => ipcRenderer.invoke('get-spending-alerts', year, month),
  
  // V2: Time-based views
  getSpendingPeriod: (period: 'weekly' | 'monthly', year?: number, month?: number, weekStart?: string) => 
    ipcRenderer.invoke('get-spending-period', period, year, month, weekStart),
  
  // V2: Allocation rules
  getAllocationRules: () => ipcRenderer.invoke('get-allocation-rules'),
  createAllocationRule: (rule: any) => ipcRenderer.invoke('create-allocation-rule', rule),
  updateAllocationRule: (id: number, rule: any) => ipcRenderer.invoke('update-allocation-rule', id, rule),
  deleteAllocationRule: (id: number) => ipcRenderer.invoke('delete-allocation-rule', id),
  
  // V2: Consequence projection
  calculateConsequence: (goalId: number, shortfall: number, year: number, month: number) => 
    ipcRenderer.invoke('calculate-consequence', goalId, shortfall, year, month),
  
  // V2: Flex events
  getFlexEvents: () => ipcRenderer.invoke('get-flex-events'),
  createFlexEvent: (flexEvent: any) => ipcRenderer.invoke('create-flex-event', flexEvent),
  updateFlexEvent: (id: number, flexEvent: any) => ipcRenderer.invoke('update-flex-event', id, flexEvent),
  deleteFlexEvent: (id: number) => ipcRenderer.invoke('delete-flex-event', id),
  
  // V2: Plan health
  calculatePlanHealth: () => ipcRenderer.invoke('calculate-plan-health'),
  
  // V3: Forecasting
  forecastBalance: (monthsAhead?: number) => ipcRenderer.invoke('forecast-balance', monthsAhead),
  forecastGoals: () => ipcRenderer.invoke('forecast-goals'),
  
  // V3: Scenario simulation
  simulateScenario: (scenario: any) => ipcRenderer.invoke('simulate-scenario', scenario),
  
  // V3: Spending patterns
  analyzeSpendingPatterns: () => ipcRenderer.invoke('analyze-spending-patterns'),
  
  // V3: Smart suggestions
  getSmartSuggestions: () => ipcRenderer.invoke('get-smart-suggestions'),
});

