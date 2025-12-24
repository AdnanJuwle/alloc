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
  // V2: Deviation tracking fields
  deviationType?: 'missed_contribution' | 'under_contribution' | 'overspend' | 'income_drop' | 'flex_event';
  plannedAmount?: number;      // What was planned for this period
  actualAmount?: number;        // What actually happened (same as amount, but explicit for clarity)
  acknowledged?: boolean;       // User acknowledged this deviation
  acknowledgedAt?: string;      // When deviation was acknowledged
}

export interface Allocation {
  goalId: number;
  goalName: string;
  amount: number;
  type: 'emergency' | 'goal';
  future?: boolean; // V2: Indicates if this is a future goal (hasn't started yet)
}

export interface AutoSplitResult {
  grossIncome: number;
  netIncome: number;
  allocations: Allocation[];
  freeSpend: number;
  totalAllocated: number;
}

