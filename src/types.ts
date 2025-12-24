export interface Goal {
  id?: number;
  name: string;
  targetAmount: number;
  startDate?: string; // Optional: when to start saving (defaults to today if not set)
  deadline: string;
  priorityWeight: number;
  monthlyContribution?: number;
  currentAmount?: number;
  isEmergencyFund?: boolean; // V2: Explicit emergency fund flag (first priority until filled)
  createdAt?: string;
  updatedAt?: string;
}

export interface IncomeScenario {
  id?: number;
  name: string;
  monthlyIncome: number;
  taxRate: number;
  fixedExpenses: number;
  scenarioType: 'conservative' | 'expected' | 'optimistic';
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  id?: number;
  goalId?: number;
  amount: number;
  transactionType: 'income' | 'expense' | 'allocation';
  description?: string;
  date?: string;
}

export interface Allocation {
  goalId: number;
  goalName: string;
  amount: number;
  type: 'emergency' | 'goal';
}

export interface AutoSplitResult {
  grossIncome: number;
  netIncome: number;
  allocations: Allocation[];
  freeSpend: number;
  totalAllocated: number;
}

