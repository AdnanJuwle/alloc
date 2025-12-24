import { useState } from 'react';
import { GoalBuckets } from './components/GoalBuckets';
import { IncomeSimulator } from './components/IncomeSimulator';
import { AutoSplit } from './components/AutoSplit';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import './App.css';

import { Deviations } from './components/Deviations';

type Tab = 'dashboard' | 'goals' | 'income' | 'auto-split' | 'transactions' | 'deviations';

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
        </nav>
      </header>
      <main className="app-main">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'goals' && <GoalBuckets />}
        {activeTab === 'income' && <IncomeSimulator />}
        {activeTab === 'auto-split' && <AutoSplit />}
        {activeTab === 'transactions' && <Transactions />}
        {activeTab === 'deviations' && <Deviations />}
      </main>
    </div>
  );
}

export default App;

