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
});

