// Type definitions for Electron API
export interface ElectronAPI {
  getGoals: () => Promise<any[]>;
  createGoal: (goal: any) => Promise<number>;
  updateGoal: (id: number, goal: any) => Promise<void>;
  deleteGoal: (id: number) => Promise<void>;
  
  getIncomeScenarios: () => Promise<any[]>;
  createIncomeScenario: (scenario: any) => Promise<number>;
  updateIncomeScenario: (id: number, scenario: any) => Promise<void>;
  deleteIncomeScenario: (id: number) => Promise<void>;
  
  getTransactions: () => Promise<any[]>;
  createTransaction: (transaction: any) => Promise<number>;
  
  calculateAutoSplit: (incomeAmount: number, scenarioId?: number) => Promise<any>;
  
  // V2: Deviation tracking
  detectDeviations: (year: number, month: number) => Promise<any[]>;
  acknowledgeDeviation: (goalId: number, year: number, month: number) => Promise<void>;
  
  // V2: Categories
  getCategories: () => Promise<any[]>;
  createCategory: (category: any) => Promise<number>;
  updateCategory: (id: number, category: any) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  
  // V2: Budgets
  getBudgets: (year?: number, month?: number) => Promise<any[]>;
  createBudget: (budget: any) => Promise<number>;
  updateBudget: (id: number, budget: any) => Promise<void>;
  deleteBudget: (id: number) => Promise<void>;
  
  // V2: Spending alerts
  getSpendingAlerts: (year?: number, month?: number) => Promise<any[]>;
  
  // V2: Time-based views
  getSpendingPeriod: (period: 'weekly' | 'monthly', year?: number, month?: number, weekStart?: string) => Promise<any>;
  
  // V2: Allocation rules
  getAllocationRules: () => Promise<any[]>;
  createAllocationRule: (rule: any) => Promise<number>;
  updateAllocationRule: (id: number, rule: any) => Promise<void>;
  deleteAllocationRule: (id: number) => Promise<void>;
  
  // V2: Consequence projection
  calculateConsequence: (goalId: number, shortfall: number, year: number, month: number) => Promise<any>;
  
  // V2: Flex events
  getFlexEvents: () => Promise<any[]>;
  createFlexEvent: (flexEvent: any) => Promise<number>;
  updateFlexEvent: (id: number, flexEvent: any) => Promise<void>;
  deleteFlexEvent: (id: number) => Promise<void>;
  
  // V2: Plan health
  calculatePlanHealth: () => Promise<any>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

if (!window.electronAPI) {
  throw new Error('Electron API not available. Make sure you are running in Electron.');
}

export const electronAPI = window.electronAPI;

