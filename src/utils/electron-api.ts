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

