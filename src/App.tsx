import { useState } from 'react';
import { GoalBuckets } from './components/GoalBuckets';
import { IncomeSimulator } from './components/IncomeSimulator';
import { AutoSplit } from './components/AutoSplit';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { Deviations } from './components/Deviations';
import { BudgetsAndRules } from './components/BudgetsAndRules';
import { FlexEvents } from './components/FlexEvents';
import { PlanHealth } from './components/PlanHealth';
import './App.css';

type Tab = 'dashboard' | 'goals' | 'income' | 'auto-split' | 'transactions' | 'deviations' | 'budgets-rules' | 'flex-events' | 'plan-health';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Expense Tracker</h1>
          <p className="subtitle">Goal-first financial planning</p>
        </div>
        <nav className="nav-tabs">
          <button
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={activeTab === 'goals' ? 'active' : ''}
            onClick={() => setActiveTab('goals')}
          >
            Goal Buckets
          </button>
          <button
            className={activeTab === 'income' ? 'active' : ''}
            onClick={() => setActiveTab('income')}
          >
            Income Scenarios
          </button>
          <button
            className={activeTab === 'auto-split' ? 'active' : ''}
            onClick={() => setActiveTab('auto-split')}
          >
            Auto-Split
          </button>
          <button
            className={activeTab === 'transactions' ? 'active' : ''}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button
            className={activeTab === 'deviations' ? 'active' : ''}
            onClick={() => setActiveTab('deviations')}
          >
            Deviations
          </button>
          <button
            className={activeTab === 'budgets-rules' ? 'active' : ''}
            onClick={() => setActiveTab('budgets-rules')}
          >
            Budgets & Rules
          </button>
          <button
            className={activeTab === 'flex-events' ? 'active' : ''}
            onClick={() => setActiveTab('flex-events')}
          >
            Flex Events
          </button>
          <button
            className={activeTab === 'plan-health' ? 'active' : ''}
            onClick={() => setActiveTab('plan-health')}
          >
            Plan Health
          </button>
        </nav>
      </header>
      <main className="app-main">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'goals' && <GoalBuckets />}
        {activeTab === 'income' && <IncomeSimulator />}
        {activeTab === 'auto-split' && <AutoSplit />}
        {activeTab === 'transactions' && <Transactions />}
        {activeTab === 'deviations' && <Deviations />}
        {activeTab === 'budgets-rules' && <BudgetsAndRules />}
        {activeTab === 'flex-events' && <FlexEvents />}
        {activeTab === 'plan-health' && <PlanHealth />}
      </main>
    </div>
  );
}

export default App;

