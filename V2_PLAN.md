# V2 Implementation Plan - Discipline & Adaptation Layer

## Overview

V2 goal: **Handle real life without breaking the plan**

Core question: *"What happens to my future if I break the plan today?"*

---

## Implementation Order (Recommended)

### Phase 1: Foundation & Emergency Fund Logic
**Priority: HIGH** - Needed for everything else

1. **Mark Emergency Funds Explicitly**
   - Add `isEmergencyFund: boolean` flag to Goal model
   - Update allocation engine to use flag instead of string matching
   - Emergency fund logic: First priority until filled, auto-pause lower goals
   - UI indicator for emergency funds

**Impact**: Makes emergency fund handling robust and explicit

---

### Phase 2: Deviation Tracking
**Priority: HIGH** - Core V2 functionality

2. **Enhanced Transaction System**
   - Track actual contributions vs planned (monthly)
   - Track income deviations (actual vs expected)
   - Track overspending from freeSpend
   - Add deviation types: `missed_contribution`, `under_contribution`, `overspend`, `income_drop`

3. **Deviation Detection Engine**
   - Compare actual vs planned monthly
   - Detect missed contributions (planned amount not met)
   - Detect income shortfalls
   - Force acknowledgment (no silent drift)

**Impact**: System now knows when plan is broken

---

### Phase 3: Consequence Projection
**Priority: HIGH** - Answers the core V2 question

4. **Calculate Impact of Deviations**
   - New required monthly amount (to catch up)
   - Deadline shift calculation (if allowed)
   - Which goals are affected (priority cascade)
   - Cumulative impact tracking

5. **UI for Consequences**
   - Show projection after deviation
   - Visualize deadline shifts
   - Highlight affected goals
   - Force user to acknowledge before continuing

**Impact**: Users see future pain, not just current state

---

### Phase 4: Flex Events
**Priority: MEDIUM** - Handles exceptions

6. **Flex Event System**
   - One-time exceptions (medical, festivals, emergencies)
   - Explicit rebalancing workflow
   - Trade-off confirmation UI
   - Record flex events with reason/impact

7. **Rebalancing Logic**
   - Pause lower priority goals
   - Adjust allocations temporarily
   - Restore plan after flex event

**Impact**: Life happens, plan adapts without breaking

---

### Phase 5: Plan Health Metrics
**Priority: LOW** - Observability layer

8. **Health Metrics Calculation**
   - Allocation efficiency (% of income allocated to goals)
   - Plan fragility score (how close to breaking)
   - Slack months remaining (buffer before deadline)
   - Deviation frequency tracking

9. **Health Dashboard**
   - Visual health indicators
   - Trend graphs
   - Warning system

**Impact**: Proactive plan management

---

## Data Model Changes Needed

### Goal Model
```typescript
interface Goal {
  // ... existing fields
  isEmergencyFund?: boolean;  // NEW: Explicit emergency fund flag
  paused?: boolean;            // NEW: For flex events
  pausedUntil?: string;        // NEW: Resume date after flex
}
```

### Transaction Model
```typescript
interface Transaction {
  // ... existing fields
  deviationType?: 'missed_contribution' | 'under_contribution' | 'overspend' | 'income_drop' | 'flex_event';
  plannedAmount?: number;      // NEW: What was planned
  actualAmount?: number;       // NEW: What actually happened
  acknowledged?: boolean;      // NEW: User acknowledged deviation
}
```

### New Models

```typescript
interface Deviation {
  id: number;
  goalId?: number;
  type: 'missed_contribution' | 'under_contribution' | 'overspend' | 'income_drop';
  date: string;
  plannedAmount: number;
  actualAmount: number;
  impact: DeviationImpact;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

interface DeviationImpact {
  newRequiredMonthly: number;
  deadlineShift?: number;  // months
  affectedGoals: number[]; // goal IDs
  totalShortfall: number;
}

interface FlexEvent {
  id: number;
  date: string;
  reason: string;
  amount: number;
  affectedGoals: number[];  // Goals paused/adjusted
  rebalancingPlan: RebalancingPlan;
  acknowledged: boolean;
}

interface RebalancingPlan {
  pausedGoals: number[];
  adjustedAllocations: { goalId: number; newAmount: number }[];
  resumeDate?: string;
}

interface PlanHealth {
  allocationEfficiency: number;  // 0-100%
  fragilityScore: number;        // 0-100 (higher = more fragile)
  slackMonths: number;           // Buffer before any deadline
  deviationCount: number;        // Deviations in last 3 months
  onTrackGoals: number;          // Goals meeting targets
  behindGoals: number;           // Goals behind schedule
}
```

---

## Implementation Strategy

### Start Small, Iterate
1. Begin with Phase 1 (Emergency Fund) - quick win, foundational
2. Build Phase 2 (Deviation Tracking) - core functionality
3. Add Phase 3 (Consequences) - answers the key question
4. Phase 4 & 5 can come later or in parallel

### Testing Strategy
- Test deviation detection with sample scenarios
- Verify consequence calculations match expected math
- Ensure flex events don't break plan permanently

### UI Considerations
- Keep V1 clean and simple
- Add V2 features as new sections/tabs
- Use clear visual indicators for deviations
- Force acknowledgment for critical deviations

---

## Questions to Resolve

1. **Emergency Fund Identification**: Use explicit flag or keep auto-detection as fallback?
   - **Recommendation**: Explicit flag, with migration for existing goals

2. **Deviation Acknowledgment**: Block UI until acknowledged or just warn?
   - **Recommendation**: Warning for minor, blocking modal for major deviations

3. **Flex Events**: Allow user-defined or predefined types only?
   - **Recommendation**: User-defined with suggested categories

4. **Deadline Shifts**: Auto-adjust or require confirmation?
   - **Recommendation**: Require explicit confirmation, show impact first

---

## Next Steps

1. Review this plan
2. Decide on starting point (recommend Phase 1)
3. Begin implementation with emergency fund logic
4. Build deviation tracking incrementally

