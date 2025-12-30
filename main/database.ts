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
  is_emergency_fund?: boolean; // V2: Explicit emergency fund flag (first priority until filled)
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
  category_id: number | null; // V2: Category for expenses
  amount: number;
  transaction_type: string;
  description: string | null;
  date: string;
  // V2: Deviation tracking fields
  deviation_type?: string | null;
  planned_amount?: number | null;
  actual_amount?: number | null;
  acknowledged?: boolean;
  acknowledged_at?: string | null;
}

// V2: Category system
interface Category {
  id: number;
  name: string;
  icon?: string | null;
  color?: string | null;
  created_at: string;
  updated_at: string;
}

// V2: Budget system
interface Budget {
  id: number;
  category_id: number;
  monthly_limit: number;
  warning_threshold: number; // Percentage (0-100)
  is_hard_limit: boolean;
  year: number;
  month: number; // 1-12
  created_at: string;
  updated_at: string;
}

// V2: Allocation rules
interface AllocationRule {
  id: number;
  name: string;
  condition: string; // 'income_increase' | 'income_decrease' | 'rent_threshold' | 'savings_rate'
  condition_value?: number | null;
  action: string; // 'raise_savings' | 'adjust_category' | 'flag_risk'
  action_value?: number | null;
  target_category_id?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// V2: Flex Events
interface FlexEvent {
  id: number;
  date: string;
  reason: string;
  amount: number;
  affected_goals: number[]; // JSON array of goal IDs
  rebalancing_plan: string; // JSON string of RebalancingPlan
  acknowledged: boolean;
  created_at: string;
  updated_at: string;
}

interface Database {
  goals: Goal[];
  income_scenarios: IncomeScenario[];
  transactions: Transaction[];
  nextGoalId: number;
  nextScenarioId: number;
  nextTransactionId: number;
  // V2: Store acknowledged deviations (goalId, year, month combinations)
  acknowledged_deviations?: Array<{
    goalId: number;
    year: number;
    month: number;
    acknowledgedAt: string;
  }>;
  // V2: Categories and budgets
  categories?: Category[];
  budgets?: Budget[];
  allocation_rules?: AllocationRule[];
  flex_events?: FlexEvent[];
  chat_messages?: ChatMessage[];
  nextCategoryId?: number;
  nextBudgetId?: number;
  nextRuleId?: number;
  nextFlexEventId?: number;
}

// V3: Chat messages for LLM forecasting
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  created_at: string;
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
  if (!database.acknowledged_deviations) database.acknowledged_deviations = [];
  if (!database.categories) database.categories = [];
  if (!database.budgets) database.budgets = [];
  if (!database.allocation_rules) database.allocation_rules = [];
  if (!database.flex_events) database.flex_events = [];
  if (!database.chat_messages) database.chat_messages = [];
  if (!database.nextCategoryId) database.nextCategoryId = 1;
  if (!database.nextBudgetId) database.nextBudgetId = 1;
  if (!database.nextRuleId) database.nextRuleId = 1;
  if (!database.nextFlexEventId) database.nextFlexEventId = 1;
  
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
    acknowledged_deviations: [],
    categories: [],
    budgets: [],
    allocation_rules: [],
    flex_events: [],
    chat_messages: [],
    nextCategoryId: 1,
    nextBudgetId: 1,
    nextRuleId: 1,
    nextFlexEventId: 1,
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

export function updateTransaction(id: number, updates: Partial<Transaction>): void {
  const database = getDatabase();
  const transaction = database.transactions.find(t => t.id === id);
  if (transaction) {
    Object.assign(transaction, updates);
    saveDatabase();
  }
}

export function deleteTransaction(id: number): void {
  const database = getDatabase();
  database.transactions = database.transactions.filter(t => t.id !== id);
  saveDatabase();
}

export function findIncomeScenarioById(id: number): IncomeScenario | null {
  const database = getDatabase();
  return database.income_scenarios.find(s => s.id === id) || null;
}

// V2: Category functions
export function queryCategories(): Category[] {
  const database = getDatabase();
  return [...(database.categories || [])].sort((a, b) => a.name.localeCompare(b.name));
}

export function insertCategory(category: Omit<Category, 'id' | 'created_at' | 'updated_at'>): number {
  const database = getDatabase();
  if (!database.categories) database.categories = [];
  if (!database.nextCategoryId) database.nextCategoryId = 1;
  
  const newCategory: Category = {
    ...category,
    id: database.nextCategoryId++,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  database.categories.push(newCategory);
  saveDatabase();
  return newCategory.id;
}

export function updateCategory(id: number, updates: Partial<Category>): void {
  const database = getDatabase();
  const category = database.categories?.find(c => c.id === id);
  if (category) {
    Object.assign(category, updates, { updated_at: new Date().toISOString() });
    saveDatabase();
  }
}

export function deleteCategory(id: number): void {
  const database = getDatabase();
  if (database.categories) {
    database.categories = database.categories.filter(c => c.id !== id);
    saveDatabase();
  }
}

// V2: Budget functions
export function queryBudgets(year?: number, month?: number): Budget[] {
  const database = getDatabase();
  let budgets = [...(database.budgets || [])];
  
  if (year !== undefined) {
    budgets = budgets.filter(b => b.year === year);
  }
  if (month !== undefined) {
    budgets = budgets.filter(b => b.month === month);
  }
  
  return budgets.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    return a.category_id - b.category_id;
  });
}

export function insertBudget(budget: Omit<Budget, 'id' | 'created_at' | 'updated_at'>): number {
  const database = getDatabase();
  if (!database.budgets) database.budgets = [];
  if (!database.nextBudgetId) database.nextBudgetId = 1;
  
  const newBudget: Budget = {
    ...budget,
    id: database.nextBudgetId++,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  database.budgets.push(newBudget);
  saveDatabase();
  return newBudget.id;
}

export function updateBudget(id: number, updates: Partial<Budget>): void {
  const database = getDatabase();
  const budget = database.budgets?.find(b => b.id === id);
  if (budget) {
    Object.assign(budget, updates, { updated_at: new Date().toISOString() });
    saveDatabase();
  }
}

export function deleteBudget(id: number): void {
  const database = getDatabase();
  if (database.budgets) {
    database.budgets = database.budgets.filter(b => b.id !== id);
    saveDatabase();
  }
}

// V2: Allocation rule functions
export function queryAllocationRules(): AllocationRule[] {
  const database = getDatabase();
  return [...(database.allocation_rules || [])].sort((a, b) => a.name.localeCompare(b.name));
}

export function insertAllocationRule(rule: Omit<AllocationRule, 'id' | 'created_at' | 'updated_at'>): number {
  const database = getDatabase();
  if (!database.allocation_rules) database.allocation_rules = [];
  if (!database.nextRuleId) database.nextRuleId = 1;
  
  const newRule: AllocationRule = {
    ...rule,
    id: database.nextRuleId++,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  database.allocation_rules.push(newRule);
  saveDatabase();
  return newRule.id;
}

export function updateAllocationRule(id: number, updates: Partial<AllocationRule>): void {
  const database = getDatabase();
  const rule = database.allocation_rules?.find(r => r.id === id);
  if (rule) {
    Object.assign(rule, updates, { updated_at: new Date().toISOString() });
    saveDatabase();
  }
}

export function deleteAllocationRule(id: number): void {
  const database = getDatabase();
  if (database.allocation_rules) {
    database.allocation_rules = database.allocation_rules.filter(r => r.id !== id);
    saveDatabase();
  }
}

// V2: Flex Event functions
export function queryFlexEvents(): FlexEvent[] {
  const database = getDatabase();
  return [...(database.flex_events || [])].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function insertFlexEvent(flexEvent: Omit<FlexEvent, 'id' | 'created_at' | 'updated_at'>): number {
  const database = getDatabase();
  if (!database.flex_events) database.flex_events = [];
  if (!database.nextFlexEventId) database.nextFlexEventId = 1;
  
  const newFlexEvent: FlexEvent = {
    ...flexEvent,
    id: database.nextFlexEventId++,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  database.flex_events.push(newFlexEvent);
  saveDatabase();
  return newFlexEvent.id;
}

export function updateFlexEvent(id: number, updates: Partial<FlexEvent>): void {
  const database = getDatabase();
  const flexEvent = database.flex_events?.find(f => f.id === id);
  if (flexEvent) {
    Object.assign(flexEvent, updates, { updated_at: new Date().toISOString() });
    saveDatabase();
  }
}

export function deleteFlexEvent(id: number): void {
  const database = getDatabase();
  if (database.flex_events) {
    database.flex_events = database.flex_events.filter(f => f.id !== id);
    saveDatabase();
  }
}

// V3: Chat messages functions
export function queryChatMessages(): ChatMessage[] {
  const database = getDatabase();
  return [...(database.chat_messages || [])].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export function insertChatMessage(message: Omit<ChatMessage, 'id' | 'created_at'>): string {
  const database = getDatabase();
  if (!database.chat_messages) database.chat_messages = [];
  
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newMessage: ChatMessage = {
    ...message,
    id,
    created_at: new Date().toISOString(),
  };
  database.chat_messages.push(newMessage);
  saveDatabase();
  return id;
}

export function deleteChatMessage(id: string): void {
  const database = getDatabase();
  if (database.chat_messages) {
    database.chat_messages = database.chat_messages.filter(m => m.id !== id);
    saveDatabase();
  }
}

export function clearChatMessages(): void {
  const database = getDatabase();
  database.chat_messages = [];
  saveDatabase();
}
