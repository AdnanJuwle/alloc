import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

interface Goal {
  id: number;
  name: string;
  target_amount: number;
  start_date?: string; // Optional: when to start saving (defaults to today if not set)
  deadline: string;
  priority_weight: number;
  monthly_contribution: number;
  current_amount: number;
  created_at: string;
  updated_at: string;
}

interface IncomeScenario {
  id: number;
  name: string;
  monthly_income: number;
  tax_rate: number;
  fixed_expenses: number;
  scenario_type: string;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: number;
  goal_id: number | null;
  amount: number;
  transaction_type: string;
  description: string | null;
  date: string;
}

interface Database {
  goals: Goal[];
  income_scenarios: IncomeScenario[];
  transactions: Transaction[];
  nextGoalId: number;
  nextScenarioId: number;
  nextTransactionId: number;
}

let db: Database | null = null;
let dbPath: string;

function getDbPath(): string {
  if (!dbPath) {
    const userDataPath = app.getPath('userData');
    dbPath = path.join(userDataPath, 'expense-tracker.json');
  }
  return dbPath;
}

export function initializeDatabase() {
  const filePath = getDbPath();
  
  // Try to load existing database
  let database: Database;
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      database = JSON.parse(data);
    } catch (error) {
      console.error('Error loading database, creating new one:', error);
      database = createEmptyDatabase();
    }
  } else {
    database = createEmptyDatabase();
  }
  
  // Ensure all required fields exist
  if (!database.nextGoalId) database.nextGoalId = 1;
  if (!database.nextScenarioId) database.nextScenarioId = 1;
  if (!database.nextTransactionId) database.nextTransactionId = 1;
  
  db = database;
  saveDatabase();
  return db;
}

function createEmptyDatabase(): Database {
  return {
    goals: [],
    income_scenarios: [],
    transactions: [],
    nextGoalId: 1,
    nextScenarioId: 1,
    nextTransactionId: 1,
  };
}

function saveDatabase() {
  if (!db) return;
  
  try {
    const filePath = getDbPath();
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function saveDatabaseToDisk() {
  saveDatabase();
}

// Helper functions for querying (SQL-like interface)
export function queryGoals(orderBy: string = 'priority_weight DESC, deadline ASC'): Goal[] {
  const database = getDatabase();
  let goals = [...database.goals];
  
  // Simple sorting implementation
  if (orderBy.includes('priority_weight DESC')) {
    goals.sort((a, b) => {
      if (b.priority_weight !== a.priority_weight) {
        return b.priority_weight - a.priority_weight;
      }
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }
  
  return goals;
}

export function insertGoal(goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>): number {
  const database = getDatabase();
  const newGoal: Goal = {
    ...goal,
    id: database.nextGoalId++,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  database.goals.push(newGoal);
  saveDatabase();
  return newGoal.id;
}

export function updateGoal(id: number, updates: Partial<Goal>): void {
  const database = getDatabase();
  const goal = database.goals.find(g => g.id === id);
  if (goal) {
    Object.assign(goal, updates, { updated_at: new Date().toISOString() });
    saveDatabase();
  }
}

export function deleteGoal(id: number): void {
  const database = getDatabase();
  database.goals = database.goals.filter(g => g.id !== id);
  saveDatabase();
}

export function queryIncomeScenarios(orderBy: string = 'scenario_type'): IncomeScenario[] {
  const database = getDatabase();
  return [...database.income_scenarios].sort((a, b) => 
    a.scenario_type.localeCompare(b.scenario_type)
  );
}

export function insertIncomeScenario(scenario: Omit<IncomeScenario, 'id' | 'created_at' | 'updated_at'>): number {
  const database = getDatabase();
  const newScenario: IncomeScenario = {
    ...scenario,
    id: database.nextScenarioId++,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  database.income_scenarios.push(newScenario);
  saveDatabase();
  return newScenario.id;
}

export function updateIncomeScenario(id: number, updates: Partial<IncomeScenario>): void {
  const database = getDatabase();
  const scenario = database.income_scenarios.find(s => s.id === id);
  if (scenario) {
    Object.assign(scenario, updates, { updated_at: new Date().toISOString() });
    saveDatabase();
  }
}

export function deleteIncomeScenario(id: number): void {
  const database = getDatabase();
  database.income_scenarios = database.income_scenarios.filter(s => s.id !== id);
  saveDatabase();
}

export function queryTransactions(orderBy: string = 'date DESC'): Transaction[] {
  const database = getDatabase();
  return [...database.transactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function insertTransaction(transaction: Omit<Transaction, 'id'>): number {
  const database = getDatabase();
  const newTransaction: Transaction = {
    ...transaction,
    id: database.nextTransactionId++,
  };
  database.transactions.push(newTransaction);
  saveDatabase();
  return newTransaction.id;
}

export function findIncomeScenarioById(id: number): IncomeScenario | null {
  const database = getDatabase();
  return database.income_scenarios.find(s => s.id === id) || null;
}
