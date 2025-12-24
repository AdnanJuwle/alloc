import React, { useState, useEffect } from 'react';
import { GoalBuckets } from './components/GoalBuckets';
import { IncomeSimulator } from './components/IncomeSimulator';
import { AutoSplit } from './components/AutoSplit';
import { Dashboard } from './components/Dashboard';
import './App.css';

type Tab = 'dashboard' | 'goals' | 'income' | 'auto-split';

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
        </nav>
      </header>
      <main className="app-main">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'goals' && <GoalBuckets />}
        {activeTab === 'income' && <IncomeSimulator />}
        {activeTab === 'auto-split' && <AutoSplit />}
      </main>
    </div>
  );
}

export default App;

