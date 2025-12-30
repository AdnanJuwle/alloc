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
  categoryId?: number; // V2: Category for expenses
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

// V2: Category system
export interface Category {
  id?: number;
  name: string;
  icon?: string; // Optional icon identifier
  color?: string; // Optional color for UI
  createdAt?: string;
  updatedAt?: string;
}

// V2: Budget system
export interface Budget {
  id?: number;
  categoryId: number;
  monthlyLimit: number;
  warningThreshold?: number; // Percentage (0-100) at which to show soft warning (default: 80)
  isHardLimit: boolean; // If true, treat as hard limit; if false, soft warning only
  year: number;
  month: number; // 1-12
  createdAt?: string;
  updatedAt?: string;
}

// V2: Spending alert
export interface SpendingAlert {
  categoryId: number;
  categoryName: string;
  currentSpending: number;
  budgetLimit: number;
  percentageUsed: number;
  alertType: 'warning' | 'limit_reached' | 'overspent';
  daysRemaining: number;
}

// V2: Time-based spending view
export interface SpendingPeriod {
  period: 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  totalSpending: number;
  byCategory: Array<{
    categoryId: number;
    categoryName: string;
    amount: number;
    percentage: number;
  }>;
}

// V2: Rule-based logic
export interface AllocationRule {
  id?: number;
  name: string;
  condition: 'income_increase' | 'income_decrease' | 'rent_threshold' | 'savings_rate';
  conditionValue?: number; // Threshold or percentage
  action: 'raise_savings' | 'adjust_category' | 'flag_risk';
  actionValue?: number; // Percentage or amount
  targetCategoryId?: number; // For category-specific actions
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
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

// V2: Deviation Impact and Consequence Projection
export interface DeviationImpact {
  newRequiredMonthly: number;
  deadlineShift?: number; // months
  affectedGoals: number[]; // goal IDs
  totalShortfall: number;
  canCatchUp: boolean; // Whether it's possible to catch up without deadline shift
}

export interface ConsequenceProjection {
  goalId: number;
  goalName: string;
  originalDeadline: string;
  projectedDeadline?: string;
  originalRequiredMonthly: number;
  newRequiredMonthly: number;
  deadlineShiftMonths?: number;
  impact: DeviationImpact;
  affectedGoals: Array<{
    goalId: number;
    goalName: string;
    impact: 'delayed' | 'paused' | 'reduced';
  }>;
}

// V2: Flex Events
export interface RebalancingPlan {
  pausedGoals: number[];
  adjustedAllocations: Array<{ goalId: number; newAmount: number }>;
  resumeDate?: string;
}

export interface FlexEvent {
  id?: number;
  date: string;
  reason: string;
  amount: number;
  affectedGoals: number[]; // Goals paused/adjusted
  rebalancingPlan: RebalancingPlan;
  acknowledged: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// V2: Plan Health Metrics
export interface PlanHealth {
  allocationEfficiency: number; // 0-100%
  fragilityScore: number; // 0-100 (higher = more fragile)
  slackMonths: number; // Buffer before any deadline
  deviationCount: number; // Deviations in last 3 months
  onTrackGoals: number; // Goals meeting targets
  behindGoals: number; // Goals behind schedule
  healthStatus: 'healthy' | 'warning' | 'critical';
}

